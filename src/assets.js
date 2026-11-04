export const POLISH='assets/runtime/polish/';
export const PROD='assets/runtime/production/';
let packed={},progress=()=>{},done=0,total=0;
const imageCache=new Map(),jsonCache=new Map(),queue=[];let running=0;
const canonical=src=>new URL(src,'https://game.invalid/').pathname.slice(1);
function pump(){while(running<6&&queue.length){running++;const job=queue.shift();job().finally(()=>{running--;pump();});}}
export const image=src=>{const key=canonical(src);if(imageCache.has(key))return imageCache.get(key);const item=packed[key];
 const promise=new Promise((resolve,reject)=>{queue.push(()=>new Promise(finish=>{const im=new Image();im.decoding='async';
 im.onload=()=>{im.packOffset=item?.offset||[0,0];done++;progress(done,total);resolve(im);finish();};
 im.onerror=()=>{reject(Error('이미지를 읽지 못했습니다: '+src));finish();};im.src=item?.url||src;}));pump();});
 imageCache.set(key,promise);return promise;};
export const json=src=>{if(!jsonCache.has(src))jsonCache.set(src,(async()=>{const r=await fetch(src);if(!r.ok)throw Error(src);return r.json();})());return jsonCache.get(src);};
export async function loadAssets({raw=false,onProgress=()=>{}}={}){
 progress=onProgress;
 if(!raw){const manifest=await json('assets/family_v17/manifest.json');packed=manifest.images;total=Object.keys(packed).length;
 // Start independent requests together; cap concurrent image decodes to avoid memory spikes.
 for(const path of manifest.json)json(path).catch(()=>{});
 for(const path of Object.keys(packed))image(path).catch(()=>{});
 }
 const A={walk:{},walkImg:{},poses:{},layerImages:{},extra:{}};
 const dir=POLISH+'preview/assets/sheets/';const idx={walk:{ej:'ej_A_walk_9x4_v05_game.json'},poses:{}};
 for(const [id,f] of Object.entries(idx.walk)){const m=await json(dir+(id==='ej'?'ej_A_walk_9x4_v05_game.json':f));A.walk[id]=m;A.walkImg[id]=await image(dir+m.image);}
 for(const [k,f] of Object.entries(idx.poses)) A.poses[k]=await image(dir+f);
 for(const id of ['ym','fr','ss']){const d=(id==='ss'?POLISH:PROD)+'characters/'+id+'/';A.walk[id]=await json(d+id+'_walk_v01.json');A.walkImg[id]=await image(d+A.walk[id].image);}
 for(const [key,path] of Object.entries({ym_count:'ym/ym_count_v01.png',ym_guard:'ym/ym_guard_left_v01.png',ym_guard_right:'ym/ym_guard_right_v01.png',fr_hide:'fr/fr_hide_left_v01.png',fr_hide_right:'fr/fr_hide_right_v01.png',fr_caught:'fr/fr_caught_left_v01.png',fr_caught_right:'fr/fr_caught_right_v01.png'})) A.poses[key]=await image(PROD+'characters/'+path);
 for(const d of ['left','right'])A.poses[d==='left'?'ss_point_left':'ss_point']=await image(POLISH+'characters/ss/ss_point_'+d+'_v01.png');
 A.frRun=await image(PROD+'characters/fr/fr_run_v01.png');A.shoes=await Promise.all(['left','right'].map(d=>image(PROD+'characters/fr/shoe_clue_'+d+'_v01.png')));
 A.scene=await json(POLISH+'config/layers_v02.json');
 for(const l of [{id:'base',path:A.scene.base},...A.scene.layers]){if(['L3_flowers_v01','L5_front_v01','stair_A_return_v01','stair_B_return_v01'].includes(l.id))continue;A.layerImages[l.id]=await image(POLISH+l.path);}
 const env=await json('assets/revision_v02/environment.json');Object.assign(A.scene.layers.find(l=>l.id==='L3_flowers_v01'),env.flowers);A.layerImages.L3_flowers_v01=await image('assets/revision_v02/flowers.png');A.layerImages.L5_front_v01=await image('assets/revision_v02/front_gate.png');
 for(const id of ['yd','mom']){A.walk[id]=await json('assets/'+id+'.json');A.walkImg[id]=await image('assets/'+A.walk[id].image);}
 A.walk.dad=await json('assets/revision_v02/dad.json');A.walkImg.dad=await image('assets/revision_v02/dad.png');
 A.poses.gd_seated=await image('assets/gd_stand.png');
 A.extra.ejPhoto=await image('assets/runtime/ej_stand.png');
 A.walk.gd=await json('assets/sprites_v14/gd_walk.json');A.walkImg.gd=await image('assets/sprites_v14/'+A.walk.gd.image);
 A.extra.photographerViews=normalize(await image('assets/spatial_v09/photographers.png'),4,2);const rear=document.createElement('canvas');rear.width=360;rear.height=480;rear.getContext('2d').drawImage(A.extra.photographerViews,1080,0,360,480,0,0,360,480);A.poses.gd_camera=rear;
 A.extra.grandfather=normalize(await image('assets/actions_v11/grandfather.png'),3,3);
 A.extra.dadCarry=normalize(await image('assets/actions_v11/dad_camera.png'),8,2);
 A.extra.pickup=normalizeAction(await image('assets/actions_v11/pickup.png'),3,2);
 A.extra.tripod=normalize(await image('assets/cinema_v08/tripod.png'),1,1);
 A.extra.photographer=normalize(await image('assets/cinema_v08/photographer.png'),4,1);
 A.extra.ydActions=await image('assets/yd_actions.png');
 A.extra.momBag=await image('assets/journey_v03/mom_bag_clean.png');A.extra.dadBag=await image('assets/journey_v03/dad_bag_clean.png');
 A.extra.charm=await image('assets/journey_v03/charm.png');
 A.extra.photoMom=await image('assets/revision_v02/photo_1993.png');
 for(const id of ['home','alley','props'])A.extra[id]=await image('assets/'+id+'_v01.png');
 A.extra.bagDetail=await image('assets/complete_v04/bag_detail.png');A.extra.albumRepair=await image('assets/refinements_v12/album_repair_v04.png');A.extra.ddakjiRepair=await image('assets/refinements_v12/ddakji_press_v04.png');return A;
}

// Generated cutouts retain their original PNG. Normalize frame bounds only at load time.
function normalize(im,cols,rows){const out=document.createElement('canvas');out.width=cols*360;out.height=rows*480;const c=out.getContext('2d'),tmp=document.createElement('canvas');tmp.width=im.width;tmp.height=im.height;const q=tmp.getContext('2d');q.drawImage(im,0,0);const pix=q.getImageData(0,0,im.width,im.height).data;
 for(let r=0;r<rows;r++)for(let k=0;k<cols;k++){const x0=Math.floor(k*im.width/cols),x1=Math.floor((k+1)*im.width/cols),y0=Math.floor(r*im.height/rows),y1=Math.floor((r+1)*im.height/rows);let l=x1,t=y1,b=y0,rr=x0;for(let y=y0;y<y1;y++)for(let x=x0;x<x1;x++)if(pix[(y*im.width+x)*4+3]>180){l=Math.min(l,x);rr=Math.max(rr,x);t=Math.min(t,y);b=Math.max(b,y);}const h=b-t+1,w=rr-l+1,sc=420/h;c.drawImage(im,l,t,w,h,k*360+180-w*sc/2,r*480+30,w*sc,420);}return out;}

function heldAtlas(im,old){const out=document.createElement('canvas');out.width=3240;out.height=1920;const c=out.getContext('2d');for(let r=0;r<4;r++)for(let k=0;k<9;k++){const f=k?k-1:0;c.save();if(r===2){c.translate((k+1)*360,r*480);c.scale(-1,1);}else c.translate(k*360,r*480);if(r===3)c.drawImage(old,(k?1+Math.floor(f/2):0)*360,1440,360,480,0,0,360,480);else c.drawImage(im,f*360,(r?1:0)*480,360,480,0,0,360,480);c.restore();}return out;}
// One scale for every action cell. Crouching never becomes a taller/bigger child.
function normalizeAction(im,cols,rows){const out=document.createElement('canvas');out.width=cols*360;out.height=rows*480;const c=out.getContext('2d'),q=document.createElement('canvas');q.width=im.width;q.height=im.height;const ctx=q.getContext('2d');ctx.drawImage(im,0,0);const p=ctx.getImageData(0,0,im.width,im.height).data,cw=im.width/cols,ch=im.height/rows;let top=ch,base=0;for(let y=0;y<ch;y++)for(let x=0;x<cw;x++)if(p[(y*im.width+x)*4+3]>180){top=Math.min(top,y);base=Math.max(base,y);}const sc=420/(base-top+1);for(let r=0;r<rows;r++)for(let k=0;k<cols;k++){c.save();c.beginPath();c.rect(k*360,r*480,360,480);c.clip();c.drawImage(im,k*cw,r*ch,cw,ch,k*360+180-cw*sc/2,r*480+450-base*sc,cw*sc,ch*sc);c.restore();}return out;}

// One body scale for the entire cycle; legs cannot change head size or torso centre.
function normalizeGait(im,cols,rows){
 const tmp=document.createElement('canvas');tmp.width=im.width;tmp.height=im.height;const q=tmp.getContext('2d');q.drawImage(im,0,0);const p=q.getImageData(0,0,im.width,im.height).data,frames=[];
 for(let r=0;r<rows;r++)for(let k=0;k<cols;k++){const x0=Math.floor(k*im.width/cols),x1=Math.floor((k+1)*im.width/cols),y0=Math.floor(r*im.height/rows),y1=Math.floor((r+1)*im.height/rows);let t=y1,b=y0;for(let y=y0;y<y1;y++)for(let x=x0;x<x1;x++)if(p[(y*im.width+x)*4+3]>180){t=Math.min(t,y);b=Math.max(b,y);}let sum=0,n=0;for(let y=Math.round(t+(b-t)*.40);y<=t+(b-t)*.57;y++)for(let x=x0;x<x1;x++)if(p[(y*im.width+x)*4+3]>180){sum+=x;n++;}frames.push({r,k,x0,x1,y0,y1,t,b,cx:sum/n});}
 const sc=420/Math.max(...frames.map(f=>f.b-f.t+1)),out=document.createElement('canvas');out.width=cols*360;out.height=rows*480;const c=out.getContext('2d');for(const f of frames){c.save();c.beginPath();c.rect(f.k*360,f.r*480,360,480);c.clip();c.drawImage(im,f.x0,f.y0,f.x1-f.x0,f.y1-f.y0,f.k*360+180+(f.x0-f.cx)*sc,f.r*480+450+(f.y0-f.b)*sc,(f.x1-f.x0)*sc,(f.y1-f.y0)*sc);c.restore();}return out;
}

function trim(im){const c=document.createElement("canvas");c.width=im.width;c.height=im.height;const q=c.getContext("2d");q.drawImage(im,0,0);const p=q.getImageData(0,0,c.width,c.height).data;let l=c.width,t=c.height,r=0,b=0;for(let y=0;y<c.height;y++)for(let x=0;x<c.width;x++)if(p[(y*c.width+x)*4+3]>30){l=Math.min(l,x);r=Math.max(r,x);t=Math.min(t,y);b=Math.max(b,y);}const out=document.createElement("canvas");out.width=r-l+1;out.height=b-t+1;out.getContext("2d").drawImage(c,l,t,out.width,out.height,0,0,out.width,out.height);return out;}
