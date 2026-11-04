import {FAMILY,familyPoseMix} from './family.js';
import {handAnchor} from './cinema.js';
import {H,SCENE_SCALE} from './world.js';
import {gaitColumn} from '../zone/gait.js';
import {objects,nearby,objective,NAMES,CHAPTER} from './story.js';
const FONT='"Malgun Gothic",sans-serif';
// Trace actual furniture silhouettes in the 1536x1024 source. Never repaint floor rectangles.
const FURNITURE=[{foot:800,shapes:[[[139,608],[154,587],[154,489],[229,466],[290,486],[298,544],[389,547],[437,583],[453,616],[442,649],[151,688],[139,661]],[[145,658],[168,660],[168,755],[145,755]],[[198,676],[219,675],[219,732],[198,739]],[[407,651],[431,645],[431,713],[409,720]]]},{foot:800,shapes:[[[1227,533],[1505,529],[1520,548],[1518,570],[1512,570],[1512,753],[1494,758],[1494,738],[1251,738],[1251,754],[1231,754],[1231,570],[1227,570]]]}];
function furnitureOcclusion(c,im,a){for(const f of FURNITURE){if(a.y>=f.foot)continue;c.save();c.beginPath();for(const poly of f.shapes){poly.forEach(([x,y],i)=>i?c.lineTo(x*1.25,y*1080/1024):c.moveTo(x*1.25,y*1080/1024));c.closePath();}c.clip();c.drawImage(im,0,0,1920,1080);c.restore();}}
export function sprite(c,A,a,scale=1){const m=A.walk[a.id],im=A.walkImg[a.id],s=H[a.id]*scale/m.charHeight,[w,h]=m.cell,row=m.rows.indexOf(a.face),col=a.gait?gaitColumn(a.gait,m):0;c.save();c.globalAlpha*=.15;c.fillStyle='#594737';c.beginPath();c.ellipse(a.x,a.y,22,6,0,0,Math.PI*2);c.fill();c.restore();c.drawImage(im,col*w,row*h,w,h,a.x-m.originX*s,a.y-m.soleY*s,w*s,h*s);}
export function prop(c,A,id,x,y,w,h){const im=A.extra.props,cw=im.width/4,ch=im.height/2;c.drawImage(im,id%4*cw,Math.floor(id/4)*ch,cw,ch,x-w/2,y-h/2,w,h);}
function carry(c,A,a,id,size){
 const m=A.walk[a.id],col=gaitColumn(a.gait,m),row=m.rows.indexOf(a.face),height=H[a.id]*(a.id==='ej'?SCENE_SCALE.alley:SCENE_SCALE.home),p=handAnchor(a,m,col,height),[cw,ch]=m.cell;
 c.save();if(id===5){c.strokeStyle='#554b3f';c.lineWidth=2;c.beginPath();c.moveTo(p.x-12,p.y+8);c.quadraticCurveTo(p.x-20,p.y+42,p.x+14,p.y+22);c.stroke();}
 if(id===1)prop(c,A,2,p.x+4,p.y+size*.18-4,size*.72,size*.54);prop(c,A,id,p.x,p.y+size*.18,size,size*.74);
 // Redraw only the fingertip pixels over the prop: the item is visibly gripped.
 c.beginPath();c.ellipse(p.x,p.y,5*p.s,7*p.s,0,0,Math.PI*2);c.clip();c.drawImage(A.walkImg[a.id],col*cw,row*ch,cw,ch,a.x-m.originX*p.s,a.y-m.soleY*p.s,cw*p.s,ch*p.s);c.restore();
}
// Same floor-plane quadrilateral as the painted blue front, no X on the back.
export function plainBack(c,x,y,side=58,height=44){
 c.save();c.translate(x-side/2,y-height/2);c.fillStyle='#4388b9';c.strokeStyle='#386e91';c.lineWidth=.7;
 c.beginPath();c.moveTo(side*.043,height*.64);c.lineTo(side*.42,height*.19);c.lineTo(side*.957,height*.372);c.lineTo(side*.664,height*.88);c.closePath();c.fill();c.stroke();c.restore();
}
function photographer(c,A,p){const sc=330*(SCENE_SCALE.alley/1.5)/420,col=p.ready?8:Math.floor(p.dist/210*8)%8;c.drawImage(A.extra.grandfather,col%3*360,Math.floor(col/3)*480,360,480,p.x-180*sc,p.y-450*sc,360*sc,480*sc);}
function dadCamera(c,A,a){if(a.face==='up'){sprite(c,A,a,SCENE_SCALE.home);return;}const sc=H.dad*SCENE_SCALE.home/420,col=a.moving?Math.floor(a.dist/290*8)%8:0,row=a.face==='down'?0:1;c.save();c.translate(a.x,a.y);if(a.face==='right')c.scale(-1,1);c.drawImage(A.extra.dadCarry,col*360,row*480,360,480,-180*sc,-450*sc,360*sc,480*sc);c.restore();}
function pickup(c,A,a,age){const col=age<.25?0:age<.65?1:age<1.1?2:age<1.5?3:age<2?4:5,sc=H.ej*SCENE_SCALE.alley/420;c.drawImage(A.extra.pickup,col%3*360,Math.floor(col/3)*480,360,480,a.x-180*sc,a.y-450*sc,360*sc,480*sc);}

export function scene(c,A,G){c.setTransform(1,0,0,1,0,0);const im=A.extra[G.scene];if(G.scene==='alley')c.drawImage(im,0,-80,1920,1280);else c.drawImage(im,0,0,1920,1080);
 const actors=Object.values(G.actors).sort((a,b)=>a.y-b.y),embrace=G.scene==='home'?familyPoseMix(G):0;
 if(G.scene==='alley'){
  const smooth=G.flags.surface==='smooth'||['aim','cleanup','photo','posing','shutterWait'].includes(G.phase),x=smooth?1210:420,y=smooth?720:680;
  if(!G.carry){const t=G.t-(G.flags.flipAt??-100),flip=t>=0&&G.flags.flipAt!=null;const hit=G.t-(G.flags.hitAt??-100);
   c.save();c.translate(x,y);if(hit>=0&&hit<1)c.translate(Math.sin(hit*Math.PI/2)*34,0);
   if(flip&&t<.85){c.translate(0,-Math.sin(t/.85*Math.PI)*105);c.rotate(Math.sin(t/.85*Math.PI)*.25);c.scale(1,Math.cos(t/.85*Math.PI));}
   if(flip&&t>.425)plainBack(c,0,0);else prop(c,A,2,0,0,58,44);c.restore();
   if(!G.beat)prop(c,A,G.flags.fold==='locked'?1:0,x-65,y+20,58,44);
   if(G.beat?.at!=null){const age=G.t-G.beat.at;if(age>=.7&&age<1){const p=(age-.7)/.3;c.save();c.translate(x-25,y-160*(1-p));c.rotate(p*1.7);prop(c,A,1,0,0,58,44);c.restore();}if(age>=1){prop(c,A,1,x-26,y+10,58,44);if(age<1.25){c.save();c.strokeStyle='#d7c6a899';c.lineWidth=4;c.beginPath();c.ellipse(x,y,30+(age-1)*130,10+(age-1)*30,0,0,Math.PI*2);c.stroke();c.restore();}}}
  }
  if(G.phase==='cleanup'&&!G.flags.laneClear&&!(G.action?.kind==='pickup'&&G.action.at!==null&&G.t-G.action.at>=.65))prop(c,A,0,420,680,38,38);
 }
 let drawnPhotographer=false;
 for(const a of actors){
  c.save();if(embrace)c.globalAlpha=1-embrace;
  if(G.photographer&&!drawnPhotographer&&G.photographer.y<a.y){photographer(c,A,G.photographer);drawnPhotographer=true;}
  const active=a.id==='yd'&&(G.holding||G.beat?.at!=null);
  const held=a.id==='ej'&&G.scene==='alley'&&!G.action&&(G.carry||G.flags.spareTile);
  if(held&&a.face==='up')carry(c,A,a,G.carry?1:0,G.carry?39:30);

  if(a.id==='ej'&&G.action?.kind==='pickup'&&G.action.at!==null){pickup(c,A,a,G.t-G.action.at);}
  else if(a.id==='dad'&&['camera','shelf'].includes(G.phase)&&!G.flags.cameraPlaced){dadCamera(c,A,a);}
  else if(active){const age=G.beat?G.t-G.beat.at:0,col=G.holding?(G.hold>=1.2?1:0):(age<.7?2:age<1.35?3:1),sc=H.yd*SCENE_SCALE.alley/420;
   const smooth=G.flags.surface==='smooth',tx=smooth?1210:420,ty=smooth?720:680;const ax=a.x,ay=a.y;c.drawImage(A.extra.ydActions,col*360,0,360,480,ax-180*sc,ay-450*sc,360*sc,480*sc);
  }else if(G.flags.family&&['mom','dad'].includes(a.id)){c.save();c.translate(a.x,a.y);c.rotate(a.id==='mom'?.035:-.035);c.translate(-a.x,-a.y);sprite(c,A,a,SCENE_SCALE[G.scene]);c.restore();}else sprite(c,A,a,SCENE_SCALE[G.scene]);
  if(held&&a.face!=='up')carry(c,A,a,G.carry?1:0,G.carry?39:30);

  if(G.scene==='home')furnitureOcclusion(c,im,a);
  c.restore();
 }
 if(embrace){const im=A.extra.familyPose,sc=H.dad*SCENE_SCALE.home*.96/im.height,w=im.width*sc;c.save();c.globalAlpha=embrace;for(const p of Object.values(FAMILY)){c.fillStyle='#59473730';c.beginPath();c.ellipse(p[0],p[1],26,6,0,0,Math.PI*2);c.fill();}c.drawImage(im,1040-w/2,760-im.height*sc,w,im.height*sc);c.restore();}
 if(G.photographer&&!drawnPhotographer)photographer(c,A,G.photographer);
 if(G.scene==='home'&&G.action?.kind==='mount')c.drawImage(A.extra.tripod,0,130,360,350,1040-90,960-160,180,175);
 if(G.scene==='home'&&G.flags.cameraPlaced)c.drawImage(A.extra.tripod,0,0,360,480,1040-90,960-225,180,240);
}
export function panel(c,x,y,w,h){c.fillStyle='#fbf3e5f5';c.strokeStyle='#c5b08a';c.lineWidth=2;c.beginPath();c.roundRect(x,y,w,h,15);c.fill();c.stroke();}
export function drawPhoto(c,im,x,y,w,h){const k=Math.min(w/im.width,h/im.height);c.fillStyle='#ece0c9';c.fillRect(x,y,w,h);c.drawImage(im,x+(w-im.width*k)/2,y+(h-im.height*k)/2,im.width*k,im.height*k);}
export function text(c,t,x,y,size=28,color='#352d24'){c.font=`500 ${size}px ${FONT}`;c.fillStyle=color;c.fillText(t,x,y);}
export function wrap(c,t,max){let rows=[],line='';for(const ch of t){if(c.measureText(line+ch).width>max){rows.push(line);line=ch;}else line+=ch;}if(line)rows.push(line);return rows;}
export function ui(c,A,G,photos){
 if(G.ended)endingAlbum(c,G,photos);
 if(!G.ended&&G.flags.photoView&&photos[G.flags.photoView]){c.fillStyle='#29261fb8';c.fillRect(0,0,1920,1080);panel(c,405,120,1110,690);drawPhoto(c,photos[G.flags.photoView],430,145,1060,596);text(c,G.flags.photoView==='mom'?'1993 · 다대포':G.flags.photoView==='dad'?'1991 · 양산':'2026 · 우리 가족',460,785,25);}
 if(false&&G.queue.length&&!G.beat&&!G.shot){const [who,line]=G.queue[0];c.font=`500 32px ${FONT}`;const rows=wrap(c,line,1370),h=77+rows.length*44,y=1055-h;panel(c,190,y,1540,h);text(c,NAMES[who]||who,224,y+34,23,'#78603d');rows.forEach((s,i)=>text(c,s,224,y+80+i*44,32));if(!G.watching)text(c,'E · 계속',1590,1030,22,'#7b6a50');}
 else if(!G.ended){const t='';if(t){panel(c,28,24,Math.min(1250,t.length*26+50),72);text(c,t,48,70,27);}const it=nearby(G);if(false&&it&&!G.holding){const y=Math.max(165,it.at[1]-200);c.font=`500 24px ${FONT}`;const w=c.measureText('E · '+it.label).width+36;panel(c,Math.max(15,Math.min(1900-w,it.at[0]-w/2)),y,w,48);text(c,'E · '+it.label,Math.max(33,Math.min(1918-w,it.at[0]-w/2+18)),y+32,24);}}
 if(G.holding){const album=G.flags.holdKind==='album';panel(c,550,125,820,590);drawPhoto(c,album?A.extra.albumRepair:A.extra.ddakjiRepair,570,145,780,490);text(c,G.hold>=1.2?(album?'잘 붙었다. 이제 손을 놓자.':'단단해졌다. 이제 손을 놓자.'):(album?'종이가 움직이지 않게 잡아 주자.':'반대쪽 귀를 조금만 더 잡아 주자.'),590,675,27);c.fillStyle='#668168';c.fillRect(580,692,Math.min(760,G.hold/1.2*760),10);}
 if(G.timer!==null){c.save();c.font='bold 112px Georgia, serif';c.textAlign='center';c.textBaseline='middle';c.fillStyle='#fff8e8';c.shadowColor='#30271fdd';c.shadowBlur=12;c.shadowOffsetY=4;c.fillText(String(Math.max(1,Math.ceil(G.timer))),960,195);c.restore();}

 if(G.flags.shutter!=null&&G.t-G.flags.shutter<.3){c.fillStyle=`rgba(255,250,230,${Math.max(0,1-(G.t-G.flags.shutter)/.3)})`;c.fillRect(0,0,1920,1080);}
}

function endingAlbum(c,G,photos){
 c.save();c.fillStyle='#332b21c9';c.fillRect(0,0,1920,1080);
 c.shadowColor='#0008';c.shadowBlur=28;c.fillStyle='#647359';c.fillRect(240,160,1440,790);c.shadowBlur=0;
 for(const x of [263,963]){c.fillStyle='#f5ebd7';c.fillRect(x,180,694,748);}
 c.fillStyle='#b9aa8c';c.fillRect(954,180,9,748);
 drawPhoto(c,photos.family,300,290,610,458);text(c,'2026 · 우리 셋이 함께',420,800,30,'#6a5941');
 if(!G.queue.length){text(c,'우리의 다음 장',1100,440,46);text(c,'함께 찍을 사진을 위해',1098,513,28);text(c,'한 장을 남겨 두었다.',1098,558,28);text(c,'Esc · 처음 화면으로',1100,847,24,'#76664e');}
 c.restore();
}
