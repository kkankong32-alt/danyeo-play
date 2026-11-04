// Serializable, input-driven photo investigation. No travel on a dialogue-only path.
export function openInvestigation(G,kind,mode='travel'){
 if(G.flags.savedInspection?.kind===kind&&G.flags.savedInspection?.mode===mode){G.inspect=G.flags.savedInspection;G.flags.savedInspection=null;return;}
 G.inspect={kind,mode,step:mode==='trace'?'trace-look':'look',x:76,y:54,held:false,age:0};
 G.flags.photoView=null;for(const a of Object.values(G.actors)){a.path=null;a.moving=false;}
}
export function investigate(G,event){
 const p=G.inspect;if(!p)return false;
 if(event==='zoom'&&p.step==='look'){p.step='compare';return true;}
 if(event==='pick'&&p.step==='compare'){p.held=!p.held;return true;}
 if(event==='match'&&p.step==='compare'&&p.held&&Math.hypot(p.x-27,p.y-54)<17){p.step='alive';p.age=0;p.held=false;return true;}
 if(event==='reach'&&p.step==='alive'&&p.age>=2){p.step='enter';p.age=0;return true;}
 return false;
}
