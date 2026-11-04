import {FAMILY,familyReady} from './family.js';
import {SHOT_SECONDS} from './cinema.js';
import {openInvestigation,investigate} from './investigation.js';
import {actor,POINTS as P,walk,route} from './world.js';
export const NAMES={ej:'은재',mom:'엄마',dad:'아빠',yd:'어린 아빠',voice:'할아버지'};
export const CHAPTER={prologue:'2026 · 사진 상자',mom:'1993 · 다대포의 마당',bridge:'2026 · 두 번째 사진',dad:'1991 · 양산의 골목',final:'2026 · 돌아온 집',ending:'우리의 다음 장'};
export function initial(A){return {version:1,chapter:'prologue',phase:'box',scene:'home',t:0,queue:[['mom','은재야, 사진 상자 좀 같이 정리할까?']],after:null,actors:{ej:actor('ej',1040,900,A.walk.ej,'up'),mom:actor('mom',...P.mom,A.walk.mom),dad:actor('dad',...P.dad,A.walk.dad)},flags:{},events:[],failed:0,carry:false,timer:null,hold:0,holding:false,photos:[],ended:false};}
export function log(G,event,details={}){G.events.push({t:+G.t.toFixed(2),chapter:G.chapter,phase:G.phase,event,...details});}
export function say(G,lines,after=null){for(const a of Object.values(G.actors)){a.moving=false;if(a.gait){a.gait.mode="idle";a.gait.stopTarget=null;}}const target=lines.find(l=>l[0]!=='ej'&&G.actors[l[0]])?.[0];if(target&&!G.flags.photoView){const e=G.actors.ej,n=G.actors[target];const dx=n.x-e.x,dy=n.y-e.y;e.face=Math.abs(dx)>Math.abs(dy)?(dx>0?'right':'left'):(dy>0?'down':'up');n.face={right:'left',left:'right',up:'down',down:'up'}[e.face];e.path=null;}G.queue.push(...lines);G.after=after;log(G,'dialogue',{lines});}
export function enter(G,chapter,A){G.chapter=chapter;G.scene=chapter==='dad'?'alley':'home';G.actors={ej:actor('ej',1040,900,A.walk.ej,'up')};
 if(chapter==='dad'){G.phase='join';G.actors.yd=actor('yd',320,700,A.walk.yd,'down');say(G,[['yd','거기 말고 이쪽! 거기는 사람 지나가.'],['ej','사진 속 골목이다. 저 애는… 아빠?']]);}
 else {G.actors.mom=actor('mom',...P.mom,A.walk.mom);G.actors.dad=actor('dad',...P.dad,A.walk.dad);G.phase=chapter==='bridge'?'show':'ask';say(G,chapter==='bridge'?[[ 'ej','방금… 셔터 소리가 났는데. 다시 우리 집이야.']]:[['mom','은재야. 무슨 생각을 그렇게 해?'],['ej','엄마, 아빠… 다녀왔습니다.'],['mom','사진 속에 다녀온 얼굴이네.']]);}
 if(chapter==='bridge'){G.phase='trace';G.after='traceMom';}log(G,'enter');}
const o=(id,label,at,extra={})=>({id,label,at,...extra});
export function objects(G){const p=G.phase;
 if(G.chapter==='prologue')return [o('box',p==='box'?'사진 상자 열기':'오래된 사진 살펴보기',P.box)];
 if(G.chapter==='bridge')return p==='trace'?[o('trace','방금 찍은 사진 다시 보기',P.box)]:p==='show'?[o('mom','엄마에게 사진 보여 주기',P.mom)]:[o('photo91','아빠 사진 살펴보기',P.box)];
 if(G.chapter==='dad'){
  if(p==='join')return[o('join','같이 딱지치기', [320,700])];
  if(p==='repair')return[o('repair','접힌 귀 함께 잡기 · E 길게',P.repair)];
  if(p==='surface')return G.carry?[o('place','평평한 바닥에 내려놓기',P.smooth)]:[o('pick','딱지 옮기기',P.rough),o('rough','거친 바닥에서 쳐 보기',[510,740])];
  if(p==='aim')return[o('center','가운데를 겨눠 보기',P.center),o('edge','들린 가장자리 겨누기',P.edge)];
  if(p==='cleanup')return[...(!G.flags.laneClear?[o('cleanup','통로의 남은 딱지 줍기',P.rough)]:[]),o('door','사진 부탁하기',P.door)];
  if(p==='photo')return[o('photo','친구 옆에 서기',P.photo)];
 }
 if(G.chapter==='final'){
  if(p==='ask')return[o('dad','아빠에게 묻기',P.dad)];
  if(p==='album')return[o('album','앨범 귀 잡아 주기 · E 길게',P.album)];
  if(p==='camera')return[o('camera','사진 찍는 아빠에게 가기',P.dad)];
  if(p==='shelf')return[o('shelf','카메라 삼각대 펴기',[1040,960]),o('stool','의자 살펴보기',[240,850])];
  if(p==='timer')return[o('timer','10초 타이머 켜기',[1040,960])];
  if(p==='countdown')return[];
  if(p==='paste')return[o('paste','새 가족사진을 앨범에 넣기',P.album)];
 }
 return[];
}
export function nearby(G){const a=G.actors.ej;return objects(G).map(x=>({...x,d:Math.hypot(x.at[0]-a.x,(x.at[1]-a.y)*1.1)})).filter(x=>x.d<(x.id==='middle'?55:125)).sort((a,b)=>a.d-b.d)[0]??null;}
export function objective(G){if(G.ended)return "";return ({box:'탁자 위 사진 상자를 열어 보자',photo:'사진 속 얼굴과 노란 장식을 살펴보자',trace:'사진 속 가방을 다시 살펴보자',show:'엄마에게 오래된 사진을 보여 드리자',photo91:'상자에 남은 아빠 사진을 보자',join:'골목에서 딱지 치는 아이에게 가 보자',repair:'벌어진 귀를 함께 눌러 보자 · 가까이서 E를 길게',surface:G.carry?'밝고 평평한 바닥으로 딱지를 옮기자':'울퉁불퉁한 바닥 말고 다른 곳을 찾아보자',aim:'파란 딱지의 조금 들린 가장자리를 찾아보자',cleanup:'문 앞 통로를 비우고 사진을 부탁하자',photoDad:'친구 옆에 나란히 서서 사진을 찍자',posing:'둘이 나란히, 카메라를 보자',ask:'아빠에게 딱지 이야기를 해 보자',album:'탁자에서 아빠와 앨범을 고치자',camera:'아빠도 함께 사진에 나오면 좋겠다',shelf:'소파 맞은편, 깔개 앞쪽에서 삼각대를 펴자',timer:'삼각대에서 타이머를 켜고 엄마 옆 빈자리로 가자',countdown:'엄마와 아빠 사이로! 아빠 자리도 남겨 두자',paste:'사진을 앨범에 넣자'})[G.chapter==='dad'&&G.phase==='photo'?'photoDad':G.phase]||'';}
export function action(G,A){if(G.shot||G.beat||G.action)return;if(G.queue.length){G.queue.shift();if(!G.queue.length&&G.after){const a=G.after;G.after=null;after(G,a,A);}return;}
 const it=nearby(G);if(!it)return;log(G,'interact',{id:it.id,x:G.actors.ej.x,y:G.actors.ej.y});
 switch(it.id){
 case 'box': if(G.phase==='box'){G.phase='photo';G.actors.mom.path=route('home',G.actors.mom,[670,850]);say(G,[['mom','엄마 어릴 때야. 다대포에서 살았지.'],['ej','엄마도 나만 했네. 옆의 작은 애는?'],['mom','수경 이모. 그땐 네 살이었어.']]);}else{openInvestigation(G,'mom');log(G,'photo-open',{kind:'mom'});}break;
 case 'trace':openInvestigation(G,'mom','trace');break;
 case 'mom':G.phase='photo91';say(G,[['ej','엄마, 이때 수경 이모 자리도 만들어 줬지?'],['mom','응. 자기도 같이 놀겠다고 꼭 끼었거든.'],['ej','친구가 도망가도 끝까지 찾았어?'],['mom','놓치고 또 놓쳤지. 누가 반대쪽을 맡아 줬던 것 같은데…'],['dad','그 밑에 있는 건 아빠네 골목이네.']]);break;
 case 'photo91':G.actors.dad.path=route('home',G.actors.dad,[760,870]);say(G,[['dad','양산 살 때야. 집 앞 골목에서 늘 딱지를 쳤지.'],['ej','아빠도 이만큼 작았구나. 사진 좀 더 볼게.']],'inspectDad');break;
 case 'join':G.phase='repair';say(G,[['yd','딱지 칠래? 아, 또 풀렸네.'],['ej','버리지 마. 반대쪽은 내가 잡아 줄게.'],['yd','…고마워. 너 이름이 뭐야?'],['ej','은재.'],['yd','은재야, 여기 좀 잡아 줘. 내가 다시 끼워 볼게.']]);G.flags.demo=true;break;
 case 'repair':G.holding=true;G.hold=0;log(G,'fold-start');break;
 case 'rough':startStrike(G,'rough');G.failed++;say(G,[['yd','살짝 들렸다가 바닥에 걸려.'],['ej','여긴 돌이 튀어나왔네. 밝은 쪽 바닥은 매끈해.']]);log(G,'retry',{cause:'rough'});break;
 case 'pick':G.carry=true;G.actors.yd.path=route('alley',G.actors.yd,[1130,720]);say(G,[['yd','내 딱지도 같이 가져가자.']]);break;
 case 'place':G.carry=false;G.phase='aim';G.flags.surface='smooth';say(G,[['ej','여긴 덜 울퉁불퉁하다.'],['yd','파란 딱지 한쪽이 조금 떠 있어. 손은 빼고!']]);break;
 case 'center':startStrike(G,'center');G.failed++;say(G,[['yd','가운데로 치니까 옆으로만 밀리네.'],['ej','조금 들린 쪽으로 가 볼게.']]);log(G,'retry',{cause:'center'});break;
 case 'edge':startStrike(G,'edge');G.phase='cleanup';say(G,[['yd','됐다! 우리 둘이 뒤집었어!'],['yd','아빠한테 사진 찍어 달라고 하자. 먼저 저 딱지부터 줍고!']]);log(G,'ddakji-flipped');break;
 case 'cleanup':G.action={kind:'pickup',at:null};G.actors.ej.path=route('alley',G.actors.ej,[470,680]);log(G,'pickup-start');break;
 case 'door':if(!G.flags.laneClear){G.failed++;say(G,[['voice','길에 딱지가 있네. 사람 지나가니까 치우자.']]);log(G,'retry',{cause:'lane'});}else{G.phase='photo';G.actors.yd.path=route('alley',G.actors.yd,[1380,690]);G.photographer={x:1210,y:525,target:[1210,945],dist:0,ready:false};say(G,[['yd','아빠! 은재랑 딱지치기 했어.'],['yd','못 쓰는 줄 알았는데, 은재가 같이 고쳐 줬어.'],['yd','우리 둘이 사진 찍어 줘!'],['voice','그래. 같이 고친 딱지도 들고 서 봐.']]);}break;
 case 'photo':G.phase='posing';G.actors.ej.path=route('alley',G.actors.ej,P.photo);G.actors.yd.path=route('alley',G.actors.yd,[1280,690]);log(G,'photo-positions');break;
 case 'dad':G.phase='album';say(G,[['ej','아빠, 그 빨간 딱지 오래 썼어?'],['dad','응. 버리려던 걸 어떤 아이가 같이 고쳐 줬거든.'],['ej','반대쪽을 잡아 줬어?'],['dad','그래. 이긴 것보다, 같이 고친 게 더 기억나.'],['dad','어, 앨범 귀도 들렸네. 이것 좀 잡아 줄래?'],['ej','응. 이번에도 내가 잡을게.']]);G.actors.dad.path=route('home',G.actors.dad,[650,820]);break;
 case 'album':G.holding=true;G.hold=0;G.flags.holdKind='album';G.actors.ej.face='up';G.actors.dad.face='left';log(G,'album-hold-start');break;
 case 'camera':G.phase='shelf';say(G,[['ej','아빠도 와! 내가 자리 비워 둘게.'],['dad','그럼 삼각대에 올려놓자. 타이머로 찍으면 되겠네.']]);break;
 case 'stool':G.failed++;say(G,[['mom','의자는 흔들려. 올라가면 위험해.'],['dad','삼각대를 쓰자. 카메라가 우리 쪽을 보게.']]);log(G,'retry',{cause:'stool'});break;
 case 'shelf':G.action={kind:'mount',at:null};G.actors.dad.path=route('home',G.actors.dad,[1040,945]);G.actors.ej.path=route('home',G.actors.ej,[900,930]);log(G,'camera-mount-start');break;
 case 'timer':G.phase='countdown';G.timer=10;G.actors.dad.path=route('home',G.actors.dad,FAMILY.dad);log(G,'timer-start');break;
 case 'paste':G.chapter='ending';G.ended=true;G.flags.photoView='family';say(G,[['ej','오늘 사진도 생겼네. 우리 셋이 같이.'],['mom','이쪽 빈 장에도 사진을 넣을까?'],['ej','여긴 남겨 두자. 다음에 셋이 찍은 사진 넣게.'],['dad','좋아. 다음에도 아빠 자리 남겨 줘.'],['ej','응. 꼭 같이 찍자.']]);log(G,'ending');break;
 }
}
export function photoAction(G,event,A){const p=G.inspect;if(!p)return;const kind=p.kind;if(event==='trace-zoom'&&p.mode==='trace'){p.step='trace';log(G,'photo-trace-zoom',{kind});return;}if(event==='trace-done'&&p.mode==='trace'&&p.step==='trace'){G.inspect=null;G.phase='show';G.flags.recognized=true;log(G,'photo-trace',{kind});return;}if(investigate(G,event))log(G,'photo-'+event,{kind});}
export function finishTravel(G,A){const p=G.inspect;if(!p||p.step!=='enter'||p.age<2.8)return;const kind=p.kind;G.inspect=null;G.flags.arrivalPhoto=kind;G.flags.arrivalTime=G.t;if(kind==='mom'){G.chapter='mom';G.phase='seek';log(G,'portal',{kind,intent:'unexpected'});}else{enter(G,'dad',A);log(G,'portal',{kind,intent:'chosen'});}}
function after(G,a,A){if(a==='inspectDad')openInvestigation(G,'dad');if(a==='traceMom')openInvestigation(G,'mom','trace');if(a==='shootDad'){G.shot={kind:'dad',at:G.t};G.flags.shutter=G.t;log(G,'shot-start',{kind:'dad'});}if(a==='returnDad'){G.photos.push('dad');G.flags.shutter=G.t;G.flags.photoView=null;enter(G,'final',A);G.flags.departurePhoto='dad';G.flags.departureTime=G.t;}}
export function releaseHold(G){if(!G.holding)return;G.holding=false;if(G.flags.holdKind==='album'){G.flags.holdKind=null;if(G.hold<1.2){G.failed++;say(G,[['dad','종이가 다시 들리네. 조금만 더 잡아 줄래?']]);log(G,'retry',{cause:'album-release'});}else{G.phase='camera';G.flags.albumRepaired=true;say(G,[['ej','이제 손 놓아도 돼?'],['dad','응. 네가 잡아 줘서 잘 붙었네.'],['mom','옛날 사진만 보지 말고, 우리도 한 장 남길까?'],['dad','좋지. 둘이 서 봐. 아빠가 찍어 줄게.']]);G.actors.dad.path=route('home',G.actors.dad,P.dad);log(G,'album-repaired');}G.hold=0;return;}if(G.hold>=1.2){G.flags.fold='locked';G.phase='surface';say(G,[['yd','됐다! 이제 손 빼도 돼.'],['ej','이번엔 단단해. 바닥도 바꿔 볼까?']]);log(G,'fold-locked');}else{G.failed++;say(G,[['yd','아직 안 끼워졌어. 조금만 더 잡아 줘.']]);log(G,'retry',{cause:'fold-release'});}G.hold=0;}
export function tick(G,A,input,dt){G.t+=dt;
 if(G.shot){if(G.t-G.shot.at>=SHOT_SECONDS){const kind=G.shot.kind;G.shot=null;if(kind==='dad'){G.photographer=null;after(G,'returnDad',A);}else{G.phase='paste';G.flags.photoView='family';G.photos.push('family');say(G,[['mom','아빠가 서두르니까 은재도 웃었네.'],['dad','늦을까 봐 그랬지.'],['ej','안 늦었어. 내 옆에 왔잖아.']]);}}return;}
 if(G.action){const b=G.action,a=G.actors[b.kind==='pickup'?'ej':'dad'];if(b.kind==='mount')walk(G.actors.ej,{dx:0,dy:0},dt,G.scene,A.walk.ej);if(b.at===null){walk(a,{dx:0,dy:0},dt,G.scene,A.walk[a.id]);if(!a.path?.length){a.moving=false;a.gait.mode='idle';a.face='down';b.at=G.t;log(G,b.kind+'-pose');}}else{const age=G.t-b.at;if(b.kind==='pickup'){if(age>=1.1&&!G.flags.laneClear){G.flags.laneClear=true;G.flags.spareTile=true;log(G,'tile-gripped');}if(age>=2.5){G.action=null;log(G,'lane-cleared');}}else if(age>=1.3){G.flags.cameraPlaced=true;G.phase='timer';G.action=null;G.actors.mom.path=route('home',G.actors.mom,FAMILY.mom);a.path=route('home',a,[1150,950]);say(G,[['mom','은재는 가운데. 아빠 자리도 남겨 두자.'],['ej','응! 타이머 켜고 올게.']]);log(G,'camera-mounted');}}return;}
 if(G.beat){const b=G.beat,a=G.actors.yd;if(b.at===null){walk(a,{dx:0,dy:0},dt,G.scene,A.walk.yd);if(!a.path?.length){b.at=G.t;G.flags[b.kind==='edge'?'flipAt':'hitAt']=G.t+1;log(G,'strike-windup',{kind:b.kind});}}else if(G.t-b.at>=2.7)G.beat=null;return;}
 if(G.photographer&&!G.photographer.ready){const p=G.photographer,dx=p.target[0]-p.x,dy=Math.abs(dx)>2?0:p.target[1]-p.y,d=Math.hypot(dx,dy),step=Math.min(d,105*dt);p.x+=dx/(d||1)*step;p.y+=dy/(d||1)*step;p.dist+=step;p.face=Math.abs(dx)>2?'left':'down';p.ready=Math.hypot(p.target[0]-p.x,p.target[1]-p.y)<3;}
 if(G.inspect){G.inspect.age+=dt;finishTravel(G,A);return;}if(G.chapter==='mom'||G.ended)return;if(G.holding){G.hold+=dt;return;}for(const a of Object.values(G.actors))if(a.id!=='ej')walk(a,{dx:0,dy:0},dt,G.scene,A.walk[a.id]);
 if(G.phase==='shutterWait'){G.actors.ej.face='down';G.actors.yd.face='down';}if(G.queue.length)return;
 walk(G.actors.ej,input,dt,G.scene,A.walk.ej,Object.values(G.actors));
 if(G.phase==='posing'&&G.photographer?.ready&&!G.actors.ej.path?.length&&!G.actors.yd.path?.length){for(const a of Object.values(G.actors)){a.face='down';a.moving=false;a.gait.mode='idle';}G.phase='shutterWait';say(G,[['yd','은재야, 다음엔 네 차례야.'],['ej','응. 또 같이 하고 싶어.'],['voice','둘이 조금 붙어 봐. 그래, 여기 보렴.']],'shootDad');}
 if(G.timer!==null){for(const a of Object.values(G.actors))if(!a.path?.length&&!a.moving)a.face='down';G.timer-=dt;if(G.timer<=0){G.timer=null;const e=G.actors.ej,d=G.actors.dad;if(familyReady(G)){G.shot={kind:'family',at:G.t};G.flags.shutter=G.t;G.flags.family=true;for(const a of Object.values(G.actors))a.face='down';log(G,'family-shot');}else{G.phase='timer';G.failed++;say(G,[['dad','아직 자리에 못 왔네. 괜찮아, 다시 찍자.']]);log(G,'retry',{cause:'timer'});}}}
}

function startStrike(G,kind){const smooth=G.flags.surface==='smooth',x=smooth?1210:420,y=smooth?720:680;G.beat={at:null,kind};G.actors.yd.path=route('alley',G.actors.yd,[x-46,y+8]);}
