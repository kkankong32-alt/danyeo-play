// 회색 상자 그리기. 시뮬레이션 상태를 읽기만 한다.
// 레이어 순서: 바닥·건물 → 2층 인물 → 2층 난간·1층 천장(계단 통로는 뚫림) → [정렬: 소품·인물·신발(발 y 기준)] → 나무 잎 → 앞 담장 → 말풍선·안내.
import { WORLD, VIEW, HEIGHT, STAIRS, FLOOR2, PROPS, PARAPET, OVERHANG, CANOPY, FRONT_WALL, LOOKS, PX_PER_M, ARCH } from './zone.js';
import { NAME, objective } from './story.js';
import { interactable } from './sim.js';
import { gaitColumn, gaitIndex } from './gait.js';

export const FOOTLOCK_DEFAULT = 0.5;   // 0 = 몸 이동 매끈(발 약간 미끄러짐), 1 = 디딘 발 고정(몸이 프레임마다 끊겨 이동)
const FONT = '"Noto Sans KR","Malgun Gothic","WenQuanYi Zen Hei",sans-serif';

export function frameOf(a, meta, footlock = FOOTLOCK_DEFAULT) {
  const row = Math.max(0, meta.rows.indexOf(a.face)), H = HEIGHT[a.id], sc = H / meta.charHeight;
  // 전달 보행 시트: 열은 sim의 보행 위상에서만 정한다. 발 보정 없음(footlock 0) — 모든 칸이 같은 발 기준점이라 그대로 그린다.
  if (a.gait) { const k = a.gait.mode === 'idle' ? -1 : gaitIndex(a.gait); return { row, col: gaitColumn(a.gait, meta), sc, off: [0, 0], walkIdx: k }; }
  if (meta.footlock != null) footlock = meta.footlock;          // 시트가 정한 보정값이 우선(이중 보정 방지)
  if (['ym','fr'].includes(a.id)) { const n=meta.walkCols.length;const k=Math.floor((a.dist/(meta.cyclePx*sc)%1)*n);return {row,col:a.moving?meta.walkCols[k]:meta.standCol,sc,off:[0,0],walkIdx:a.moving?k:-1}; }
  if (!a.moving) { a._d0 = null; return { row, col: meta.standCol, sc, off: [0, 0], walkIdx: -1 }; }
  if (a._d0 == null) a._d0 = a.dist;                                      // 출발: 접지 프레임부터
  const n = meta.walkCols.length, cyc = meta.cyclePx * sc, ph = ((a.dist - a._d0) / cyc) % 1, k = Math.floor(ph * n), frac = ph * n - k;
  const back = (cyc / n) * frac * footlock, dir = { left: [1, 0], right: [-1, 0], up: [0, 0], down: [0, 0] }[a.face] || [0, 0];
  return { row, col: meta.walkCols[k], sc, off: a.lvl === 'st' ? [0, 0] : [dir[0] * back, dir[1] * back], walkIdx: k };
}

export function createRenderer(ctx, assets, opts = {}) {
  const R = { cam: { x: 600, y: 600 }, footlock: opts.footlock ?? FOOTLOCK_DEFAULT, debug: false, hide: null, zoom: opts.zoom ?? 1, camLock: null };
  const VW = () => VIEW.w / R.zoom, VH = () => VIEW.h / R.zoom;   // 카메라가 보는 월드 크기(확대하면 좁아짐). UI는 화면 좌표라 확대와 무관
  const scr = a => [a.x, a.y - a.z];

  function updateCamera(S, dt) {
    if (R.camLock) { R.cam.x = Math.max(0, Math.min(WORLD.w - VW(), R.camLock[0] - VW() / 2)); R.cam.y = Math.max(-240, Math.min(WORLD.h - VH(), R.camLock[1] - VH() / 2)); return; }
    const f = S.focus ? S.a[S.focus] : S.a.ej, [fx, fy] = scr(f);
    const look = f.moving ? { left: [-140, 0], right: [140, 0], up: [0, -90], down: [0, 90] }[f.face] : [0, 0];
    let tx = fx + look[0] - VW() / 2, ty = fy - HEIGHT.ej * 0.5 + look[1] - VH() / 2;
    const dz = S.focus ? 0 : 1, cx = R.cam.x + VW() / 2, cy = R.cam.y + VH() / 2;     // 데드존(가운데 320×180에서는 안 움직임)
    const fr = S.a.fr, both = !S.focus && S.seek.friendMode === 'trapped' && f.lvl !== '2f';
    if (both) { tx = (fx + fr.x) / 2 - VW() / 2; ty = Math.min(ty, fr.y - fr.z - HEIGHT.fr - 90); }   // 갇힌 친구(2층)와 은재를 함께 담음
    else if (dz) { const ex = fx + look[0] - cx, ey = fy - HEIGHT.ej * 0.5 + look[1] - cy; tx = Math.abs(ex) < 160 ? R.cam.x : R.cam.x + ex - Math.sign(ex) * 160; ty = Math.abs(ey) < 90 ? R.cam.y : R.cam.y + ey - Math.sign(ey) * 90; }
    const k = 1 - Math.pow(S.focus ? 0.88 : 0.9, dt * 60);
    R.cam.x += (Math.max(0, Math.min(WORLD.w - VW(), tx)) - R.cam.x) * k; R.cam.y += (Math.max(-240, Math.min(WORLD.h - VH(), ty)) - R.cam.y) * k;
  }
  function snapCamera(S) { const [x, y] = scr(S.a.ej); R.cam.x = Math.max(0, Math.min(WORLD.w - VW(), x - VW() / 2)); R.cam.y = Math.max(0, Math.min(WORLD.h - VH(), y - 100 - VH() / 2)); }

  // ---- 바닥·건물(회색 상자) ----
  const layerBounds=Object.fromEntries(assets.scene.layers.map(l=>[l.id,l.bounds||[0,-260,3200,1804]]));
  const layer = id => {if(id==='stair_A_return_v01'||id==='stair_B_return_v01'){const a=id.includes('_A_'),src=a?'stair_A_connected_v01':'stair_B_connected_v01',b=a?[1018,505,1062,680]:[2138,505,2182,680];ctx.drawImage(assets.layerImages[src],b[0],b[1]+260,b[2]-b[0],b[3]-b[1],b[0],b[1],b[2]-b[0],b[3]-b[1]);return;} const b=layerBounds[id]||[0,-260,3200,1804],x=Math.max(b[0],R.cam.x-2),y=Math.max(b[1],R.cam.y-2),r=Math.min(b[2],R.cam.x+VW()+2),d=Math.min(b[3],R.cam.y+VH()+2);if(r>x&&d>y)ctx.drawImage(assets.layerImages[id],x,y+260,r-x,d-y,x,y,r-x,d-y); };
  function base(){ctx.save();ctx.translate(0,3608);ctx.scale(1,-1);ctx.drawImage(assets.layerImages.base,0,1924,3200,140,0,1664,3200,140);ctx.restore();layer('base');for(const l of assets.scene.layers)if(l.kind==='behindActors')layer(l.id);}
  function overlays(){for(const l of assets.scene.layers)if(l.kind==='over2f')layer(l.id);}
  function prop(p,alpha=1){ctx.save();ctx.globalAlpha=alpha;layer(p.id);ctx.restore();}
  const shade = (hex, k) => { const n = parseInt(hex.slice(1), 16); const c = [n >> 16, (n >> 8) & 255, n & 255].map(v => Math.max(0, Math.min(255, Math.round(v * k)))); return `rgb(${c.join(',')})`; };

  function drawActor(S, a, alpha = 1) {
    if (R.hide === a.id) return;
    const [x, y] = scr(a), H = HEIGHT[a.id];
    ctx.save(); ctx.globalAlpha = 0.28 * alpha; ctx.fillStyle = '#3c2e1e'; ctx.beginPath(); ctx.ellipse(x, a.lvl === 'st' ? y : y, H * 0.17, H * 0.045, 0, 0, 7); ctx.fill(); ctx.restore();
    ctx.globalAlpha = alpha;
    if (a.pose) {
      const pk = a.pose==='ss_point' ? (a.poseFlip?'ss_point_left':'ss_point') : (a.pose==='fr_hide'||a.pose==='fr_caught'||a.pose==='ym_guard') && a.face==='right' ? a.pose+'_right':a.pose; const im = assets.poses[pk], meta = assets.walk[a.id], sc = H / meta.charHeight, [cw, ch] = [im.width, im.height];
      ctx.save(); ctx.translate(x, y); if (a.poseFlip && !['ym','fr','ss'].includes(a.id)) ctx.scale(-1, 1); ctx.drawImage(im, -cw / 2 * sc, -meta.soleY * sc, cw * sc, ch * sc); ctx.restore();
    } else if(a.id==='fr' && S.seek.friendMode==='flee' && a.lvl==='2f' && a.moving) {
      const sc=H/420,row=a.face==='right'?1:0,col=Math.floor((a.dist/(480*sc)%1)*4);ctx.drawImage(assets.frRun,col*360,row*480,360,480,x-180*sc,y-450*sc,360*sc,480*sc);
    } else {
      const meta = assets.walk[a.id], img = assets.walkImg[a.id], f = frameOf(a, meta, R.footlock), [cw, ch] = meta.cell;
      ctx.drawImage(img, (S.talk.length&&!a.moving?meta.standCol:f.col) * cw, f.row * ch, cw, ch, x + f.off[0] - meta.originX * f.sc, y + f.off[1] - meta.soleY * f.sc, cw * f.sc, ch * f.sc);
      a._walkIdx = f.walkIdx;
    }
    ctx.globalAlpha = 1;
    if (R.tags) { ctx.fillStyle = 'rgba(30,26,20,.75)'; ctx.font = `500 18px ${FONT}`; const t = NAME[a.id], w = ctx.measureText(t).width; ctx.fillText(t, x - w / 2, y + 26); }
  }
  function shoe(S) {} // The clue is now the actual crouching actor's shoe, not a detached prop.

  function draw(S, dt) {
    updateCamera(S, dt);
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, VIEW.w, VIEW.h);
    const Z = R.zoom; ctx.setTransform(Z, 0, 0, Z, -Math.round(R.cam.x * Z), -Math.round(R.cam.y * Z));
    base();
    const A = Object.values(S.a);
    for (const a of A) if (a.lvl === '2f') drawActor(S, a);
    overlays();
    const L = [];
    // Actual lower flight occludes ground actors behind it; stair actors sort in front.
    L.push({y:645,draw:()=>{ctx.drawImage(assets.layerImages.stair_A_connected_v01,783,790,235,115,783,530,235,115);}});
    L.push({y:1790,draw:()=>layer('L5_front_v01')});
    for (const p of PROPS) L.push({ y: p.foot[3], draw: () => prop(p, p.kind === 'pyeongsang' ? 1 : 1) });
    for (const a of A) if (a.lvl !== '2f') L.push({ y: a.lvl === 'st' ? 659 : a.y, a, draw: () => drawActor(S, a) });
    L.push({ y: STAIRS.A.shoe[1], draw: () => shoe(S) });
    L.sort((p, q) => p.y - q.y); for (const o of L) o.draw();
    // 가려진 은재: 큰 물체 뒤에 있으면 반투명 실루엣을 위에 한 번 더(위치를 잃지 않게)
    const e = S.a.ej; if (e.lvl === 'g' && occluded(e)) drawActor(S, e, 0.35);
    // 나무 잎(머리 위). 아래에 인물이 있으면 반투명
    const canopy=assets.scene.layers.find(l=>l.kind==='overhead').coverage;
    const under = A.some(a => a.lvl === 'g' && a.x+HEIGHT[a.id]*.25>canopy[0] && a.x-HEIGHT[a.id]*.25<canopy[2] && a.y>canopy[1] && a.y-HEIGHT[a.id]<canopy[3]);
    ctx.save();ctx.globalAlpha=under?.42:1;layer('L4_canopy_v01');ctx.restore();
    if (R.debug) debugOverlay(S);
    // 말풍선·안내(월드 좌표 → 화면 안으로 고정)
    const it = interactable(S); if (it && R.dev) outline(S, it);
    ctx.setTransform(1, 0, 0, 1, 0, 0); const toS = ([x, y]) => [(x - R.cam.x) * Z, (y - R.cam.y) * Z];   // 말풍선은 화면 좌표(확대와 무관한 글자 크기)
    if (it && R.dev && !S.bark) { const [hx, hy] = toS(it.who ? head(S.a[it.who]) : [it.at[0], it.at[1] - 70]); bubble(hx, hy, `E · ${it.who?NAME[it.who]+' · ':''}${it.label}`, '#fff3c4'); }
    if (S.bark) { const [hx, hy] = toS(head(S.a[S.bark.who])); bubble(hx, hy, S.bark.text, '#fffaf0'); }
    hud(S);
  }
  const head = a => { const [x, y] = scr(a); return [x, y - HEIGHT[a.id] - 6]; };
  function occluded(e) {
    for (const p of PROPS) { const [x0, , x1, y1] = p.foot; if (y1 > e.y && e.x > x0 - 10 && e.x < x1 + 10 && e.y - HEIGHT.ej * 0.5 > y1 - p.h - 10 && p.kind !== 'flowerbed' && p.kind !== 'pyeongsang') return true; }
    return false;
  }
  function outline(S, it) {
    ctx.save(); ctx.strokeStyle = 'rgba(255,214,90,.9)'; ctx.lineWidth = 4; ctx.setLineDash([10, 8]);
    if (it.who) { const a = S.a[it.who], [x, y] = scr(a), H = HEIGHT[a.id]; ctx.strokeRect(x - H * 0.32, y - H - 4, H * 0.64, H + 10); }
    else { ctx.beginPath(); ctx.ellipse(it.at[0], it.at[1] - 10, 48, 26, 0, 0, 7); ctx.stroke(); }
    ctx.restore();
  }
  function bubble(x, y, text, tone) {
    ctx.font = `600 26px ${FONT}`; const w = ctx.measureText(text).width + 34, h = 46;
    const minX = 12, maxX = VIEW.w - w - 12, minY = 96, maxY = VIEW.h - h - 170;
    const bx = Math.max(minX, Math.min(maxX, x - w / 2)), by = Math.max(minY, Math.min(maxY, y - 62));
    ctx.fillStyle = tone; ctx.strokeStyle = '#3b2f22'; ctx.lineWidth = 2; ctx.beginPath(); ctx.roundRect(bx, by, w, h, 14); ctx.fill(); ctx.stroke();
    const tx = Math.max(bx + 16, Math.min(bx + w - 16, x)); if (by + h < y) { ctx.beginPath(); ctx.moveTo(tx - 9, by + h); ctx.lineTo(tx, by + h + 14); ctx.lineTo(tx + 9, by + h); ctx.fill(); }
    ctx.fillStyle = '#2b241b'; ctx.fillText(text, bx + 17, by + 32);
    R.lastBubble = { x: bx, y: by, w, h };
  }
  function hud(S) {
    ctx.setTransform(1,0,0,1,0,0);
    function panel(x,y,w,h,fill='#f7efddeb'){ctx.fillStyle=fill;ctx.strokeStyle='#c6b48e';ctx.lineWidth=1.5;ctx.beginPath();ctx.roundRect(x,y,w,h,12);ctx.fill();ctx.stroke();}
    function lines(text,maxWidth,font){ctx.font=font;const rows=[];let row='';for(const ch of text){if(ch==='\n'||(row&&ctx.measureText(row+ch).width>maxWidth)){rows.push(row);row=ch==='\n'?'':ch;}else row+=ch;}if(row)rows.push(row);return rows;}
    const o=objective(S);
    if(R.dev&&o&&!S.talk.length&&!S.card){ctx.font=`500 27px ${FONT}`;const w=Math.min(1040,ctx.measureText(o).width+54);panel(28,24,w,80);ctx.fillStyle='#786644';ctx.font=`600 18px ${FONT}`;ctx.fillText('지금 할 일',48,52);ctx.fillStyle='#30291f';ctx.font=`500 27px ${FONT}`;ctx.fillText(o,48,86);}
    if(S.talk.length&&!R.domDialogue){const [who,text]=S.talk[0];const font=`500 32px ${FONT}`,rows=lines(text,1390,font),h=78+rows.length*43,y=VIEW.h-h-26;panel(190,y,1540,h,'#faf2e4f5');ctx.fillStyle='#675036';ctx.font=`700 24px ${FONT}`;ctx.fillText(NAME[who]||who,224,y+37);ctx.fillStyle='#27241e';ctx.font=font;rows.forEach((line,i)=>ctx.fillText(line,224,y+82+i*43));ctx.fillStyle='#76674e';ctx.font=`500 20px ${FONT}`;if(!R.watching)ctx.fillText('E  계속',1605,y+h-23);}
    if(S.card){panel(385,855,1150,175,'#faf2e7fa');ctx.textAlign='center';ctx.fillStyle='#332b22';ctx.font=`600 40px ${FONT}`;ctx.fillText(S.card.text,960,920);ctx.font=`500 26px ${FONT}`;ctx.fillStyle='#6b5c46';ctx.fillText(S.card.end?'R · 다시 놀기':'E · 계속',960,990);ctx.textAlign='left';}
    if(R.dev){ctx.fillStyle='#233b32da';ctx.fillRect(24,VIEW.h-34,550,26);ctx.fillStyle='#f4e8c7';ctx.font=`400 17px ${FONT}`;ctx.fillText('개발자 모드 · 표시 키 미확정 · F1 충돌',34,VIEW.h-14);}
  }
  function debugOverlay(S) {
    ctx.save(); ctx.globalAlpha = 0.35;
    for (const b of (assets.BLOCKED || [])) { ctx.fillStyle = '#e04030'; ctx.fillRect(b[0], b[1], b[2] - b[0], b[3] - b[1]); }
    for (const s of Object.values(STAIRS)) { ctx.fillStyle = '#f0c030'; ctx.fillRect(s.x - s.hw, 530, s.hw * 2, 130); ctx.strokeStyle = '#f0a000'; ctx.beginPath(); ctx.arc(s.x, 676, 150, 0, 7); ctx.stroke(); ctx.fillStyle = '#d020c0'; ctx.fillRect(s.guard[0] - 8, s.guard[1] - 8, 16, 16); }
    for (const o of Object.values(LOOKS)) { ctx.strokeStyle = '#3070e0'; ctx.beginPath(); ctx.arc(o.at[0], o.at[1], o.r, 0, 7); ctx.stroke(); }
    ctx.globalAlpha = 1; for (const a of Object.values(S.a)) { const [x, y] = scr(a); ctx.fillStyle = '#000'; ctx.fillRect(x - 3, y - 3, 6, 6); }
    ctx.restore();
  }
  return { R, draw, snapCamera, updateCamera };
}
