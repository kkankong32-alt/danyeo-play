// Visual timing shares the simulation clock: a pause freezes every beat.
export const SHOT_SECONDS=5;
export function photoDissolve(c,im,age){
 if(!im||age<0)return;
 const p=Math.min(1,Math.max(0,(age-.2)/1.8)),ease=p*p*(3-2*p);
 c.save();c.fillStyle=`rgba(255,246,223,${Math.max(0,1-age/.38)})`;c.fillRect(0,0,1920,1080);
 c.fillStyle=`rgba(45,35,25,${ease*.55})`;c.fillRect(0,0,1920,1080);
 const w=1480-120*ease,h=w*im.height/im.width,x=(1920-w)/2,y=(1080-h)/2-18*ease;
 c.globalAlpha=ease;c.shadowColor='#31271870';c.shadowBlur=35;c.fillStyle='#fcf4df';c.fillRect(x-18,y-18,w+36,h+66);c.shadowBlur=0;c.drawImage(im,x,y,w,h);
 c.fillStyle='#75654c';c.font='700 24px "Danyeo Memory","Batang",serif';c.textAlign='center';c.fillText('함께 있던 순간은 사진 안에 남았다.',960,y+h+36);
 c.restore();
}
// Hand coordinates are in the original sprite cell, never arbitrary world offsets.
const HAND={
 ej:{down:[[112,300],[110,307],[113,302],[118,296],[122,290],[117,298],[111,307],[106,315],[109,309]],left:[[232,286],[134,208],[134,228],[192,286],[270,262],[280,264],[262,284],[188,292],[140,210]],right:[[136,290],[96,270],[116,284],[154,290],[218,220],[240,218],[232,240],[172,288],[134,270]],up:[[235,300],[239,309],[235,303],[228,297],[223,290],[230,298],[237,307],[244,314],[240,310]]},
 dad:{down:[[130,303],[139,277],[137,310],[128,316],[125,285]],left:[[184,307],[212,301],[184,306],[145,287],[181,306]],right:[[179,307],[151,301],[179,306],[218,287],[181,306]],up:[[234,304],[230,278],[232,308],[237,316],[239,286]]}
};
export function handAnchor(a,m,col,height){let [x,y]=(HAND[a.id]?.[a.face]||HAND.dad.down)[col]||[180,300];const unit=m.cell[0]/360;x*=unit;y*=unit;const s=height/m.charHeight;return {x:a.x+(x-m.originX)*s,y:a.y+(y-m.soleY)*s,s,sx:x,sy:y};}
