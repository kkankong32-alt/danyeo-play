// 은재 보행 위상 — 코덱스 전달 참조 구현(preview_controller.js)의 의미를 sim 구조에 옮김. DOM 없음.
// - 위상(phase)은 실제 이동 거리로만 진행: phase += 이동거리 / 한 주기 길이(L = cyclePx × 표시키 ÷ charHeight). 시간 기반 재생 없음.
// - 시작 위상 .25(지나감), 방향 전환·재출발 때 위상 유지(초기화 없음).
// - 입력을 놓으면 다음 지나감 위상(.25/.75)까지 진행 방향으로 계속 걷고, 70ms 머문 뒤 서기. 이미 지나감 자세면 바로 머묾.
// - 실제로 움직이지 못하면(충돌·경계) 그 자리에서 바로 서기(발만 걷지 않음).
// - (게임 적용 추가) 클릭 이동의 도착은 더 걷지 않고 70ms 뒤 서기 — 클릭한 지점·대화 대상에 정확히 멈추기 위함. 키보드 놓기는 위 규칙 그대로.
export function makeGait(cfg) { return { cfg, phase: cfg.startPhase ?? 0.25, mode: 'idle', stopTarget: null, settle: 0, starts: 0, stops: 0, turns: 0 }; }
export const strideOf = (meta, H) => meta.cyclePx * H / meta.charHeight;
export const gaitIndex = g => ((Math.floor(g.phase * 8 + 1e-7) % 8) + 8) % 8;   // 0..7 = 걷기 열 1..8
export function gaitColumn(g, meta) { return g.mode === 'idle' ? meta.standCol : meta.walkCols[gaitIndex(g)]; }
// 입력이 있을 때: wanted=true, moved=이번 프레임 실제 이동 거리, expected=막히지 않았다면 갔을 거리
export function gaitWalk(g, moved, expected, L) {
  if (g.mode === 'idle') { g.mode = 'walk'; g.starts++; } else if (g.mode !== 'walk') { g.mode = 'walk'; g.stopTarget = null; }
  if (moved < expected * 0.15) { g.mode = 'idle'; g.stopTarget = null; return false; }   // 막힘 → 바로 서기
  g.phase += moved / L; return true;
}
// 입력이 없을 때: 정지 단계 진행. stepAlong(dist) = 진행 방향으로 dist만큼 이동 시도 후 실제 이동 거리 반환
export function gaitRelease(g, dt, L, maxStep, stepAlong) {
  if (g.mode === 'walk') {
    const f = gaitIndex(g);
    if (g.cfg.passingFrames.includes(f)) { g.mode = 'settle'; g.settle = 0; }
    else { g.stopTarget = 0.25 + 0.5 * (Math.floor((g.phase - 0.25) / 0.5) + 1); g.mode = 'stopping'; }
  }
  if (g.mode === 'settle') { g.settle += dt; if (g.settle >= g.cfg.settleSeconds) { g.mode = 'idle'; g.stops++; } return 0; }
  if (g.mode !== 'stopping') return 0;
  const want = Math.min(maxStep, Math.max(0, (g.stopTarget - g.phase) * L)), got = want > 0 ? stepAlong(want) : 0;
  g.phase += got / L;
  if (got < want - 0.5) { g.mode = 'idle'; g.stopTarget = null; g.stops++; return got; }        // 막힘 → 서기
  if (g.phase >= g.stopTarget - 1e-8) { g.phase = g.stopTarget; g.mode = 'settle'; g.settle = 0; }
  return got;
}
