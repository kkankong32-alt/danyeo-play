// Stable four-direction facing: keep the current diagonal quadrant until the dominant axis clearly changes.
export function pickFace(cur, mx, my, ux, uy) {
  const vx = mx || (my ? 0 : ux), vy = my || (mx ? 0 : uy), ax = Math.abs(vx), ay = Math.abs(vy);
  if (ax < 0.05 && ay < 0.05) return cur;
  const h = vx > 0 ? 'right' : 'left', v = vy > 0 ? 'down' : 'up';
  if (ax > ay * 1.25) return h; if (ay > ax * 1.25) return v;
  if ((ax > 0.05 && cur === h) || (ay > 0.05 && cur === v)) return cur;
  return ax > 0.05 ? h : v;
}
