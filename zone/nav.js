// 길찾기: 바닥은 16px 격자 A*(8방향, 모서리 끼어들기 금지) + 시야가 트인 점만 남김. 층이 다르면 계단을 거친다.
import { free, STAIRS, FLOOR2, STAIR_ENTER_Y } from './zone.js?v=16';

const grids=new Map();
function pushHeap(h,v){let i=h.length;h.push(v);while(i){const p=(i-1)>>1;if(h[p][0]<=v[0])break;h[i]=h[p];i=p;}h[i]=v;}
function popHeap(h){const first=h[0],v=h.pop();if(h.length){let i=0;while(i*2+1<h.length){let c=i*2+1;if(c+1<h.length&&h[c+1][0]<h[c][0])c++;if(h[c][0]>=v[0])break;h[i]=h[c];i=c;}h[i]=v;}return first;}

export function lineFree([x0, y0], [x1, y1], step = 6) {
  const n = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0) / step));
  for (let i = 1; i <= n; i++) if (!free(x0 + (x1 - x0) * i / n, y0 + (y1 - y0) * i / n)) return false;
  return true;
}
export function groundPath(start, goal, C = 16) {
  if(lineFree(start,goal))return [goal];
  const gw = Math.ceil(3200 / C), gh = Math.ceil(1940 / C), idx = (i, j) => j * gw + i, ctr = (i, j) => [i * C + C / 2, j * C + C / 2];
  let grid=grids.get(C);if(!grid){grid=new Uint8Array(gw*gh);for(let j=0;j<gh;j++)for(let i=0;i<gw;i++)grid[idx(i,j)]=+free(...ctr(i,j));grids.set(C,grid);}
  const ok=(i,j)=>i>=0&&j>=0&&i<gw&&j<gh&&grid[idx(i,j)]===1;
  const cell = ([x, y]) => [Math.floor(x / C), Math.floor(y / C)];
  let [gi, gj] = cell(goal);
  if (!ok(gi, gj)) { let best = null; for (let r = 1; r <= 8 && !best; r++) for (let dj = -r; dj <= r; dj++) for (let di = -r; di <= r; di++) if (Math.max(Math.abs(di), Math.abs(dj)) === r && ok(gi + di, gj + dj)) { const d = Math.hypot(di, dj); if (!best || d < best[2]) best = [gi + di, gj + dj, d]; } if (!best) return null; [gi, gj] = best; }
  let [si, sj] = cell(start); if (!ok(si, sj)) { for (const [di, dj] of [[0, 1], [0, -1], [1, 0], [-1, 0], [1, 1], [-1, 1], [1, -1], [-1, -1]]) if (ok(si + di, sj + dj)) { si += di; sj += dj; break; } }
  const G = new Map([[idx(si, sj), 0]]), from = new Map(), open = [[0, si, sj]], closed = new Set();
  const h = (i, j) => { const dx = Math.abs(i - gi), dy = Math.abs(j - gj); return Math.max(dx, dy) + 0.414 * Math.min(dx, dy); };
  let found = false, guard = 0;
  while (open.length && guard++ < 40000) {
    const [, i, j] = popHeap(open), k0 = idx(i, j); if (closed.has(k0)) continue; closed.add(k0);
    if (i === gi && j === gj) { found = true; break; }
    for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) {
      if (!di && !dj) continue; const ni = i + di, nj = j + dj;
      if (!ok(ni, nj) || (di && dj && (!ok(i + di, j) || !ok(i, j + dj)))) continue;
      const k = idx(ni, nj), g = G.get(k0) + (di && dj ? 1.414 : 1);
      if (g < (G.get(k) ?? Infinity)) { G.set(k, g); from.set(k, k0); pushHeap(open,[g + h(ni, nj), ni, nj]); }
    }
  }
  if (!found) return null;
  const cells = []; for (let k = idx(gi, gj); k !== undefined; k = from.get(k)) { cells.push(ctr(k % gw, Math.floor(k / gw))); if (k === idx(si, sj)) break; }
  cells.reverse(); cells[0] = start;
  const end = free(...goal) ? goal : cells[cells.length - 1]; cells[cells.length - 1] = end;
  const out=[];let anchor=start,i=1;while(i<cells.length){let j=i;while(j+1<cells.length&&lineFree(anchor,cells[j+1]))j++;out.push(cells[j]);anchor=cells[j];i=j+1;}return out.length?out:[end];
}
// 층을 넘는 경로: [{kind:'g', pts}, {kind:'up', s}, {kind:'2f', x}, {kind:'down', s}, ...]
export function route(a, goal) {
  const legs = [], here = { lvl: a.lvl, x: a.x, y: a.y, stair: a.stair };
  const pickStair = (x0, x1) => goal.via ? STAIRS[goal.via] : Object.values(STAIRS).sort((p, q) => (Math.abs(x0 - p.x) + Math.abs(x1 - p.x)) - (Math.abs(x0 - q.x) + Math.abs(x1 - q.x)))[0];
  if (here.lvl === 'st') {   // 계단 위: 목표가 2층이면 올라가고, 아니면 내려간다
    legs.push({ kind: goal.lvl === '2f' ? 'up' : 'down', s: STAIRS[here.stair] });
    here.lvl = goal.lvl === '2f' ? '2f' : 'g'; here.x = STAIRS[here.stair].x; here.y = goal.lvl === '2f' ? FLOOR2.y : STAIR_ENTER_Y + 4;
  }
  if (here.lvl === 'g' && goal.lvl === '2f') {
    const s = pickStair(here.x, goal.x), p = groundPath([here.x, here.y], [s.x, STAIR_ENTER_Y + 6]); if (!p) return null;
    legs.push({ kind: 'g', pts: p }, { kind: 'up', s }, { kind: '2f', x: goal.x }); return legs;
  }
  if (here.lvl === '2f' && goal.lvl === 'g') {
    const s = pickStair(here.x, goal.x); legs.push({ kind: '2f', x: s.x }, { kind: 'down', s });
    const p = groundPath([s.x, STAIR_ENTER_Y + 4], [goal.x, goal.y]); if (!p) return null; legs.push({ kind: 'g', pts: p }); return legs;
  }
  if (here.lvl === '2f') { legs.push({ kind: '2f', x: goal.x }); return legs; }
  const p = groundPath([here.x, here.y], [goal.x, goal.y]); if (!p) return null; legs.push({ kind: 'g', pts: p }); return legs;
}
