import {FAMILY} from './family.js';
import {photoDissolve,SHOT_SECONDS} from './cinema.js';
import {createDirector} from './director.js';
import {createMusic} from './music.js';
import {openInvestigation} from './investigation.js';
import {createPhotoUI} from './photo-ui.js';
import {loadAssets} from './assets.js';
import * as Story from './story.js';
import * as World from './world.js';
import {scene,ui,text,drawPhoto} from './render.js';
import {createSim,step,act,clickTo,interactable,goTo} from '../zone/sim.js';
import {createRenderer} from '../zone/render.js';
import {BLOCKED,HEIGHT,SPOT,VIEW,STAIRS} from '../zone/zone.js';
import {NAME,objective as zoneObjective} from '../zone/story.js';
const cv=document.querySelector('#view'),c=cv.getContext('2d'),$=s=>document.querySelector(s),dev=new URLSearchParams(location.search).get('dev')==='1';
const KEY='danyeo:full-v005:save-complete4',AUDIT='danyeo:full-v005:audit-complete4';
let watching=false,director=null,autoTarget=null;
const stage=cv.parentElement;const fitCanvas=()=>{const w=Math.max(1,Math.min(stage.clientWidth,stage.clientHeight*16/9));cv.style.width=w+'px';cv.style.height=w*9/16+'px';};new ResizeObserver(fitCanvas).observe(stage);addEventListener('fullscreenchange',fitCanvas);
let photoUI,A,G,Z,ZR,photos={},keys=new Set(),started=false,audit=[],lastSave=0,checkpoint=null,music=null,fxBus=null,lastFxMuted=null,muted=localStorage.getItem('danyeo:muted')==='1',audio=null,lastStep=0,lastBeep=-1,lastChapter="",lastPhotos=0,paused=true,transition=0;
function tone(freq=440,duration=.08,gain=.025){if(muted||!audio)return;const o=audio.createOscillator(),n=audio.createGain();o.type='sine';o.frequency.value=freq;n.gain.setValueAtTime(gain,audio.currentTime);n.gain.exponentialRampToValueAtTime(.0001,audio.currentTime+duration);o.connect(n).connect(fxBus);o.start();o.stop(audio.currentTime+duration);}
function photoSound(kind){
 record('photo-sound',{kind,muted});if(muted||!audio)return;
 // Wind through leaves and nearby play: rustle + alternating hand-claps/foot taps, no fake speech.
 const start=audio.currentTime,rate=audio.sampleRate,b=audio.createBuffer(1,rate*3,rate),out=b.getChannelData(0);let smooth=0;
 for(let i=0;i<out.length;i++){smooth=.97*smooth+.03*(Math.random()*2-1);out[i]=smooth*Math.sin(Math.PI*i/out.length)*.5;}
 const source=audio.createBufferSource(),gain=audio.createGain();source.buffer=b;gain.gain.value=.45;source.connect(gain).connect(fxBus);source.start();
 for(let i=0;i<5;i++){const o=audio.createOscillator(),g=audio.createGain(),t=start+.5+i*.42;o.type='triangle';o.frequency.setValueAtTime(kind==='mom'?330+i%2*80:180,t);o.frequency.exponentialRampToValueAtTime(70,t+.09);g.gain.setValueAtTime(.04,t);g.gain.exponentialRampToValueAtTime(.0001,t+.12);o.connect(g).connect(fxBus);o.start(t);o.stop(t+.13);}
}
document.addEventListener('pointerdown',()=>soundStart(),{once:true});
function soundStart(){if(!audio){audio=new AudioContext();fxBus=audio.createGain();fxBus.gain.value=muted?0:1;fxBus.connect(audio.destination);music=createMusic(audio,(event,data)=>{record(event,data);console.info(event,JSON.stringify(data));});}if(!paused||!started)audio.resume();}
function resetCamera(){ZR.R.camLock=null;ZR.R.zoom=1.1;}
function fresh(){resetCamera();document.body.classList.toggle('watching',watching);autoTarget=null;lastPhotos=0;transition=0;G=Story.initial(A);G.watching=watching;ZR.R.watching=watching;Z=createSim({ejMeta:A.walk.ej,npcMeta:A.walk});Z.a.gd.pose=null;ZR.snapCamera(Z);audit=[];checkpoint=null;lastSave=-10;started=true;paused=false;keys.clear();save(true);}
function restore(){resetCamera();ZR.R.watching=false;document.body.classList.remove('watching');try{const s=JSON.parse(localStorage.getItem(KEY));if(s?.version!==1)return false;G=s.G;Z=s.Z||createSim({ejMeta:A.walk.ej,npcMeta:A.walk});Z.npcMeta=A.walk;Z.gaitMeta=A.walk.ej;checkpoint=s;ZR.snapCamera(Z);audit=JSON.parse(localStorage.getItem(AUDIT)||'{}').inputs||[];started=true;paused=false;keys.clear();audit.push({event:'resume',time:Date.now(),chapter:G.chapter});return true;}catch{return false;}}
function safe(){return G.chapter==='mom'?!Z.talk.length&&!Z.script.length&&!Z.card:!G.queue.length&&!G.holding&&!G.action&&!G.beat&&G.timer===null;}
function save(force=false){if(!started||dev||watching)return;const now=performance.now();if(!force&&now-lastSave<1200)return;lastSave=now;
 try{if(safe()||force&&G.chapter==='prologue'){checkpoint={version:1,saved:new Date().toISOString(),G:structuredClone(G),Z:G.chapter==='mom'?JSON.parse(JSON.stringify(Z)):null};localStorage.setItem(KEY,JSON.stringify(checkpoint));$('#saveNote').textContent='저장됨';}else $('#saveNote').textContent='진행 중';localStorage.setItem(AUDIT,JSON.stringify({mode:dev?'developer':'normal',started:new Date().toISOString(),chapter:G.chapter,phase:G.phase,ended:G.ended,events:G.events,zoneEvents:G.zoneEvents||Z.log,seek:G.zoneSeek||Z.seek,failed:G.failed,photos:G.photos,inputs:audit}));}catch{$('#saveNote').textContent='저장 공간을 확인해 주세요';}}
function menu(){keys.clear();paused=true;if(started)audio?.suspend();$('#watch').textContent=watching&&started&&!G.ended?'감상 이어보기':'이야기 감상하기';$('#restartWatch').hidden=!(watching&&started);record('pause',{phase:G?.phase});$('#continue').disabled=!localStorage.getItem(KEY);$('#closeMenu').hidden=!started;$('#closeMenu').textContent=watching?'감상 계속하기':'게임으로';$('#menu').showModal();}
function close(){if(!started)return;$('#menu').close();paused=false;soundStart();record('unpause',{phase:G.phase});cv.focus();}
function doAct(){soundStart();if(paused||G.shot||G.beat||G.action)return;if(G.inspect){photoUI.next();return;}const q=G.queue.length;
 if(G.chapter==='mom'){
  if(Z.ended){G.zoneEvents=structuredClone(Z.log);G.zoneSeek=structuredClone(Z.seek);Story.enter(G,'bridge',A);G.photos.push('mom');G.flags.photoView=null;G.flags.departurePhoto='mom';G.flags.departureTime=G.t;}
  else act(Z);
 }else {Story.action(G,A);if(q&&!G.queue.length&&G.chapter!=='mom')G.flags.photoView=null;}
 tone(540,.025,.008);save();}
function makePhotos(){
 const PA={...A,walk:{...A.walk,ej:{...A.walk.ej,cell:[360,480],originX:180,soleY:450,charHeight:420}},walkImg:{...A.walkImg,ej:A.extra.ejPhoto}};
 const make=()=>{const v=document.createElement('canvas');v.width=1920;v.height=1080;return v;};
 const m=make(),s=createSim({ejMeta:A.walk.ej,npcMeta:A.walk});s.talk=[];s.card=null;s.seek.stage='photo';s.ended=true;
 for(const [id,p]of Object.entries(SPOT.photo))Object.assign(s.a[id],{x:p[0],y:p[1],face:'down',pose:null,moving:false});Object.assign(s.a.gd,{x:1990,y:1560,pose:null});
 const r=createRenderer(m.getContext('2d'),PA,{zoom:2.5});r.R.camLock=[1570,1380];r.R.hide='gd';r.draw(s,0);photos.mom=m;
 for(const id of ['dad','family']){const v=make(),g=Story.initial(A);g.queue=[];g.flags={};if(id==='dad'){g.scene='alley';g.phase='photo';g.flags={fold:'locked',surface:'smooth',laneClear:true,spareTile:true,flipAt:-10};g.actors={ej:World.actor('ej',1130,690,A.walk.ej),yd:World.actor('yd',1280,690,A.walk.yd)};}else{for(const[id,p]of Object.entries(FAMILY))Object.assign(g.actors[id],{x:p[0],y:p[1]});g.flags.family=true;g.flags.familyPortrait=true;for(const a of Object.values(g.actors))a.face='down';}scene(v.getContext('2d'),PA,g);const cropped=make();const box=id==='dad'?[830,40,1000,750]:[680,290,720,540];cropped.width=1600;cropped.height=1200;cropped.getContext('2d').drawImage(v,...box,0,0,cropped.width,cropped.height);photos[id]=cropped;}
 photos.mom=A.extra.photoMom; // Family keeps the exact actors and room from the shutter scene.
 // One locked image per era: initial inspection, shutter and return share these pixels.
 const details={};for(const kind of ['mom','dad']){const original=photos[kind],v=document.createElement('canvas');v.width=original.width;v.height=original.height;const q=v.getContext('2d');q.drawImage(original,0,0);const r=kind==='mom'?[1036,542,30,48]:[510,850,22,34];const clean=kind==='mom'?A.extra.momBag:A.extra.dadBag,bx=r[0]-5,by=r[1]-3,bw=r[2]+10,bh=r[3]+7; if(kind==='mom')q.drawImage(clean,bx/original.width*clean.width,by/original.height*clean.height,bw/original.width*clean.width,bh/original.height*clean.height,bx,by,bw,bh);else {const patch=document.createElement('canvas');patch.width=48;patch.height=68;const pc=patch.getContext('2d');pc.drawImage(clean,clean.width*.315,clean.height*.568,clean.width*.008,clean.height*.021,0,0,48,68);pc.globalCompositeOperation='destination-in';pc.save();pc.scale(1,68/48);const fade=pc.createRadialGradient(24,24,15,24,24,24);fade.addColorStop(0,'#fff');fade.addColorStop(1,'#ffffff00');pc.fillStyle=fade;pc.fillRect(0,0,48,48);pc.restore();q.drawImage(patch,508,859,24,34);}photos[kind]=v;const z=document.createElement('canvas');z.width=300;z.height=400;const zc=z.getContext('2d');zc.drawImage(A.extra.bagDetail,0,0,300,400);zc.drawImage(A.extra.charm,87,50,126,189);details[kind]=z.toDataURL();q.drawImage(A.extra.charm,...r);}photos.details=details;

}
function record(event,data={}){if(['pause','unpause','shutter','paper-impact'].includes(event))console.info(event,JSON.stringify({t:G?.t,chapter:G?.chapter,...data}));audit.push({time:Date.now(),t:+(G?.t||0).toFixed(3),chapter:G?.chapter,event,...data});}
addEventListener('keydown',e=>{const k=e.key.toLowerCase();if(['arrowup','arrowdown','arrowleft','arrowright',' '].includes(k))e.preventDefault();if(k==='escape'){e.preventDefault();if($('#menu').open)close();else menu();return;}if(paused||watching)return;record('keydown',{key:k,repeat:e.repeat,trusted:e.isTrusted});if(G.inspect){e.preventDefault();soundStart();photoUI.key(k);return;}if(e.repeat)return;if(['arrowup','arrowdown','arrowleft','arrowright','w','a','s','d'].includes(k))autoTarget=null;keys.add(k);soundStart();if(['e',' ','enter'].includes(k))doAct();});
addEventListener('keyup',e=>{const k=e.key.toLowerCase();keys.delete(k);record('keyup',{key:k,trusted:e.isTrusted});if(['e',' ','enter'].includes(k)&&G?.holding)Story.releaseHold(G);});
addEventListener('blur',()=>{keys.clear();if(G?.holding)Story.releaseHold(G);save(true);});
$('#actBtn').addEventListener('pointerdown',e=>{if(watching){menu();return;}e.preventDefault();record('action-pointer',{trusted:e.isTrusted,pointerType:e.pointerType});doAct();});
addEventListener('pointerup',()=>{if(G?.holding)Story.releaseHold(G);});addEventListener('pointercancel',()=>{if(G?.holding)Story.releaseHold(G);});
cv.addEventListener('pointerdown',e=>{if(paused||G.inspect||watching)return;const b=cv.getBoundingClientRect(),x=(e.clientX-b.left)/b.width*1920,y=(e.clientY-b.top)/b.height*1080;record('pointer',{x,y,trusted:e.isTrusted,pointerType:e.pointerType});soundStart();
 if(G.chapter==='mom'){if(Z.talk.length||Z.card||Z.ended)return doAct();const wx=x/ZR.R.zoom+ZR.R.cam.x,wy=y/ZR.R.zoom+ZR.R.cam.y;const it=interactable(Z);if(it?.who){const a=Z.a[it.who];if(Math.abs(wx-a.x)<60&&wy>a.y-a.z-HEIGHT[it.who]&&wy<a.y-a.z+15)return doAct();}clickTo(Z,wx,wy);}
 else{if(G.queue.length)return doAct();const clicked=Story.objects(G).find(o=>Math.hypot(x-o.at[0],y-o.at[1])<100);if(clicked){autoTarget=['repair','album'].includes(clicked.id)?null:clicked.id;G.actors.ej.path=World.route(G.scene,G.actors.ej,clicked.at,Object.values(G.actors));cv.focus();return;}const it=Story.nearby(G);if(it&&Math.hypot(x-it.at[0],y-it.at[1])<55)return doAct();G.actors.ej.path=World.route(G.scene,G.actors.ej,[x,y],Object.values(G.actors));}
 cv.focus();});
$('#fullscreen').onclick=async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await document.documentElement.requestFullscreen();}catch{ $('#actionHint').textContent='브라우저의 F11 키로 전체화면을 켤 수 있어요';}};
function startWatch(){watching=true;director=createDirector();soundStart();fresh();close();}$('#watch').onclick=()=>{if(watching&&started&&!G.ended)close();else startWatch();};$('#restartWatch').onclick=startWatch;
$('#menuBtn').onclick=menu;$('#closeMenu').onclick=close;$('#continue').onclick=()=>{watching=false;soundStart();if(restore())close();};$('#new').onclick=()=>{watching=false;soundStart();fresh();close();};$('#sound').onclick=()=>{soundStart();muted=!muted;localStorage.setItem('danyeo:muted',muted?'1':'0');$('#sound').textContent=muted?'소리 꺼짐':'소리 켜짐';};
$('#menu').addEventListener('cancel',e=>{e.preventDefault();close();});$('#exportLog').onclick=()=>{save(true);$('#audit').value=localStorage.getItem(AUDIT)||'';};
try{
 A=await loadAssets();A.BLOCKED=BLOCKED;ZR=createRenderer(c,A,{zoom:1.1});ZR.R.dev=false;ZR.R.tags=false;ZR.R.domDialogue=true;makePhotos();G=Story.initial(A);photoUI=createPhotoUI({getG:()=>G,photos,charm:A.extra.charm,act:e=>Story.photoAction(G,e,A),record,sound:photoSound});Z=createSim({ejMeta:A.walk.ej,npcMeta:A.walk});Z.a.gd.pose=null;ZR.snapCamera(Z);$('#loading').hidden=true;$('#loading').style.display='none';$('#developer').hidden=!dev;$('#sound').textContent=muted?'소리 꺼짐':'소리 켜짐';if(!dev)menu();
 if(dev){
  const bar=document.createElement('p');$('#developer').prepend(bar);
  const add=(label,fn)=>{const b=document.createElement('button');b.textContent=label;b.onclick=()=>{keys.clear();fn();};bar.append(b);};
  for(const [label,kind,mode]of [['사진 도입 검수','mom','travel'],['귀환 단서 검수','mom','trace'],['두 번째 사진 검수','dad','travel']])add(label,()=>{G=Story.initial(A);G.queue=[];if(mode==='trace')G.chapter='bridge';openInvestigation(G,kind,mode);paused=false;started=true;});
  add('1993 촬영 검수',()=>{G=Story.initial(A);G.chapter='mom';Z=createSim({ejMeta:A.walk.ej,npcMeta:A.walk});Z.talk=[];Z.script=[];Z.card=null;Z.seek.stage='photo';for(const[id,p]of Object.entries(SPOT.photo))Object.assign(Z.a[id],{x:p[0],y:p[1],face:'down',pose:null});Object.assign(Z.a.gd,{x:1570,y:1700,pose:'gd_camera',face:'up'});ZR.R.camLock=[1700,1390];paused=true;});
  add('1991 수선 검수',()=>{G=Story.initial(A);Story.enter(G,'dad',A);G.queue=[];G.after=null;G.phase='repair';G.actors.ej.x=420;G.actors.ej.y=780;paused=false;started=true;});
  add('양산 촬영 흐름 검수',()=>{G=Story.initial(A);Story.enter(G,'dad',A);G.queue=[];G.phase='cleanup';G.flags={fold:'locked',surface:'smooth'};Object.assign(G.actors.ej,{x:1100,y:750});paused=false;started=true;});
  add('줍기 자세 검수',()=>{G=Story.initial(A);Story.enter(G,'dad',A);G.queue=[];G.phase='cleanup';G.flags={fold:'locked',surface:'smooth'};Object.assign(G.actors.ej,{x:470,y:680});G.action={kind:'pickup',at:G.t};paused=true;started=true;});
  add('다음 행동 자세',()=>{if(G.action){G.t+=.4;if(G.action.kind==='pickup')G.flags.laneClear=G.t-G.action.at>=1.1;}});
  add('삼각대 설치 흐름 검수',()=>{G=Story.initial(A);Story.enter(G,'final',A);G.queue=[];G.phase='shelf';Object.assign(G.actors.ej,{x:1040,y:960});paused=false;started=true;});
  add('아빠 카메라 검수',()=>{G=Story.initial(A);Story.enter(G,'final',A);G.queue=[];G.phase='camera';G.actors.dad.path=World.route('home',G.actors.dad,[1040,945]);paused=false;started=true;});
  add('가족사진 검수',()=>{G=Story.initial(A);Story.enter(G,'final',A);G.queue=[];G.phase='timer';G.flags.cameraPlaced=true;Object.assign(G.actors.mom,{x:FAMILY.mom[0],y:FAMILY.mom[1]});Object.assign(G.actors.dad,{x:1570,y:840});Object.assign(G.actors.ej,{x:1450,y:840});paused=false;started=true;});
  add('계단 단서 검수',()=>{G=Story.initial(A);G.chapter='mom';Z=createSim({ejMeta:A.walk.ej,npcMeta:A.walk});Z.talk=[];Z.card=null;Z.seek.stage='seek';Z.seek.friendAt='A';Object.assign(Z.a.fr,{x:STAIRS.A.hide[0],y:STAIRS.A.hide[1],face:STAIRS.A.side>0?'left':'right',pose:'fr_hide'});Object.assign(Z.a.ej,{x:900,y:860});ZR.R.zoom=2;ZR.R.camLock=[1000,650];paused=true;started=true;});
  add('딱지 손과 타격 검수',()=>{G=Story.initial(A);Story.enter(G,'dad',A);G.queue=[];G.phase='surface';G.carry=true;G.flags.fold='locked';G.actors.ej.x=760;G.actors.ej.y=800;G.actors.ej.face='right';paused=false;started=true;});
  add('외할머니 보행 검수',()=>{G=Story.initial(A);G.chapter='mom';Z=createSim({ejMeta:A.walk.ej,npcMeta:A.walk});Z.talk=[];Z.script=[];Z.card=null;Z.a.gd.pose=null;Z.seek.stage='photo';Z.a.gd.arrived=false;Z.a.gd.x=1570;Z.a.gd.y=1400;Z.a.gd.face='right';Z.a.gd.gait.mode='walk';ZR.R.zoom=1.6;ZR.R.camLock=[1570,1400];paused=true;started=true;});
  for(const dir of ['left','right','down','up'])add('외할머니 실제 보행 '+dir,()=>{G=Story.initial(A);G.chapter='mom';Z=createSim({ejMeta:A.walk.ej,npcMeta:A.walk});Z.talk=[];Z.script=[];Z.card=null;Z.seek.stage='seek';const a=Z.a.gd;Object.assign(a,{pose:null,x:dir==='left'?1800:dir==='up'?1450:1100,y:dir==='up'?1550:1300,face:dir});goTo(a,{lvl:'g',x:dir==='left'?1100:dir==='right'?1800:dir==='up'?1450:1100,y:dir==='down'?1600:dir==='up'?1200:1300});ZR.R.zoom=1.5;ZR.R.camLock=[1450,1450];paused=false;started=true;});
  add('계단 B 단서 검수',()=>{G=Story.initial(A);G.chapter='mom';Z=createSim({ejMeta:A.walk.ej,npcMeta:A.walk});Z.talk=[];Z.card=null;Z.seek.stage='seek';Z.seek.friendAt='B';Object.assign(Z.a.fr,{x:STAIRS.B.hide[0],y:STAIRS.B.hide[1],face:'right',pose:'fr_hide'});Object.assign(Z.a.ej,{x:2260,y:860});ZR.R.zoom=2;ZR.R.camLock=[2180,650];paused=true;started=true;});
  add('앨범 수선 검수',()=>{G=Story.initial(A);Story.enter(G,'final',A);G.queue=[];G.phase='album';Object.assign(G.actors.ej,{x:490,y:850});paused=false;started=true;});
  add('다음 보행 프레임',()=>{Z.a.gd.gait.mode='walk';Z.a.gd.gait.phase+=.125;});
  add('사진 원본 보기',()=>{let wrap=document.querySelector('#photoLocks');if(!wrap){wrap=document.createElement('div');wrap.id='photoLocks';$('#developer').append(wrap);}wrap.replaceChildren();for(const[id,photo]of Object.entries(photos).filter(([k])=>k!=='details')){const im=document.createElement('img');im.alt=id+' 고정 사진 원본';im.width=400;im.src=photo.src||photo.toDataURL('image/png');wrap.append(im);}});
 }
 let prev=performance.now();function frame(now){const dt=Math.min(1,(now-prev)/1000);prev=now;const input={dx:+(keys.has('d')||keys.has('arrowright'))- +(keys.has('a')||keys.has('arrowleft')),dy:+(keys.has('s')||keys.has('arrowdown'))- +(keys.has('w')||keys.has('arrowup'))};
  if(!paused){for(let elapsed=0;elapsed<dt;elapsed+=1/60){const simDt=Math.min(1/60,dt-elapsed);if(watching)director(G,Z,A,simDt,doAct);if(autoTarget&&G.chapter!=='mom'&&!G.queue.length&&Story.nearby(G)?.id===autoTarget){autoTarget=null;doAct();}if(G.chapter==='mom'){G.t+=simDt;step(Z,input,simDt);if(Z.ended){Z.card=null;for(const id of ['ej','ym','fr','ss'])Z.a[id].face='down';}}else Story.tick(G,A,input,simDt);}save();}
  if(G.chapter==='mom'){if(!dev)ZR.R.camLock=Z.shutterAt!=null?[1570,1450]:null;ZR.draw(Z,paused?0:dt);if(Z.shutterAt!=null){photoDissolve(c,photos.mom,Z.t-Z.shutterAt);if(Z.ended&&!watching)text(c,'E · 사진을 바라본다',790,1000,30);}}else{scene(c,A,G);ui(c,A,G,photos);}
  // Fade the same photograph into the actual space after a deliberate reach.
  const departureAge=G.t-(G.flags.departureTime??-99);if(departureAge<1.6&&G.chapter!=='mom'){c.save();c.globalAlpha=1-departureAge/1.6;drawPhoto(c,photos[G.flags.departurePhoto],0,0,1920,1080);c.restore();}
  photoUI.update(paused);
  const next=Story.objects(G).find(o=>G.phase==='cleanup'?o.id===(G.flags.laneClear?'door':'cleanup'):true);
  $('#journeyHint').textContent=watching?'이야기 감상 중 · 메뉴에서 잠시 쉬거나 직접 플레이를 선택하세요':G.chapter==='mom'?zoneObjective(Z):G.phase==='cleanup'?(G.flags.laneClear?'초록색 문 앞으로 가서 사진을 부탁하자. 문 아래를 클릭하면 걸어가서 말을 건넨다.':'왼쪽 거친 바닥에 남은 딱지를 먼저 주워 통로를 비우자.'):G.phase==='photo'&&G.chapter==='dad'?'문에서 내려와 친구 옆의 사진 자리로 가자.':Story.objective(G);
  if(!watching&&!G.inspect&&!G.queue.length&&G.chapter!=='mom'&&next){c.save();c.strokeStyle='#fff3bf';c.lineWidth=3;c.beginPath();c.ellipse(next.at[0],next.at[1],30,12,0,0,Math.PI*2);c.stroke();c.restore();}
  if(transition>0){if(!paused)transition-=dt;c.fillStyle=`rgba(255,247,221,${transition*2})`;c.fillRect(0,0,1920,1080);}
  if(G.shot)photoDissolve(c,photos[G.shot.kind],G.t-G.shot.at);
  const line=G.chapter==='mom'?Z.talk[0]:(G.beat||G.action?null:G.queue[0]),it=G.chapter==='mom'?interactable(Z):Story.nearby(G);$('#chapter').textContent=Story.CHAPTER[G.chapter];$('#actBtn').disabled=G.ended&&!line;$('#actBtn').textContent=G.ended&&!line?'이야기 끝':G.chapter==='mom'&&Z.ended?'사진 바라보기 · E':(line||(G.chapter==='mom'&&Z.card))?'E · 계속':G.holding?'놓기':it?'E · '+it.label:'E · 행동';$('#actionHint').textContent=G.ended&&!line?'메뉴에서 처음부터 다시 플레이할 수 있어요':G.inspect?'사진을 살펴보는 중':line||(G.chapter==='mom'&&Z.card)?'E · Space 또는 아래 버튼으로 계속':G.holding?'누르고 있다가 안내가 바뀌면 놓아 주세요':it&&!line?it.label:'바닥을 누르거나 방향키로 걸어 보세요';$('#transcript').textContent=line?((NAME[line[0]]||Story.NAMES[line[0]]||line[0])+': '+line[1]):G.chapter==='mom'?(Z.card?.text||zoneObjective(Z)):Story.objective(G);
  if(line&&!G.shot){$('#journeyHint').textContent=(NAME[line[0]]||Story.NAMES[line[0]]||line[0])+' · '+line[1];$('#journeyHint').classList.add('dialogue');}else $('#journeyHint').classList.remove('dialogue');
  if(G.shot)$('#journeyHint').textContent=G.shot.kind==='family'?'찰칵. 이번 사진에는 셋이 함께 담겼다.':'함께 고친 딱지를 들고, 나란히.';
  if(watching){const finished=G.ended&&!line;$('#actBtn').disabled=false;$('#actBtn').textContent=finished?'처음 화면으로':'잠시 멈추기';$('#actionHint').textContent=finished?'이야기가 끝났습니다. 메뉴에서 다시 감상하거나 직접 걸어 볼 수 있어요.':'조작 없이 이야기가 이어집니다';if(finished)$('#journeyHint').textContent='다음 사진도 함께 채워 가요.';$('footer>span').textContent='직접 플레이의 저장 기록은 그대로 보존됩니다';}else $('footer>span').textContent='방향키 / WASD · 이동　 E / Space · 이야기　 바닥 클릭 · 걷기';
  if(fxBus){fxBus.gain.setTargetAtTime(muted?0:1,audio.currentTime,.025);if(lastFxMuted!==muted){lastFxMuted=muted;console.info('effects-mute',JSON.stringify({muted}));}}
  music?.tick(G.chapter,{silent:muted,paused,dialogue:!!line,inspection:!!G.inspect||G.holding,phase:G.phase,photoStep:G.inspect?.step,arrivalAge:G.t-(G.flags.arrivalTime??-99)});
  if(music){const state=music.status(),label=state.failed.length?'음악 일부를 읽지 못했습니다. 실행 폴더를 확인해 주세요.':muted?'음악·효과음 꺼짐':state.track?(state.playing?'지금 흐르는 곡 · ':'음악 대기·종료 · ')+state.track:'';if($('#musicNow').textContent!==label)$('#musicNow').textContent=label;}
  if(!paused){if(G.beat?.at!=null&&G.t-G.beat.at>=1&&G.flags.lastHitSound!==G.beat.at){G.flags.lastHitSound=G.beat.at;tone(105,.12,.07);record('paper-impact',{kind:G.beat.kind});}const shotKey=G.chapter==='mom'?Z.shutterAt:G.shot?.at;if(shotKey!=null&&G.flags.lastShutterSound!==G.chapter+shotKey){G.flags.lastShutterSound=G.chapter+shotKey;tone(1450,.055,.04);record('shutter',{kind:G.shot?.kind||'mom'});}const beat=G.timer===null?-1:Math.ceil(G.timer);if(beat!==lastBeep&&beat>0)tone(beat<=3?900:660,.07,.018);lastBeep=beat;if(G.photos.length!==lastPhotos){lastPhotos=G.photos.length;}if(G.chapter!==lastChapter){lastChapter=G.chapter;}}
  const a=G.chapter==='mom'?Z.a.ej:G.actors.ej;if(a.moving&&!paused&&now-lastStep>290){lastStep=now;tone(G.scene==='alley'?110:145,.035,.012);}
  if(watching&&G.ended&&!G.queue.length&&!G.flags.watchLogged){G.flags.watchLogged=true;console.info('watch-complete',JSON.stringify({events:G.events,zone:Z.log}));}
  if(dev)$('#debugState').textContent=JSON.stringify({chapter:G.chapter,phase:G.phase,position:[a.x,a.y],zoneStage:Z.seek.stage,failed:G.failed,queue:G.queue.length});requestAnimationFrame(frame);
 }requestAnimationFrame(frame);
}catch(e){$('#loading').textContent='파일을 읽지 못했습니다. 실행 파일로 서버를 연 뒤 다시 시도해 주세요. '+e.message;console.error(e);}
