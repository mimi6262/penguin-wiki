// 한국 시간(KST) 헬퍼 — 모든 이벤트 시각은 KST 기준으로 저장·표시합니다.
// 저장 형식: 'YYYY-MM-DDTHH:MM' (KST 벽시계 시각), 시간대 정보 없이 문자열로 보관

const TZ = 'Asia/Seoul';

// 'YYYY-MM-DDTHH:MM' | 'YYYY-MM-DD' → Date (절대 시각)
export function parseKST(s) {
  if (!s) return null;
  const t = s.length === 10 ? `${s}T00:00` : s.slice(0, 16);
  const d = new Date(`${t}:00+09:00`);
  return isNaN(d) ? null : d;
}

// Date → { date: 'YYYY-MM-DD', time: 'HH:MM', minutes: 0~1439 } (KST 기준)
export function kstParts(d = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false,
  }).formatToParts(d);
  const g = (t) => parts.find((p) => p.type === t)?.value;
  const hh = g('hour') === '24' ? '00' : g('hour');
  return { date: `${g('year')}-${g('month')}-${g('day')}`, time: `${hh}:${g('minute')}`, minutes: Number(hh) * 60 + Number(g('minute')) };
}

export const todayKST = () => kstParts().date;

// 'HH:MM' → 오늘(KST) 그 시각의 Date. dayOffset으로 어제/내일
export function todayAt(time, dayOffset = 0, ref = new Date()) {
  const base = parseKST(`${kstParts(ref).date}T${time}`);
  return base ? new Date(base.getTime() + dayOffset * 86400000) : null;
}

export function fmtKST(input, { time = true } = {}) {
  const d = typeof input === 'string' ? parseKST(input) : input;
  if (!d) return '';
  const p = kstParts(d);
  const [y, m, day] = p.date.split('-');
  return time ? `${y}.${m}.${day} ${p.time}` : `${y}.${m}.${day}`;
}

const toMin = (t) => { const [h, m] = (t || '00:00').split(':').map(Number); return h * 60 + m; };

// 'HH:MM'~'HH:MM' 창 안에 지금이 있는지 (자정을 넘는 창도 처리)
export function inDailyWindow(start, end, now = new Date()) {
  if (!start || !end) return true;
  const n = kstParts(now).minutes, s = toMin(start), e = toMin(end);
  return s <= e ? (n >= s && n <= e) : (n >= s || n <= e); // 종료 분까지 포함 (23:59면 자정 직전까지)
}

// 오늘 창의 종료 시각(Date). 자정을 넘는 창이면 내일로
export function windowEnd(start, end, now = new Date()) {
  const n = kstParts(now).minutes, s = toMin(start), e = toMin(end);
  return todayAt(end, s <= e ? 0 : (n >= s ? 1 : 0), now);
}

// 남은 시간 표시: 1일 이상 → 'N일 HH:MM', 그 외 'HH:MM:SS'
export function fmtRemaining(ms) {
  if (ms == null) return '';
  if (ms <= 0) return '00:00';
  const s = Math.floor(ms / 1000);
  const d = Math.floor(s / 86400), h = Math.floor((s % 86400) / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
  const p = (n) => String(n).padStart(2, '0');
  if (d > 0) return `${d}일 ${p(h)}:${p(m)}`;
  return `${p(h)}:${p(m)}:${p(sec)}`;
}

// ---------- 매주 반복 ----------
// ev.weekStartDay / weekEndDay: 0(일)~6(토), ev.weekStart / weekEnd: 'HH:MM' (KST)
export const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];
const WEEK_MIN = 7 * 1440;

// 이번 주(일요일 0시 KST 기준) 몇 분째인지
function kstWeekMinutes(now = new Date()) {
  const p = kstParts(now);
  const [y, m, d] = p.date.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay() * 1440 + p.minutes;
}
const weekPoint = (day, time) => Number(day) * 1440 + toMin(time);
const hasWeekly = (ev) => ev.weekStartDay !== '' && ev.weekStartDay != null && ev.weekEndDay !== '' && ev.weekEndDay != null && !!ev.weekStart && !!ev.weekEnd;

// 지금이 매주 창 안인지 (토→일처럼 주를 넘는 창도 처리, 종료 시각은 포함하지 않음)
export function inWeeklyWindow(ev, now = new Date()) {
  if (!hasWeekly(ev)) return false;
  const n = kstWeekMinutes(now), s = weekPoint(ev.weekStartDay, ev.weekStart), e = weekPoint(ev.weekEndDay, ev.weekEnd);
  return s <= e ? (n >= s && n < e) : (n >= s || n < e);
}

// 다음에 오는 (요일, 시각)의 Date. 지금이 바로 그 분이면 지금
function nextWeekPoint(day, time, now = new Date()) {
  const diff = (weekPoint(day, time) - kstWeekMinutes(now) + WEEK_MIN) % WEEK_MIN;
  return new Date(now.getTime() - (now.getTime() % 60000) + diff * 60000);
}
export const weeklyNextStart = (ev, now = new Date()) => nextWeekPoint(ev.weekStartDay, ev.weekStart, now);
export const weeklyNextEnd = (ev, now = new Date()) => nextWeekPoint(ev.weekEndDay, ev.weekEnd, now);

// ---------- 이벤트 상태 ----------
// ev: { kind: 'period'|'always'|'weekly', startAt, endAt, dailyStart, dailyEnd, weekStartDay, weekStart, weekEndDay, weekEnd, popup, popupStart, popupEnd }
export function eventStatus(ev, now = new Date()) {
  if (ev.kind === 'always') return 'always';
  if (ev.kind === 'weekly') return inWeeklyWindow(ev, now) ? 'active' : 'upcoming';
  const s = parseKST(ev.startAt), e = parseKST(ev.endAt);
  if (s && now < s) return 'upcoming';
  if (e && now > e) return 'ended';
  return 'active';
}

export const STATUS_LABEL = { active: '진행 중', always: '상시', upcoming: '예정', ended: '종료' };
export const STATUS_ORDER = { active: 0, always: 1, upcoming: 2, ended: 3 };

// 지금 팝업을 띄워야 하는 이벤트인지
export function popupActive(ev, now = new Date()) {
  if (!ev.popup) return false;
  const st = eventStatus(ev, now);
  if (st === 'always') return inDailyWindow(ev.dailyStart, ev.dailyEnd, now);
  if (st !== 'active') return false;
  if (ev.popupStart && ev.popupEnd) return inDailyWindow(ev.popupStart, ev.popupEnd, now);
  return true;
}

// 지금 진행 중인 회차의 시작·종료 (기간 / 매주 반복). 진행 중이 아니거나 상시면 null
export function eventOccurrence(ev, now = new Date()) {
  if (eventStatus(ev, now) !== 'active') return null;
  if (ev.kind === 'weekly') {
    const next = weeklyNextStart(ev, now).getTime();
    const minute = now.getTime() - (now.getTime() % 60000);
    return { start: new Date(next === minute ? next : next - WEEK_MIN * 60000), end: weeklyNextEnd(ev, now) };
  }
  return { start: parseKST(ev.startAt), end: parseKST(ev.endAt) };
}

// 팝업 방식 popupMode: 'during'(진행 중 계속, 기본) | 'edges'(시작·종료 알림)
export const POPUP_START_HOURS = 3, POPUP_END_HOURS = 2;
const hours = (v, d) => { const n = Number(v); return v === '' || v == null || !(n > 0) ? d : n; };

// 지금 띄울 팝업 단계: 'during' | 'start' | 'end' | null
export function popupPhase(ev, now = new Date()) {
  if (ev.popupMode !== 'edges' || ev.kind === 'always') return popupActive(ev, now) ? 'during' : null;
  if (!ev.popup) return null;
  const occ = eventOccurrence(ev, now);
  if (!occ) return null;
  if (occ.end && occ.end - now <= hours(ev.popupEndHours, POPUP_END_HOURS) * 3600000) return 'end';
  if (occ.start && now - occ.start < hours(ev.popupStartHours, POPUP_START_HOURS) * 3600000) return 'start';
  return null;
}

// 팝업 카운트다운 기준 시각
export function popupEndsAt(ev, now = new Date()) {
  if (ev.kind === 'always') return ev.dailyEnd ? windowEnd(ev.dailyStart, ev.dailyEnd, now) : null;
  const end = ev.kind === 'weekly' ? weeklyNextEnd(ev, now) : parseKST(ev.endAt);
  if (ev.popupStart && ev.popupEnd) {
    const w = windowEnd(ev.popupStart, ev.popupEnd, now);
    return end && end < w ? end : w;
  }
  return end;
}

// 목록에 표시할 남은 시간 문구
export function eventRemainingText(ev, now = new Date()) {
  const st = eventStatus(ev, now);
  if (ev.kind === 'weekly') return st === 'active' ? `종료까지 ${fmtRemaining(weeklyNextEnd(ev, now) - now)}` : `시작까지 ${fmtRemaining(weeklyNextStart(ev, now) - now)}`;
  if (st === 'upcoming') { const s = parseKST(ev.startAt); return s ? `시작까지 ${fmtRemaining(s - now)}` : ''; }
  if (st === 'active') { const e = parseKST(ev.endAt); return e ? `종료까지 ${fmtRemaining(e - now)}` : '기간 미정'; }
  if (st === 'always') {
    if (!ev.dailyStart || !ev.dailyEnd) return '매일';
    return inDailyWindow(ev.dailyStart, ev.dailyEnd, now) ? `종료까지 ${fmtRemaining(windowEnd(ev.dailyStart, ev.dailyEnd, now) - now)}` : `매일 ${ev.dailyStart} 시작`;
  }
  return '';
}

export function eventPeriodText(ev) {
  if (ev.kind === 'always') return ev.dailyStart && ev.dailyEnd ? `매일 ${ev.dailyStart} ~ ${ev.dailyEnd}` : '매일';
  if (ev.kind === 'weekly') return hasWeekly(ev) ? `매주 ${WEEKDAYS[ev.weekStartDay]} ${ev.weekStart} ~ ${WEEKDAYS[ev.weekEndDay]} ${ev.weekEnd}` : '매주';
  const s = ev.startAt ? fmtKST(ev.startAt) : '', e = ev.endAt ? fmtKST(ev.endAt) : '';
  return s || e ? `${s} ~ ${e}` : '';
}
