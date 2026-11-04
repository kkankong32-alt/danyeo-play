// 인물 그림 적용 설정 — 월드 축척(zone.js PX_PER_M)과 분리. 실제 배경을 넣을 때 여기 값만 다시 검토한다.
import { HEIGHT } from './zone.js?v=17';
export const ART = {
  ej: {
    sheet: 'ej_A_walk_9x4_v05_game',      // assets/sheets/<id>.json (원본: art/inbox/20261102_은재_A_4방향_v05/)
    // 화면(월드) 키 px. **임시 축척** — 회색 상자 배경(125px=1m)의 문 2.05m·계단 17cm·난간 1.1m·또래 인물(어린 엄마 1.21m)과 비교해 정함.
    // 실제 배경 적용 시 재검토. 카메라 확대(main.js ?zoom, 기본 1.25)와는 별개다.
    displayHeight: 154,
    provisional: true,
    basis: 'graybox-125px-per-m-2026-11-02',
  },
};
// 인물 배율(k, 비교용 ?h=)과 은재 개별 키(?ejh=)를 적용
export function applyArtHeights(k = 1, ejOverride = null) { HEIGHT.ej = Math.round((ejOverride ?? ART.ej.displayHeight) * (ejOverride ? 1 : k)); return HEIGHT; }
applyArtHeights();
