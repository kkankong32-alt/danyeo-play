import * as Story from './story.js?v=18';
import {route,POINTS} from './world.js?v=18';
import {clickTo,interactable} from '../zone/sim.js?v=18';
import {STAIRS,SPOT,other} from '../zone/zone.js?v=18';
// Runs the real movement and puzzle rules. No scene skipping or save mutation.
export function createDirector(){let last='',age=0,repath=0;return function(G,Z,A,dt,act){
 if(G.shot||G.beat||G.action)return;
 const line=G.chapter==='mom'?(Z.talk[0]?.[1]||Z.card?.text):G.queue[0]?.[1];
 const key=line||G.inspect?.step||G.chapter+G.phase+Z.seek.stage;
 if(key!==last){last=key;age=0;}age+=dt;repath-=dt;
 if(line){if(age>Math.max(2.8,line.length*.085)){act();age=0;}return;}
 if(G.ended)return;
 if(G.inspect){const p=G.inspect;if(age<2)return;
  if(p.step==='look')Story.photoAction(G,'zoom',A);
  else if(p.step==='compare'){p.held=true;p.x=Math.max(27,p.x-dt*22);p.y=54;if(p.x===27)Story.photoAction(G,'match',A);}
  else if(p.step==='alive'&&age>4)Story.photoAction(G,'reach',A);
  else if(p.step==='trace-look')Story.photoAction(G,'trace-zoom',A);
  else if(p.step==='trace')Story.photoAction(G,'trace-done',A);return;
 }
 if(G.holding){if(G.hold>1.8)Story.releaseHold(G);return;}
 if(G.chapter==='mom'){
  if(Z.ended){if(age>2)act();return;}if(Z.freeze||Z.script.length)return;
  const s=Z.seek,e=Z.a.ej,it=interactable(Z);let target;
  if(s.stage==='arrive'){if(it?.id==='meet'){act();return;}target=[Z.a.ym.x,Z.a.ym.y+100];}
  else if(s.stage==='photo')target=SPOT.photo.ej;
  else if(s.stage==='seek'){
   if(s.friendMode==='flee')return;
   if(s.friendMode==='trapped')target=[Z.a.fr.x,236];
   else if(s.canAsk&&s.momMode==='follow'){
    if(it?.id==='ask'&&it.sid===other(s.friendAt)){act();return;}
    target=[STAIRS[other(s.friendAt)].x,820];
   }else if(s.momMode==='guard'&&!s.posted)return;
   else {if(it?.id==='shoe'&&!s.clues.shoe){act();return;}target=[STAIRS[s.friendAt].x,690];}
  }
  if(target&&repath<=0){clickTo(Z,...target);repath=1;}return;
 }
 let target=G.phase==='countdown'?{at:POINTS.middle}:Story.objects(G).find(o=>
  G.phase==='cleanup'?o.id===(G.flags.laneClear?'door':'cleanup'):G.phase==='surface'?o.id===(G.carry?'place':'pick'):G.phase==='aim'?o.id==='edge':G.phase==='shelf'?o.id==='shelf':true);
 if(!target)return;const near=Story.nearby(G);
 if(near?.id===target.id&&age>1){act();age=0;return;}
 if(repath<=0){G.actors.ej.path=route(G.scene,G.actors.ej,target.at,Object.values(G.actors));repath=1;}
 };}
