// Camera is held in both hands. Only the two leg chains articulate; the torso
// and face come from one unchanging drawing per view, not eight AI variants.
export const GD_CYCLE = 220;
export const GD_DEPTH = .45;
export function footTrajectory(phase) {
  const p=((phase%1)+1)%1,stance=.58,span=GD_CYCLE*stance;
  if(p<stance)return {x:span*(.5-p/stance),lift:0,stance:true};
  const t=(p-stance)/(1-stance),ease=t*t*(3-2*t);
  return {x:span*(-.5+ease),lift:12*Math.sin(Math.PI*t),stance:false};
}
export function knee(hip,ankle,l1=86,l2=88) {
  const dx=ankle[0]-hip[0],dy=ankle[1]-hip[1],d=Math.max(.01,Math.hypot(dx,dy)),q=Math.min(d,l1+l2-.1);
  const a=(l1*l1-l2*l2+q*q)/(2*q),h=Math.sqrt(Math.max(0,l1*l1-a*a));
  return [hip[0]+dx/d*a-dy/d*h,hip[1]+dy/d*a+dx/d*h];
}
function bone(c,im,rect,pivot,sourceLength,from,to,taper=false){
  c.save();c.translate(...from);c.rotate(Math.atan2(to[1]-from[1],to[0]-from[0])-Math.PI/2);
  c.scale(1,Math.hypot(to[0]-from[0],to[1]-from[1])/sourceLength);
  if(taper){c.beginPath();c.moveTo(-27,-5);c.lineTo(27,-5);c.lineTo(22,sourceLength-5);c.quadraticCurveTo(22,sourceLength+7,0,sourceLength+7);c.quadraticCurveTo(-22,sourceLength+7,-22,sourceLength-5);c.closePath();c.clip();}
  c.drawImage(im,...rect,rect[0]-pivot[0],rect[1]-pivot[1],rect[2],rect[3]);c.restore();
}
export function drawGrandmother(c,views,a,height,time){
  const side=a.face==='left'||a.face==='right',im=views[side?'left':a.face]||views.down,sc=height/420;
  const state=a._legRig??={weight:0,t:time,phase:0,dist:a.dist};const dt=Math.max(0,Math.min(.05,time-state.t));state.t=time;
  const target=a.moving?1:0;state.weight+=Math.max(-dt*7,Math.min(dt*7,target-state.weight));
  if(a.moving)state.phase+=Math.max(0,a.dist-(state.dist??a.dist))/(GD_CYCLE*sc*(side?1:GD_DEPTH));state.dist=a.dist;
  const weight=state.weight,phase=state.phase,feet=[footTrajectory(phase),footTrajectory(phase+.5)];
  c.save();c.translate(a.x,a.y-a.z);c.scale(sc*(a.face==='right'?-1:1),sc);c.translate(-180,-450);
  if(weight<.001){c.drawImage(im,0,0);c.restore();return;}
  let bob=weight*(2+2*Math.cos(4*Math.PI*phase));
  if(side){const planted=feet.filter(f=>f.stance);bob=weight*Math.max(...planted.map(f=>432-Math.sqrt(168*168-(-9-f.x)**2)-263));}
  if(side){
    for(const i of [1,0]){
      const f=feet[i],hip=[183,263+bob],ankle=[174-f.x*weight,432-f.lift*weight],k=knee(hip,ankle,82,87);
      c.save();if(i===1)c.filter='brightness(.88)';
      bone(c,im,[145,255,76,105],[183,263],82,hip,k,true);
      bone(c,im,[140,337,76,105],[178,345],87,k,ankle,true);
      c.drawImage(im,125,426,110,26,125+ankle[0]-174,426+ankle[1]-432,110,26);c.restore();
    }
    c.drawImage(im,0,0,360,278,0,bob,360,278);
  }else{
    // Frontal foreshortening: each foot advances independently; neither leg
    // changes width or crosses through the other. Knees flex only in swing.
    const order=feet[0].x<feet[1].x?[0,1]:[1,0];
    for(const i of order){
      const x=i===0?151:207,f=feet[i],dy=weight*((a.face==='up'?-1:1)*f.x*GD_DEPTH-f.lift*.7),hip=[x,263+bob],ankle=[x+(i?1:-1)*Math.sin(Math.PI*((phase+i*.5)%1))*weight*2,432+dy];
      const k=[x,347+bob+dy*.35];const sx=i===0?122:180;
      bone(c,im,[sx,258,58,97],[x,263],84,hip,k);
      bone(c,im,[sx,339,58,99],[x,347],85,k,ankle);
      c.drawImage(im,sx,425,58,27,sx+ankle[0]-x,425+dy,58,27);
    }
    c.drawImage(im,0,0,360,278,0,bob,360,278);
  }
  c.restore();
}
