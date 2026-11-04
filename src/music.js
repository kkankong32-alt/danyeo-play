export const TRACKS={home:'다녀오겠습니다',mom:'그날의 숨바꼭질',dad:'딱지 한 판!',travel:'사진 속으로',ending:'같은 하늘 아래'};
export function cueFor(chapter,{phase='',photoStep='',arrivalAge=99}={}){
 if(['alive','enter'].includes(photoStep)||arrivalAge<2)return 'travel';
 if(chapter==='ending'||chapter==='final'&&phase!=='ask')return 'ending';
 return chapter==='mom'?'mom':chapter==='dad'?'dad':'home';
}
// Stream only the selected cue: no five-song PCM buffers on the first click.
// Two elements allow a crossfade; stopped elements release their source.
export function createMusic(ctx,report=()=>{},makeAudio=()=>new Audio()){
 const master=ctx.createGain();master.gain.value=0;master.connect(ctx.destination);
 const active=new Set(),loaded=new Set(),failed=new Set();let selected=null,current=null,lastLevel=-1,lastSilent=null,lastPaused=false;
 function dispose(v){v.el.pause();v.el.removeAttribute('src');v.el.load();v.source.disconnect();v.g.disconnect();active.delete(v);}
 function play(v){if(v.ended||v.starting||!v.el.paused)return;v.starting=true;Promise.resolve(v.el.play()).catch(e=>{if(e.name!=='AbortError'){failed.add(v.id);report('music-error',{track:TRACKS[v.id],message:String(e)});}}).finally(()=>v.starting=false);}
 function start(id){const el=makeAudio(),g=ctx.createGain();el.preload='none';el.src='assets/music/'+encodeURIComponent(TRACKS[id])+'.mp3';el.loop=['home','mom','dad'].includes(id);
 const source=ctx.createMediaElementSource(el);source.connect(g);g.connect(master);const v={id,el,g,source,ended:false,retire:null,starting:false};active.add(v);
 g.gain.setValueAtTime(0,ctx.currentTime);g.gain.linearRampToValueAtTime(1,ctx.currentTime+1.25);
 el.addEventListener('loadedmetadata',()=>{loaded.add(id);report('music-loaded',{track:TRACKS[id],duration:el.duration,streamed:true});});
 el.addEventListener('error',()=>{failed.add(id);report('music-error',{track:TRACKS[id],code:el.error?.code});});
 el.addEventListener('ended',()=>{v.ended=true;});
 report('music-start',{track:TRACKS[id],loop:el.loop,streamed:true});return v;
 }
 return {tick(chapter,opts={}){const now=ctx.currentTime,id=cueFor(chapter,opts);if(lastSilent!==!!opts.silent){lastSilent=!!opts.silent;report('music-mute',{muted:lastSilent,context:ctx.state});}
 if(id!==selected){selected=id;for(const v of active){v.g.gain.cancelScheduledValues(now);v.g.gain.setTargetAtTime(0,now,.4);v.retire=now+1.8;}current=null;}
 for(const v of [...active])if(v.retire!==null&&now>=v.retire)dispose(v);
 const level=(opts.silent?0:opts.dialogue?.18:opts.inspection?.18:opts.paused?.14:id==='travel'?.28:.32)*({home:.9,mom:.94,dad:.84,travel:1,ending:1}[id]);
 if(level!==lastLevel){master.gain.setTargetAtTime(level,now,opts.silent?.04:.25);lastLevel=level;}
 const suspended=!!opts.paused||!!opts.silent;
 if(!suspended&&!current&&!failed.has(id))current=start(id);
 if(!suspended&&current?.el.loop&&Number.isFinite(current.el.duration)&&current.el.currentTime>=current.el.duration-({home:.45,mom:.35,dad:1.9}[id]||0)-1.5){
  current.g.gain.cancelScheduledValues(now);current.g.gain.setTargetAtTime(0,now,.35);current.retire=now+1.5;current=start(id);
 }

 for(const v of active){if(suspended){if(!v.el.paused)v.el.pause();}else if(!failed.has(v.id))play(v);}
 lastPaused=suspended;
 },status(){return {track:TRACKS[selected],playing:!!current&&!current.el.paused&&!current.ended&&!lastPaused,loaded:loaded.size,failed:[...failed],context:ctx.state};}};
}
