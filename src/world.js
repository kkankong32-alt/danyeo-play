// Spatial gameplay outside the preserved 1993 courtyard. Coordinates are foot anchors.
import {pickFace} from '../zone/facing.js?v=16';
import {makeGait,gaitWalk,gaitRelease,strideOf} from '../zone/gait.js?v=16';
export const SCENE_SCALE={home:1.7,alley:1.575};
export const H={ej:154,yd:153,mom:225,dad:240,gd:220};
export const POINTS={box:[420,850],mom:[810,600],dad:[1290,630],shelf:[1700,740],stool:[240,720],middle:[1040,760],album:[490,850],door:[1210,545],rough:[420,680],smooth:[1210,720],repair:[420,780],edge:[1290,770],center:[1210,830],photo:[1130,690]};
export const rects={home:[[100,370,540,470],[610,290,1305,495],[145,600,575,800],[1530,600,1895,800],[25,740,180,830]],alley:[[100,0,1815,505]]};
export function free(scene,x,y){return x>70&&x<1850&&y>510&&y<1000&&!rects[scene].some(r=>x+12>r[0]&&x-12<r[2]&&y>r[1]&&y-8<r[3]);}
export function actor(id,x,y,meta,face='down'){return{id,x,y,face,dist:0,moving:false,gait:makeGait(meta.gait),path:null};}
export function move(a,dx,dy,dt,scene,speed=155,others=[]){const n=Math.hypot(dx,dy);if(!n)return 0;dx/=n;dy/=n;const ox=a.x,oy=a.y,ds=speed*dt;const clear=(x,y)=>free(scene,x,y)&&!others.some(b=>b.id!==a.id&&Math.hypot((x-b.x)/90,(y-b.y)/55)<Math.min(1,Math.hypot((a.x-b.x)/90,(a.y-b.y)/55)));if(clear(a.x+dx*ds,a.y))a.x+=dx*ds;if(clear(a.x,a.y+dy*ds))a.y+=dy*ds;const d=Math.hypot(a.x-ox,a.y-oy);if(d>.01)a.face=pickFace(a.face,a.x-ox,a.y-oy,dx,dy);a.dist+=d;return d;}
export function walk(a,input,dt,scene,meta,others=[]){let {dx,dy}=input;let arriving=false;
 if(dx||dy)a.path=null;
 else if(a.path?.length){const p=a.path[0],d=Math.hypot(p[0]-a.x,p[1]-a.y);if(d<5){a.path.shift();arriving=!a.path.length;}else{dx=(p[0]-a.x)/d;dy=(p[1]-a.y)/d;}}
 const stride=strideOf(meta,H[a.id]*SCENE_SCALE[scene]);
 if(dx||dy){const d=move(a,dx,dy,dt,scene,155,others);gaitWalk(a.gait,d,155*dt,stride);a.moving=d>.01;if(d<.01&&a.path?.length&&others.length){a.blocked=(a.blocked||0)+dt;if(a.blocked>.3){a.path=route(scene,a,a.path[a.path.length-1],others);a.blocked=0;}}else a.blocked=0;}
 else if(arriving){a.gait.mode='settle';a.gait.settle=0;a.moving=false;}
 else {const vec={left:[-1,0],right:[1,0],up:[0,-1],down:[0,1]}[a.face];a.moving=gaitRelease(a.gait,dt,stride,155*dt,d=>move(a,...vec,dt,scene,d/dt,others))>.01;}
}
// A* over a foot-sized navigation grid. Clicking furniture never walks through it.
export function route(scene,a,target,others=[]){
 // A stationary NPC can finish an action overlapping the player. Leave that
 // footprint before A*: otherwise all four start-grid neighbours are blocked.
 const overlap=others.find(b=>b.id!==a.id&&Math.hypot((a.x-b.x)/100,(a.y-b.y)/65)<1);
 if(overlap){let dx=a.x-overlap.x,dy=a.y-overlap.y;if(Math.hypot(dx,dy)<.01){dx=100;dy=65;}const n=Math.hypot(dx/100,dy/65);
  const escape=[overlap.x+dx/n*1.3,overlap.y+dy/n*1.3];
  if(free(scene,...escape))return [escape,...(route(scene,{...a,x:escape[0],y:escape[1]},target,others)||[])];
 }
 const available=(x,y)=>free(scene,x,y)&&!others.some(b=>b.id!==a.id&&Math.hypot((x-b.x)/100,(y-b.y)/65)<1);const k=25, key=(x,y)=>x+','+y;const start=[Math.round(a.x/k),Math.round(a.y/k)];
 let end=null,bd=Infinity;for(let y=21;y<40;y++)for(let x=3;x<74;x++){if(!available(x*k,y*k))continue;const d=Math.hypot(x*k-target[0],y*k-target[1]);if(d<bd){bd=d;end=[x,y];}}
 if(!end)return null;const open=[start],prev=new Map(),cost=new Map([[key(...start),0]]);let last=null;
 while(open.length){open.sort((a,b)=>(cost.get(key(...a))+Math.hypot(a[0]-end[0],a[1]-end[1]))-(cost.get(key(...b))+Math.hypot(b[0]-end[0],b[1]-end[1])));const p=open.shift(),pk=key(...p);if(p[0]===end[0]&&p[1]===end[1]){last=p;break;}
 for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){const n=[p[0]+dx,p[1]+dy],nk=key(...n);if(!available(n[0]*k,n[1]*k))continue;const c=cost.get(pk)+1;if(c<(cost.get(nk)??Infinity)){cost.set(nk,c);prev.set(nk,p);open.push(n);}}}
 if(!last)return null;const path=[];while(key(...last)!==key(...start)){path.unshift(last.map(v=>v*k));last=prev.get(key(...last));}
 const line=(p,q)=>{const n=Math.ceil(Math.hypot(q[0]-p[0],q[1]-p[1])/6);for(let i=1;i<=n;i++)if(!available(p[0]+(q[0]-p[0])*i/n,p[1]+(q[1]-p[1])*i/n))return false;return true;};
 const smooth=[];let anchor=[a.x,a.y],i=0;while(i<path.length){let j=i;while(j+1<path.length&&line(anchor,path[j+1]))j++;smooth.push(path[j]);anchor=path[j];i=j+1;}return smooth;
}
