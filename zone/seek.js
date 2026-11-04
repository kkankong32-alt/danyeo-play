// 숨바꼭질 규칙 — 위치로만 판정하는 순수 함수(화면·입력 없음). sim.js와 Node 테스트가 함께 쓴다.
// 두 계단(A·B)은 2층 복도로 이어져 있다. 혼자 다가가면 친구는 위로 올라가 반대쪽으로 도망친다.
// 반대쪽 계단 앞에 어린 엄마가 "도착해서" 지키고 있으면, 친구는 2층 복도에서 갈 곳을 잃는다.
import { other } from './zone.js?v=16';

export function initial() {
  return { stage: 'arrive', friendAt: 'A', friendMode: 'hidden', flees: 0, guardAt: null, posted: false, momMode: 'count',
    clues: { shoe: false, sister: false, run: false }, canAsk: false, hint: 0, found: false, log: [] };
}
const note = (s, e) => { s.log.push(e); return e; };
export function meet(s) { if (s.stage !== 'arrive') return null; s.stage = 'seek'; s.momMode = 'follow'; return note(s, { type: 'meet' }); }
export function sawShoe(s, at) { if (s.stage !== 'seek' || s.friendMode !== 'hidden' || at !== s.friendAt) return null; const first = !s.clues.shoe; s.clues.shoe = true; return note(s, { type: 'shoe', at, first }); }
// 누군가(은재, 또는 아직 자리 잡지 않은 엄마)가 친구가 숨은 계단에 다가왔다 → 도망 시작
export function startle(s, at, by) {
  if (s.stage !== 'seek' || s.friendMode !== 'hidden' || at !== s.friendAt) return null;
  s.friendMode = 'flee'; s.flees++; s.clues.run = true; s.canAsk = true;
  return note(s, { type: 'flee', from: at, to: other(at), n: s.flees, by });
}
// 2층 복도에서 반대쪽 계단 위에 도착했을 때: 아래가 막혔으면 갇힘, 아니면 내려가 숨음
export function reachOtherTop(s) {
  if (s.friendMode !== 'flee') return null;
  const to = other(s.friendAt);
  if (s.guardAt === to && s.posted) { s.friendMode = 'trapped'; return note(s, { type: 'trapped', blockedAt: to }); }
  return note(s, { type: 'passing', to });
}
export function hidAgain(s) { if (s.friendMode !== 'flee') return null; s.friendAt = other(s.friendAt); s.friendMode = 'hidden'; return note(s, { type: 'hid', at: s.friendAt }); }
// 엄마에게 계단 지키기를 부탁(계단 근처에서만 가능, 첫 도망 이후)
export function ask(s, at) { if (s.stage !== 'seek' || !s.canAsk || !at) return null; s.momMode = 'guard'; s.guardAt = at; s.posted = false; return note(s, { type: 'ask', at }); }
export function posted(s) { if (s.momMode !== 'guard' || s.posted) return null; s.posted = true; return note(s, { type: 'posted', at: s.guardAt }); }
// 엄마가 친구가 숨은 계단을 지키러 가다 들킴 → 지키기 취소(자동으로 맞는 배치가 되지 않게). 같은 판에서 다시 부탁할 수 있다.
export function spoiled(s) { if (s.momMode !== 'guard') return null; const at = s.guardAt; s.momMode = 'follow'; s.guardAt = null; s.posted = false; return note(s, { type: 'spoiled', at }); }
export function follow(s) { if (s.momMode !== 'guard') return null; s.momMode = 'follow'; s.guardAt = null; s.posted = false; return note(s, { type: 'follow' }); }
// 갇힌 친구에게 은재가 2층에서 다가감 → 발견
export function catchFriend(s) { if (s.friendMode !== 'trapped') return null; s.friendMode = 'caught'; s.found = true; s.stage = 'found'; return note(s, { type: 'found' }); }
// 막힐 때만 단계적으로 구체화되는 엄마 힌트 수준(0~3)
export function hintLevel(s, secondsSinceFlee) {
  if (s.momMode === 'guard') return s.hint;
  const lv = Math.min(3, s.flees + (secondsSinceFlee > 40 && s.flees ? 1 : 0)); s.hint = Math.max(s.hint, lv); return s.hint;
}
