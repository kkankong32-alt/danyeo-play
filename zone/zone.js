import { TRIAL, LAYERS } from './trial_layout.js';
// 1993 다대포 아파트 앞마당 — 회색 상자 공간 데이터 + 기하 판정. 브라우저·Node 테스트 공용(DOM 없음).
// 투영: 100TF와 같은 방식 — 바닥은 위에서 내려다본 평면(plan x,y), 세워진 것(건물·인물·소품)은 정면 3/4 그림.
// 인물·소품 크기는 화면 위치와 관계없이 일정(원근 축소 없음). 높이 z는 화면에서 위로 올리는 값: 화면 y = plan y − z.
export const WORLD = { w: 3200, h: 1940 };
export const VIEW = { w: 1920, h: 1080 };

// 축척: 월드 125px = 1m (2층 바닥 높이 344px = 층고 2.75m에서 정함). 문·계단·난간·평상도 이 축척으로 그린다.
export const PX_PER_M = 125;
// 실제 키(m): 은재(초1) 1.22, 어린 엄마 1.21, 친구 1.24, 이모(만 4세) 1.02, 할머니(1993년 30대) 1.57
export const REAL_H = { ej: 1.22, ym: 1.21, fr: 1.24, ss: 1.02, gd: 1.57 };
// 표시 키(px). 기본은 실제 축척(은재 ≈ 152px). 비교용으로 인물만 배율을 바꿀 수 있다(setCharScale) — 화면 확대는 카메라 zoom으로 따로.
export const HEIGHT = {};
export function setCharScale(k = 1) { for (const [id, m] of Object.entries(REAL_H)) HEIGHT[id] = Math.round(m * PX_PER_M * k); return HEIGHT; }
setCharScale(1);
// 실제 치수(m) → 그리기에 쓰는 값
export const ARCH = { door: 2.05, door2fTop: 2.05, riser: 0.172, parapetConcrete: 0.6, railing: 1.1, pyeongsang: 0.45 };

// 층: 'g' 바닥(1층 복도+마당), 'st' 계단 위, '2f' 2층 복도
export const FLOOR2 = { y: 580, z: 344, x0: 300, x1: 2900 };      // 2층 복도: plan y 고정, 높이 344 → 화면 y 236
export const STAIR_ENTER_Y = TRIAL.stairEnterY;                                  // 이 y보다 안쪽(위)으로 계단 폭 안에서 위로 가면 계단에 오름
export const STAIRS = Object.fromEntries(Object.entries(TRIAL.stairs).map(([id,s])=>[id,{id,...s}]));
export const other = id => (id === 'A' ? 'B' : 'A');
export const STAIR_LEN = TRIAL.stairLength;                                      // 계단 한 번 오르는 길이(속도 환산용, px)

// 바닥 이동 가능 영역(사각형 합집합)과 막힘(사각형, [x0,y0,x1,y1,이름])
const WALK = [[60,640,3140,1740],[1490,1720,1710,1920],[1200,1820,2000,1920],TRIAL.groundCorridor];
export const BLOCKED = TRIAL.blocked.map(b=>b[4]==='L3_flowers_v01'?[2000,1150,2650,1220,b[4]]:b).concat([[0,1740,1490,1790,'front_wall_left'],[1710,1740,3200,1790,'front_wall_right']]);
const FOOT = [-12, -8, 12, 0];                                     // 발밑 상자(100TF와 같은 방식)
const inR = (r, x, y) => x >= r[0] && x <= r[2] && y >= r[1] && y <= r[3];
// 발밑 상자 네 모서리가 모두 이동 영역 안 + 막힘과 겹치지 않으면 설 수 있다.
export function free(x, y) {
  const c = [[x + FOOT[0], y + FOOT[1]], [x + FOOT[2], y + FOOT[1]], [x + FOOT[0], y + FOOT[3]], [x + FOOT[2], y + FOOT[3]]];
  if (!c.every(([px, py]) => WALK.some(r => inR(r, px, py)))) return false;
  for (const b of BLOCKED) if (x + FOOT[2] > b[0] && x + FOOT[0] < b[2] && y + FOOT[3] > b[1] && y + FOOT[1] < b[3]) return false;
  return true;
}
export function stairAt(x, y) { for (const s of Object.values(STAIRS)) if (Math.abs(x - s.x) <= s.hw && y < STAIR_ENTER_Y) return s.id; return null; }

// 고정 인물·지점
export const SPOT = {
  ejStart: [1600, 1480], momCount: [1600, 1072], guardianSeat: [560, 1352], sisterPlay: [830, 1370],
  gather: { ej: [1480, 1200], ym: [1720, 1205], fr: [1600, 1300], ss: [1385, 1270], gd: [560, 1352] },
  photo: { ej: [1690, 1470], ym: [1530, 1470], fr: [1610, 1470], ss: [1450, 1470] },
  photoCamera: [1570, 1700],
};

// 관찰 대상(👁): 다가가면 한 줄 혼잣말. at = 발 기준 위치
export const LOOKS = {
  mailbox: { at: [620, 600], r: 150, text: '우편함 이름표가 반쯤 떨어져 있다.' },
  bicycle: { at: [2555, 715], r: 160, text: '짐자전거. 바퀴에 흙이 잔뜩 묻었다.' },
  flowerbed: { at: [2325, 1235], r: 190, text: '꽃밭엔 발자국이 없다. 여긴 아니야.' },
  tap: { at: [2940, 975], r: 160, text: '수도꼭지에서 물이 똑, 똑.' },
};

// 그리기용 상자(회색 상자 단계 전용). 실제 그림이 오면 같은 자리에 레이어 이미지가 들어간다.
export const PROPS = LAYERS.layers.filter(l=>l.kind==='sorted').map(l=>({kind:l.id.includes('trunk')?'trunk':l.id.includes('flowers')?'flowerbed':l.id.includes('platform')?'pyeongsang':'art',id:l.id,foot:l.collision,h:l.bounds[3]-l.bounds[1]}));
// 위에 덮는 가림(화면 좌표 사각형). 계단 통로(x 범위)는 뚫려 있다.
export const PARAPET = { railTop: 135, y0: 207, y1: 268 }; // Current art occlusion; see layers_v03.json
export const OVERHANG = { y0: 236, y1: 268 };     // 1층 천장 앞 끝
export const CANOPY = { x: 1600, y: 640, r: 320 }; // 나무 잎(머리 위). 인물이 아래 있으면 반투명
export const FRONT_WALL = { y0: 1790, gate: [1490, 1710] };
