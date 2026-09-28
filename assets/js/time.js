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

// ---------- 이벤트 상태 ----------
// ev: { kind: 'period'|'always', startAt, endAt, dailyStart, dailyEnd, popup, popupStart, popupEnd }
export function eventStatus(ev, now = new Date()) {
  if (ev.kind === 'always') return 'always';
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

// 팝업 카운트다운 기준 시각
export function popupEndsAt(ev, now = new Date()) {
  if (ev.kind === 'always') return ev.dailyEnd ? windowEnd(ev.dailyStart, ev.dailyEnd, now) : null;
  const end = parseKST(ev.endAt);
  if (ev.popupStart && ev.popupEnd) {
    const w = windowEnd(ev.popupStart, ev.popupEnd, now);
    return end && end < w ? end : w;
  }
  return end;
}

// 목록에 표시할 남은 시간 문구
export function eventRemainingText(ev, now = new Date()) {
  const st = eventStatus(ev, now);
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
  const s = ev.startAt ? fmtKST(ev.startAt) : '', e = ev.endAt ? fmtKST(ev.endAt) : '';
  return s || e ? `${s} ~ ${e}` : '';
}
