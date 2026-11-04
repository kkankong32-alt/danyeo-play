// One set of foot anchors for the countdown, pose and photograph.
export const FAMILY={mom:[920,760],ej:[1040,785],dad:[1160,760]};
export function familyReady(G){return Object.entries(FAMILY).every(([id,p])=>{const a=G.actors[id];return a&&!a.moving&&!a.path?.length&&Math.hypot(a.x-p[0],a.y-p[1])<(id==='ej'?65:30);});}
export function familyPoseMix(G){
 if(G.flags.familyPortrait||G.shot?.kind==='family')return 1;
 if(G.phase!=='countdown'||G.timer===null||G.timer>1.8||!familyReady(G))return 0;
 return Math.min(1,(1.8-G.timer)/.35);
}

// One crop of the actual room; no independent character/background scaling.
export const FAMILY_CROP=[640,210,800,600];
export function familyLean(id,mix){return (id==='mom'?.025:id==='dad'?-.025:0)*mix;}
