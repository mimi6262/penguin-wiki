// 조회수 — 가이드 문서 · 주요 페이지를 열면 views/{키} 의 전체(total)와 그날(days.YYYY-MM-DD, KST) 숫자를 1씩 올립니다.
//  - 누가 봤는지는 남기지 않습니다(숫자만). 규칙(firestore.rules views)이 "1씩 올리기"만 허용합니다.
//  - 같은 브라우저에서 같은 날 같은 페이지는 한 번만 셉니다(localStorage pw_seen — 오늘 것만 남김).
//  - 편집자로 로그인한 브라우저(pw_editor)는 세지 않습니다.
// 키: 가이드 문서 = 슬러그, 그 밖의 페이지 = PAGE_KEYS. 관리 → 조회수에서 표로 봅니다.
import { todayKST, parseKST, kstParts } from './time.js';

export const PAGE_KEYS = { _home: '홈', _patch: '패치노트', _events: '이벤트', _commands: '명령어', _prices: '시세' };
const SEEN_KEY = 'pw_seen';
const sent = new Set(); // 이 화면에서 이미 보낸 키 (기억해 둔 목차로 한 번, 서버 응답으로 또 한 번 그릴 때 두 번 세지 않게)

export async function countView(key) {
  const day = todayKST();
  if (!key || sent.has(key)) return;
  let seen = {};
  try {
    if (localStorage.getItem('pw_editor')) return;
    seen = JSON.parse(localStorage.getItem(SEEN_KEY) || '{}') || {};
    if (seen[key] === day) return;
  } catch { /* 저장소를 못 쓰는 브라우저는 열 때마다 셈 */ }
  sent.add(key);
  try {
    const { db, doc, setDoc, increment } = await import('./firebase.js');
    await setDoc(doc(db, 'views', key), { total: increment(1), days: { [day]: increment(1) }, d: day }, { merge: true });
    for (const k of Object.keys(seen)) if (seen[k] !== day) delete seen[k];
    seen[key] = day;
    try { localStorage.setItem(SEEN_KEY, JSON.stringify(seen)); } catch {}
  } catch (e) {
    console.warn('조회수를 기록하지 못했습니다', e); // 규칙 게시 전이거나 오프라인 — 화면에는 영향 없음
  }
}

// 오늘부터 거슬러 n일의 날짜 문자열 (KST)
export function lastDays(n, today = todayKST()) {
  const base = parseKST(today).getTime();
  return Array.from({ length: n }, (_, i) => kstParts(new Date(base + 12 * 3600000 - i * 86400000)).date);
}

// { total, days } → { total, today, yesterday, week, month, days }
export function summarize(data = {}, today = todayKST()) {
  const days = data.days || {};
  const sum = (n) => lastDays(n, today).reduce((a, d) => a + (days[d] || 0), 0);
  const [, yesterday] = lastDays(2, today);
  return { total: data.total || 0, today: days[today] || 0, yesterday: days[yesterday] || 0, week: sum(7), month: sum(30), days };
}

// 편집자 전용(규칙상 읽기는 편집자만)
export async function getViews(key) {
  const { db, doc, getDoc } = await import('./firebase.js');
  const s = await getDoc(doc(db, 'views', key));
  return summarize(s.exists() ? s.data() : {});
}
export async function listViews() {
  const { db, collection, getDocs } = await import('./firebase.js');
  const snap = await getDocs(collection(db, 'views'));
  const out = {};
  snap.forEach((d) => { out[d.id] = d.data(); });
  return out;
}
