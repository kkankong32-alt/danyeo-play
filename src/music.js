export const TRACKS={home:'다녀오겠습니다',mom:'그날의 숨바꼭질',dad:'딱지 한 판!',travel:'사진 속으로',ending:'같은 하늘 아래'};
export function cueFor(chapter,{phase='',photoStep='',arrivalAge=99}={}){
 if(['alive','enter'].includes(photoStep)||arrivalAge<2)return 'travel';
 if(chapter==='ending'||chapter==='final'&&phase!=='ask')return 'ending';
 return chapter==='mom'?'mom':chapter==='dad'?'dad':'home';
}
// Source MP3s are untouched. Overlap/fades are playback only.
export function createMusic(ctx,report=()=>{}){
 const master=ctx.createGain();master.gain.value=0;master.connect(ctx.destination);
 const buffers={},pending={},active=new Set();let selected=null,started=null,next=Infinity,lastSilent=null;const failed=new Set();
 const load=id=>pending[id]??=(async()=>{const url='assets/music/'+encodeURIComponent(TRACKS[id])+'.mp3';const r=await fetch(url);if(!r.ok)throw Error(url);buffers[id]=await ctx.decodeAudioData(await r.arrayBuffer());report('music-loaded',{track:TRACKS[id],duration:buffers[id].duration});return buffers[id];})().catch(e=>{failed.add(id);report('music-error',{track:TRACKS[id],message:String(e)});return null;});
 for(const id of Object.keys(TRACKS))load(id);
 function start(id){const buffer=buffers[id];if(!buffer)return;const now=ctx.currentTime,s=ctx.createBufferSource(),g=ctx.createGain(),duration=buffer.duration-({home:.45,mom:.35,dad:1.9}[id]||0);
 s.buffer=buffer;s.connect(g);g.connect(master);g.gain.setValueAtTime(0,now);g.gain.linearRampToValueAtTime(1,now+1.25);
 const repeat=['home','mom','dad'].includes(id);{g.gain.setValueAtTime(1,now+Math.max(1.25,duration-1.5));g.gain.linearRampToValueAtTime(0,now+duration);}
 s.start(now);if(repeat)s.stop(now+duration+.05);const item={s,g};active.add(item);s.onended=()=>{active.delete(item);s.disconnect();g.disconnect();};next=repeat?now+Math.max(2,duration-1.5):Infinity;started=id;report('music-start',{track:TRACKS[id],loop:repeat});
 }
 return {tick(chapter,opts={}){const now=ctx.currentTime,id=cueFor(chapter,opts);if(lastSilent!==!!opts.silent){lastSilent=!!opts.silent;report("music-mute",{muted:lastSilent,context:ctx.state});}
 if(id!==selected){selected=id;started=null;next=Infinity;for(const v of active){v.g.gain.cancelScheduledValues(now);v.g.gain.setTargetAtTime(0,now,.4);try{v.s.stop(now+1.8);}catch{}}}
 const level=opts.silent?0:opts.dialogue?.18:opts.inspection?.18:opts.paused?.14:id==='travel'?.28:.32;master.gain.setTargetAtTime(level*({home:.9,mom:.94,dad:.84,travel:1,ending:1}[id]),now,opts.silent?.04:.25);
 if(!opts.silent&&!failed.has(id)&&buffers[id]&&(started!==id||now>=next))start(id);
 },status(){return {track:TRACKS[selected],playing:active.size>0,loaded:Object.keys(buffers).length,failed:[...failed],context:ctx.state};}};
}
