import {pickFace} from './facing.js?v=17';
// 구역 시뮬레이션 — 입력 → 이동(층·계단 포함) → 위치 판정 → 이야기 진행. DOM 없음(브라우저·Node 공용).
// 그리기는 render.js가 이 상태를 읽기만 한다. 순간이동 없이 모든 인물이 실제로 걸어서 움직인다.
import { STAIRS, FLOOR2, STAIR_ENTER_Y, STAIR_LEN, SPOT, LOOKS, PX_PER_M, free, stairAt, other } from './zone.js?v=17';
import { route } from './nav.js?v=17';
import { HEIGHT } from './zone.js?v=17';
import './art_config.js?v=17';
import { makeGait, strideOf, gaitWalk, gaitRelease } from './gait.js?v=17';
import * as Seek from './seek.js?v=17';
import { L, LOOK_LINES } from './story.js?v=17';

// 속도 = 실제 m/s × 축척. 초1 걷기 약 1.15m/s(초당 약 2.4걸음), 친구 달리기 2.8m/s
export const SPEED = { ej: 1.15 * PX_PER_M, ym: 1.12 * PX_PER_M, fr: 2.8 * PX_PER_M, ss: 1.05 * PX_PER_M, gd: 0.85 * PX_PER_M, climb: 0.82 };
const MOUTH_Y = 676, STARTLE_R = 150, SHOE_LOOK_R = 260, SHOE_GLIMPSE_R = 560, TALK_R = 180, ASK_STAIR_R = 300;
const d2 = (a, b) => Math.hypot(a.x - b[0], a.y - b[1]);

function actor(id, x, y, face = 'down') { return { id, x, y, z: 0, lvl: 'g', stair: null, t: 0, face, moving: false, dist: 0, legs: null, goal: null, pose: null, poseFlip: false, speed: SPEED[id], arrived: true }; }

export function createSim(opts = {}) {
  const S = {
    t: 0, seek: Seek.initial(), talk: [], bark: null, card: null, script: [], ended: false, freeze: false, focus: null,
    a: { ej: actor('ej', ...SPOT.ejStart, 'up'), ym: actor('ym', ...SPOT.momCount, 'up'), fr: actor('fr', ...STAIRS.A.hide, 'right'),
         ss: actor('ss', ...SPOT.sisterPlay, 'right'), gd: actor('gd', ...SPOT.guardianSeat, 'down') },
    followDist: 160, lastFlee: -1, glimpsed: {}, looked: {}, log: [], playerPath: null, autoAct: null, momRepath: 0, hint3Said: false,
  };
  S.a.ym.pose = 'ym_count'; S.a.fr.pose = 'fr_hide'; S.a.gd.pose = 'gd_seated';
  if (opts.ejMeta?.gait) { S.gaitMeta = opts.ejMeta; S.a.ej.gait = makeGait(opts.ejMeta.gait); }   // 전달 시트의 보행 설정
  S.npcMeta = opts.npcMeta || {};
  for (const id of ['ym','fr','ss','gd']) if (S.npcMeta[id]?.gait) S.a[id].gait=makeGait(S.npcMeta[id].gait);
  say(S, L.intro);
  return S;
}

// ---------- 대화·말풍선·스크립트 ----------
export function say(S, lines, then) { for(const a of Object.values(S.a)){a.moving=false;if(a.gait){a.gait.mode='idle';a.gait.stopTarget=null;}} const ids=[...new Set(lines.map(l=>l[0]).filter(id=>S.a[id]))];const target=ids.find(id=>id!=='ej');if(target&&S.seek.stage!=='arrive'){const e=S.a.ej,n=S.a[target];e.face=n.x>e.x?'right':'left';if(!n.pose)n.face=e.x>n.x?'right':'left';}for (const l of lines) S.talk.push([...l]); if (then) S.talk[S.talk.length - 1][2] = then; }
function bark(S, who, text, sec = 2.6) { S.bark = { who, text, until: S.t + sec }; S.log.push({ t: +S.t.toFixed(2), bark: who, text }); }
function nextLine(S) { const l = S.talk.shift(); if (l?.[2]) l[2](); }
const ev = (S, e) => { S.log.push({ t: +S.t.toFixed(2), ...e }); };

// ---------- 이동: 층(g/st/2f)과 계단을 포함한 한 걸음 ----------
// (vx,vy) = 원하는 방향(크기 0~1). 반환: 실제로 움직인 거리(애니메이션 재생에 사용)
export function moveActor(a, vx, vy, dt, speed = a.speed) {
  if(a.id==='gd'&&a.lvl==='g'&&['up','down'].includes(pickFace(a.face,vx,vy,vx,vy)))speed*=.48;
  const m = Math.hypot(vx, vy); if (m < 0.05) { a.moving = false; return 0; }
  const ux = vx / Math.max(1, m), uy = vy / Math.max(1, m); let moved = 0;
  if (a.lvl === 'g') {
    const st = speed * dt, x0 = a.x, y0 = a.y;
    if (free(a.x + ux * st, a.y)) a.x += ux * st;
    if (free(a.x, a.y + uy * st)) a.y += uy * st;
    moved = Math.hypot(a.x - x0, a.y - y0);
    a.face = pickFace(a.face, x0 === a.x ? 0 : ux, y0 === a.y ? 0 : uy, ux, uy);
    const sid = stairAt(a.x, a.y);
    if (sid && uy < -0.4) { a.lvl = 'st'; a.stair = sid; a.t = 0; a.face = 'up'; }
  } else if (a.lvl === 'st') {
    const s = STAIRS[a.stair], dirT = uy < -0.2 ? 1 : uy > 0.2 ? -1 : 0;
    if (!dirT) { a.moving = false; return 0; }
    const dT = dirT * speed * SPEED.climb * dt / STAIR_LEN; a.t = Math.min(1, Math.max(0, a.t + dT)); moved = Math.abs(dT) * STAIR_LEN;
    a.x += (s.x - a.x) * Math.min(1, dt * 10); a.z = FLOOR2.z * a.t; a.y = (STAIR_ENTER_Y - 6) + (FLOOR2.y - (STAIR_ENTER_Y - 6)) * a.t; a.face = dirT > 0 ? 'up' : 'down';
    if (a.t >= 1) { a.lvl = '2f'; a.stair = null; a.y = FLOOR2.y; a.z = FLOOR2.z; }
    else if (a.t <= 0) { a.lvl = 'g'; a.stair = null; a.z = 0; a.y = STAIR_ENTER_Y - 2; }
  } else {   // 2층 복도: 좌우로만, 계단 위에서 아래 방향이면 내려감
    const st = speed * dt, x0 = a.x;
    if (Math.abs(ux) > 0.2) { a.x = Math.min(FLOOR2.x1, Math.max(FLOOR2.x0, a.x + Math.sign(ux) * st)); a.face = ux > 0 ? 'right' : 'left'; }
    moved = Math.abs(a.x - x0);
    if (uy > 0.4) for (const s of Object.values(STAIRS)) if (Math.abs(a.x - s.x) < 40) { a.lvl = 'st'; a.stair = s.id; a.t = 1; a.face = 'down'; a.x = s.x; break; }
  }
  a.moving = moved > 0.01; a.dist += moved; return moved;
}

// 네 방향 그림 선택(대각선 흔들림 방지): 한 축이 다른 축의 1.25배를 넘을 때만 그 축으로 바꾸고,
// 거의 대각선이면 지금 방향이 두 성분 중 하나일 때 유지(아니면 좌우 우선). 실제로 움직인 축을 우선해 벽에 막힌 축을 보지 않는다.
export {pickFace} from './facing.js?v=17';
// 목표까지 경로(legs)를 따라가는 방향 계산 → moveActor 재사용(NPC도 플레이어와 같은 규칙으로 걷는다)
export function goTo(a, goal) { a.goal = goal; a.legs = route(a, goal); a.arrived = !a.legs; if (a.legs) a.pose = null; return !!a.legs; }
function legDir(a, dt) {
  // Same-cell destinations and old saves may contain an empty ground leg.
  while(a.legs?.[0]?.kind==='g'&&!a.legs[0].pts?.length)a.legs.shift();
  const leg = a.legs?.[0]; if (!leg) return null;
  const st = a.speed * dt;
  if (leg.kind === 'g') {
    if (a.lvl !== 'g') return [0, a.lvl === 'st' ? 1 : 0];
    const p = leg.pts[0], dx = p[0] - a.x, dy = p[1] - a.y, d = Math.hypot(dx, dy);
    if (d <= Math.max(3, st)) { if (free(p[0], p[1])) { a.dist += d; a.x = p[0]; a.y = p[1]; } leg.pts.shift(); if (!leg.pts.length) a.legs.shift(); return [0, 0]; }
    return [dx / d, dy / d];
  }
  if (leg.kind === 'up') {
    if (a.lvl === '2f') { a.legs.shift(); return [0, 0]; }
    if (a.lvl === 'g') { const tx = leg.s.x, ty = STAIR_ENTER_Y - 8, dx = tx - a.x, dy = ty - a.y, d = Math.hypot(dx, dy); return d < 6 ? [0, -1] : [dx / d, dy / d]; }
    return [0, -1];
  }
  if (leg.kind === 'down') {
    if (a.lvl === 'g') { a.legs.shift(); return [0, 0]; }
    if (a.lvl === '2f') { const dx = leg.s.x - a.x; return Math.abs(dx) < 30 ? [0, 1] : [Math.sign(dx), 0]; }
    return [0, 1];
  }
  if (leg.kind === '2f') {
    if (a.lvl !== '2f') return [0, -1];
    const dx = leg.x - a.x; if (Math.abs(dx) <= Math.max(3, st)) { a.dist += Math.abs(dx); a.x = leg.x; a.legs.shift(); return [0, 0]; }
    return [Math.sign(dx), 0];
  }
  return null;
}
function stepNPC(a, dt) {
  if (!a.legs) { a.moving = false; return false; }
  const dir = legDir(a, dt);
  if (!a.legs.length) { a.legs = null; a.arrived = true; a.moving = false; return true; }
  if (dir) moveActor(a, dir[0], dir[1], dt);
  return true;
}
// 은재 보행(전달 시트가 있을 때): 이동 거리로 위상 진행, 놓으면 지나감 자세까지 걷고 서기, 막히면 바로 서기
const FACE_VEC = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
function playerGait(S, e, wanted, d0, dt, arrived = false) {
  const g = e.gait; if (!g) return;
  // 클릭 이동으로 목적지에 도착: 지나간 자리로 더 걷지 않고(클릭한 곳에 정확히 멈춤) 현재 자세를 70ms 유지한 뒤 서기
  if (!wanted && arrived && g.mode === 'walk') { g.mode = 'settle'; g.settle = 0; }
  const L = strideOf(S.gaitMeta, HEIGHT.ej), k = e.lvl === 'st' ? SPEED.climb : 1, expected = e.speed * k * dt;
  if (wanted) { const ok = gaitWalk(g, e.dist - d0, expected, L); e.moving = ok; return; }
  const before = e.dist;
  gaitRelease(g, dt, L, expected, want => { const v = FACE_VEC[e.face]; const b = e.dist; moveActor(e, v[0], v[1], dt, want / (k * dt)); return e.dist - b; });
  e.moving = g.mode === 'stopping' && e.dist > before;
}

// ---------- 상호작용: 지금 가능한 것 하나만 ----------
export function interactable(S) {
  if (S.talk.length || S.freeze || S.ended || S.card) return null;
  const e = S.a.ej, s = S.seek, list = []; if (e.lvl !== 'g') return null;
  const ym = S.a.ym, near = (p, r) => Math.hypot(p[0] - e.x, (p[1] - e.y) * 1.3) < r;
  if (s.stage === 'arrive' && near([ym.x, ym.y], TALK_R)) list.push({ id: 'meet', kind: 'talk', who: 'ym', label: '말 걸기', at: [ym.x, ym.y] });
  if (s.stage === 'seek') {
    const sid = nearestStair(e), canAsk = s.canAsk && ym.lvl === 'g' && near([ym.x, ym.y], TALK_R + 40);
    if (canAsk && s.momMode === 'guard') list.push({ id: 'cancel', kind: 'ask', who: 'ym', label: '같이 가자', at: [ym.x, ym.y] });
    else if (canAsk && sid) list.push({ id: 'ask', kind: 'ask', who: 'ym', label: `${sid === 'A' ? '왼쪽' : '오른쪽'} 계단 지켜 줘`, at: [ym.x, ym.y], sid });
    if (s.friendMode === 'hidden') { const sh = STAIRS[s.friendAt].shoe; if (near(sh, SHOE_LOOK_R) && !S.looked['shoe' + s.friendAt + s.flees]) list.push({ id: 'shoe', kind: 'look', who: null, label: '살펴보기', at: sh }); }
  }
  if (['arrive', 'seek'].includes(s.stage)) {
    if (near([S.a.ss.x, S.a.ss.y], TALK_R - 20)) list.push({ id: 'ss', kind: 'talk', who: 'ss', label: '말 걸기', at: [S.a.ss.x, S.a.ss.y] });
    if (near([S.a.gd.x, S.a.gd.y], TALK_R + 20)) list.push({ id: 'gd', kind: 'talk', who: 'gd', label: '말 걸기', at: [S.a.gd.x, S.a.gd.y] });
    for (const [k, o] of Object.entries(LOOKS)) if (near(o.at, o.r)) list.push({ id: 'look:' + k, kind: 'look', who: null, label: '살펴보기', at: o.at });
  }
  return list.map(o => ({ ...o, d: Math.hypot(o.at[0] - e.x, o.at[1] - e.y) })).sort((p, q) => (p.kind === 'ask' ? -1 : 0) - (q.kind === 'ask' ? -1 : 0) || p.d - q.d)[0] || null;
}
function nearestStair(e) { let best = null; for (const s of Object.values(STAIRS)) { const d = Math.hypot(e.x - s.x, e.y - MOUTH_Y); if (d < ASK_STAIR_R && (!best || d < best.d)) best = { id: s.id, d }; } return best?.id ?? null; }

export function act(S) {
  if (S.talk.length) return nextLine(S);
  if (S.card && S.t > S.card.minUntil) { S.card = null; return; }
  const it = interactable(S); if (!it) return; const s = S.seek, e = S.a.ej, ym = S.a.ym;
  ev(S, { act: it.id });
  if (it.id === 'meet') { ym.pose = null; ym.face = 'down'; say(S, L.meet, () => { Seek.meet(s); ev(S, { stage: 'seek' }); }); }
  else if (it.id === 'ss') { if (s.stage === 'seek') { S.a.ss.pose = 'ss_point'; S.a.ss.poseFlip = STAIRS[s.friendAt].x < S.a.ss.x; S.ssPointUntil = S.t + 3.5; s.clues.sister = true; say(S, L.ssPoint); } else say(S, L.ssBefore); }
  else if (it.id === 'gd') say(S, s.flees ? L.gdDuring : L.gdBefore);
  else if (it.id.startsWith('look:')) { const k = it.id.slice(5); bark(S, 'ej', LOOK_LINES[k]); S.looked[k] = true; }
  else if (it.id === 'shoe') { S.looked['shoe' + s.friendAt + s.flees] = true; Seek.sawShoe(s, s.friendAt); e.face = STAIRS[s.friendAt].x < e.x ? 'left' : 'right'; bark(S, 'ej', L.shoe, 2.4); }
  else if (it.id === 'ask') { Seek.ask(s, it.sid); S.followDist = 100; say(S, L.ask, () => { goTo(ym, { lvl: 'g', x: STAIRS[it.sid].guard[0], y: STAIRS[it.sid].guard[1] }); }); }
  else if (it.id === 'cancel') { Seek.follow(s); bark(S, 'ym', L.cancel); }
}
// 클릭/터치: 그 자리로 걸어감. 사람·물건을 누르면 다가가서 자동 실행
export function clickTo(S, x, y, target = null) {
  if (S.talk.length || S.card) return act(S);
  const e = S.a.ej; S.autoAct = target;
  const lvl = y < 300 ? '2f' : 'g';
  if (lvl === '2f') goTo(e, { lvl: '2f', x: Math.min(FLOOR2.x1, Math.max(FLOOR2.x0, x)) }); else goTo(e, { lvl: 'g', x, y: Math.max(530, y) });
}

// ---------- 한 프레임 ----------
export function step(S, input, dt) {
  S.t += dt; const s = S.seek, A = S.a, e = A.ej;
  const npcDistance={ym:A.ym.dist,fr:A.fr.dist,ss:A.ss.dist,gd:A.gd.dist};
  if (S.bark && S.t > S.bark.until) S.bark = null;
  runScript(S);
  // 플레이어
  const frozen = S.talk.length || S.freeze || S.ended || S.card, d0 = e.dist;
  let wanted = false, arrived = false;
  if (!frozen) {
    const kx = input.dx || 0, ky = input.dy || 0;
    if (kx || ky) { e.legs = null; S.autoAct = null; moveActor(e, kx, ky, dt); wanted = true; }
    else if (e.legs) { wanted = stepNPC(e, dt) && !!e.legs; arrived = !e.legs; if (!e.legs && S.autoAct) { const id = S.autoAct; S.autoAct = null; if (interactable(S)?.id === id) act(S); } }
    else e.moving = false;
    playerGait(S, e, wanted, d0, dt, arrived);
  } else if (e.legs && (S.freeze === 'walk')) { wanted = stepNPC(e, dt) && !!e.legs; playerGait(S, e, wanted, d0, dt, !e.legs); }
  else { e.moving = false; if (e.gait) { e.gait.mode = 'idle'; e.gait.stopTarget = null; } }
  // 다른 인물
  stepMom(S, dt); stepFriend(S, dt); stepNPC(A.ss, dt); stepNPC(A.gd, dt);
  for (const id of ['ym','fr','ss','gd']) {
    const a=A[id], g=a.gait, meta=S.npcMeta[id]; if(!g||!meta)continue;
    const moved=a.dist-npcDistance[id];
    if(moved>0.01) gaitWalk(g,moved,a.speed*dt,strideOf(meta,HEIGHT[id])*(meta.directionStrideScale?.[a.face]??1));
    else if(g.mode==='walk'){g.mode='settle';g.settle=0;}
    else if(g.mode==='settle'){g.settle+=dt;if(g.settle>=g.cfg.settleSeconds)g.mode='idle';}
  }
  if (S.ssPointUntil && S.t > S.ssPointUntil && s.stage === 'seek') { A.ss.pose = null; S.ssPointUntil = 0; }
  if (s.stage === 'seek') judge(S);
  if (s.stage === 'photo' && !S.ended && e.lvl === 'g' && Math.hypot(e.x - SPOT.photo.ej[0], e.y - SPOT.photo.ej[1]) < 45 && ['ym', 'fr', 'ss', 'gd'].every(k => A[k].arrived)) {
    S.shutterAt ??= S.t;S.freeze=true;for(const id of ['ej','ym','fr','ss']){A[id].face='down';A[id].moving=false;}A.gd.pose='gd_camera';
    if(S.t-S.shutterAt<5)return;
    S.ended = true; e.face = 'down'; e.moving = false; e.legs = null; ev(S, { stage: 'end' }); S.card = { text: L.end, minUntil: S.t + 1, end: true };
  }
}

function stepMom(S, dt) {
  const s = S.seek, m = S.a.ym, e = S.a.ej;
  if (s.stage === 'seek' && s.momMode === 'follow') {
    if (e.lvl !== 'g') { if (!m.legs && !m.waitSaid && Math.hypot(m.x - e.x, m.y - e.y) < 400) { m.waitSaid = true; bark(S, 'ym', L.momWaits, 1.8); } m.moving = false; m.face = 'up'; return; }
    m.waitSaid = false;
    // 따라가는 자리: 좌우로 걸을 땐 뒤쪽, 위·아래를 볼 땐 옆쪽(앞뒤로 겹쳐 은재를 가리지 않게). 옆쪽은 엄마가 이미 있는 편을 유지
    const side = m.x < e.x ? -1 : 1, horiz = e.face === 'left' || e.face === 'right';
    const tx = horiz ? e.x + (e.face === 'right' ? -1 : 1) * S.followDist : e.x + side * S.followDist * 0.85;
    const ty = Math.max(600, horiz ? e.y + 10 : e.y + 6), far = Math.hypot(tx - m.x, ty - m.y);
    if (far > 70 && (S.t > S.momRepath || !m.legs)) { S.momRepath = S.t + 0.5; m.speed = SPEED.ym; goTo(m, { lvl: 'g', x: tx, y: ty }); }
    if (far < 40 && m.legs) m.legs = null;
    stepNPC(m, dt); m.lookIdle=(m.moving||e.moving||m.legs)?0:(m.lookIdle||0)+dt; if(m.lookIdle>.25)m.face=pickFace(m.face,e.x-m.x,e.y-m.y,e.x-m.x,e.y-m.y);
    return;
  }
  if (s.stage === 'seek' && s.momMode === 'guard') {
    m.speed = SPEED.ym; stepNPC(m, dt);
    if (m.arrived && !s.posted && Seek.posted(s)) { m.pose = 'ym_guard'; bark(S, 'ym', L.posted, 2); }
    return;
  }
  m.speed = SPEED.ym; stepNPC(m, dt);
}

function stepFriend(S, dt) {
  const s = S.seek, f = S.a.fr;
  if (s.friendMode === 'flee') {
    stepNPC(f, dt);
    if (f.arrived && f.phase === 'toMouth') { f.phase='toTop';goTo(f,{lvl:'2f',x:STAIRS[other(s.friendAt)].x,via:s.friendAt}); }
    else if (f.arrived && f.phase === 'toTop') {
      const r = Seek.reachOtherTop(s);
      if (r?.type === 'trapped') {
        f.phase = 'trapped'; const from = STAIRS[s.friendAt].x, to = STAIRS[other(s.friendAt)].x; goTo(f, { lvl: '2f', x: Math.round(to + (from - to) * 0.45) });
        bark(S, 'fr', L.trappedFr, 2.2); S.pendingBark = { at: S.t + 2.3, who: 'ym', text: L.trappedYm };
      } else { f.phase = 'down'; goTo(f, { lvl: 'g', x: STAIRS[other(s.friendAt)].x, y: STAIR_ENTER_Y + 20 }); }
    } else if (f.arrived && f.phase === 'down') {
      const st=STAIRS[other(s.friendAt)]; f.phase='toHide';goTo(f,{lvl:'g',x:st.hide[0],y:st.hide[1]});
    } else if(f.arrived && f.phase==='toHide') {
      Seek.hidAgain(s); const st = STAIRS[s.friendAt]; f.pose = 'fr_hide'; f.face = st.side > 0 ? 'left' : 'right'; f.phase = null;
      S.freeze = false; S.focus = null; afterFlee(S);
    }
    return;
  }
  if (s.friendMode === 'trapped') { stepNPC(f, dt); if (f.arrived && S.freeze) { S.freeze = false; S.focus = null; } return; }
  stepNPC(f, dt);
}
function afterFlee(S) {
  const s = S.seek, m = S.a.ym, lvl = Seek.hintLevel(s, 0);
  if (s.momMode === 'guard') return;
  if (lvl <= 1) bark(S, 'ym', L.hint1, 3.2); else if (lvl === 2) bark(S, 'ym', L.hint2, 3.4); else if (!S.hint3Said) { S.hint3Said = true; say(S, L.hint3); }
  void m;
}

function judge(S) {
  const s = S.seek, e = S.a.ej, m = S.a.ym, f = S.a.fr;
  if (S.pendingBark && S.t > S.pendingBark.at) { bark(S, S.pendingBark.who, S.pendingBark.text, 2.6); S.pendingBark = null; }
  if (s.friendMode === 'hidden') {
    const st = STAIRS[s.friendAt], mouth = [st.x, MOUTH_Y];
    // 시선 피드백: 신발이 가까이 보이면 은재가 그쪽을 본다(한 번)
    const key = s.friendAt + s.flees;
    if (!S.glimpsed[key] && e.lvl === 'g' && !e.moving && d2(e, st.shoe) < SHOE_GLIMPSE_R) { S.glimpsed[key] = true; e.face = Math.abs(st.shoe[0] - e.x) > Math.abs(st.shoe[1] - e.y) ? (st.shoe[0] > e.x ? 'right' : 'left') : 'up'; bark(S, 'ej', L.shoeGlimpse, 1.6); }
    const ejNear = (e.lvl === 'g' && (d2(e, mouth) < STARTLE_R || d2(e,st.hide)<105)) || (e.stair === s.friendAt);
    const momNear = m.lvl === 'g' && !(s.momMode === 'guard' && s.posted) && s.stage === 'seek' && s.momMode !== 'count' && d2(m, mouth) < STARTLE_R && (s.momMode === 'guard');
    if (ejNear || momNear) {
      const r = Seek.startle(s, s.friendAt, ejNear ? 'ej' : 'ym');
      if (r) {
        S.lastFlee = S.t; bark(S, 'fr', L.flee, 1.6); if (!ejNear) { Seek.spoiled(s); m.legs = null; m.pose = null; S.pendingBark = { at: S.t + 1.8, who: 'ym', text: L.wrongSide }; } f.pose = null; f.speed = SPEED.fr; f.phase = 'toMouth';
        // Walk around the physical return wall; never teleport out of a column.
        goTo(f, { lvl: 'g', x: st.x, y: STAIR_ENTER_Y + 20 }); S.freeze = 'watch'; S.focus = 'fr'; e.legs = null; e.moving = false;
      }
    }
  } else if (s.friendMode === 'trapped' && !S.freeze) {
    const close = (e.lvl === '2f' && Math.abs(e.x - f.x) < 120) || (e.lvl === 'st' && e.t > 0.8 && Math.abs(STAIRS[e.stair].x - f.x) < 160);
    if (close && Seek.catchFriend(s)) { f.pose = 'fr_caught'; f.face = e.x < f.x ? 'left' : 'right'; ev(S, { stage: 'found' }); say(S, L.found, () => startGather(S)); }
  }
  if (s.flees && s.momMode === 'follow' && !S.hint3Said && S.t - S.lastFlee > 40 && !S.talk.length) { S.hint3Said = true; Seek.hintLevel(s, 41); say(S, L.hint3); }
}

// ---------- 마무리: 셋이 모이기 → 약속 → 사진 자리 ----------
function startGather(S) {
  const s = S.seek, A = S.a, G = SPOT.gather; s.stage = 'gather'; ev(S, { stage: 'gather' });
  A.fr.pose = null; A.ym.pose = null; A.fr.speed = SPEED.ym; A.ym.speed = SPEED.ym; A.ej.speed = SPEED.ej;
  S.freeze = 'walk'; S.focus = 'ej';
  goTo(A.ej, { lvl: 'g', x: G.ej[0], y: G.ej[1] }); goTo(A.fr, { lvl: 'g', x: G.fr[0], y: G.fr[1] }); goTo(A.ym, { lvl: 'g', x: G.ym[0], y: G.ym[1] });
  S.script = [
    { wait: () => A.ej.arrived && A.fr.arrived && A.ym.arrived, timeout: 40 },
    { run: () => { S.freeze = false; S.focus = null; A.ej.face = 'right'; A.ym.face = 'left'; A.fr.face = 'up'; } },
    { talk: L.gather },
    { run: () => { S.card = { text: L.pinky, minUntil: S.t + 1.2 }; A.ss.speed = SPEED.ss * 1.3; goTo(A.ss, { lvl: 'g', x: G.ss[0], y: G.ss[1] }); } },
    { wait: () => !S.card && A.ss.arrived, timeout: 30 },
    { run: () => { A.ss.face = 'right'; } }, { talk: L.sisterJoin },
    { run: () => { A.gd.pose = null; goTo(A.gd, { lvl: 'g', x: SPOT.photoCamera[0], y: SPOT.photoCamera[1] }); } },
    { talk: L.camera },
    { run: () => { s.stage = 'photo'; ev(S, { stage: 'photo' }); const P = SPOT.photo; for (const k of ['ym', 'fr', 'ss']) goTo(A[k], { lvl: 'g', x: P[k][0], y: P[k][1] }); } },
  ];
}
function runScript(S) {
  if(S.card)return; // Player acknowledgement is never skipped by a timeout.
  while (S.script.length) {
    const st = S.script[0];
    if (st.run) { S.script.shift(); st.run(); continue; }
    if (st.talk) { if (!st.said) { st.said = true; say(S, st.talk); } if (S.talk.length) return; S.script.shift(); continue; }
    if (st.wait) { st.t0 ??= S.t; if (st.wait() || S.t - st.t0 > st.timeout) { if (!st.wait()) ev(S, { warn: 'script wait timeout' }); S.script.shift(); continue; } return; }
    S.script.shift();
  }
  if (S.seek.stage === 'photo' && S.a.gd.arrived && S.a.gd.pose !== 'gd_camera') { S.a.gd.pose = 'gd_camera'; S.a.gd.poseFlip = false; S.a.gd.face = 'left'; }
}
