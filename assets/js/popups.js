// 하단 우측 알림 팝업 — 이벤트 카운트다운 + 마인리스트 추천
// 규칙
//  - 하트를 하나도 안 눌렀으면 진행 중(팝업 켜진) 이벤트 전부, 하트가 있으면 누른 것만
//  - 닫으면 그날은 다시 안 뜸 (브라우저 저장)
//  - 마인리스트: 설정한 시간대에만, 추천하기/닫기 후 다음 날 다시
import { listEvents, getPopupSettings, getHearts, popupWindows } from './content.js';
import { popupActive, popupEndsAt, inDailyWindow, fmtRemaining, todayKST, fmtKST } from './time.js';
import { esc, ROOT } from './ui.js';

const STAR = '<svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#BA7517" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l2.8 5.7 6.2.9-4.5 4.4 1 6.2L12 17.3 6.5 20.2l1-6.2L3 9.6l6.2-.9z"/></svg>';
const FLAME = '<svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#A63A2B" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2c1 4 5 5 5 10a5 5 0 0 1-10 0c0-2 1-3 2-4 0 2 1 3 2 3 0-3 0-6 1-9z"/></svg>';
const CLOSE = '<svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>';

const dismissed = (key) => { try { return localStorage.getItem(`pw_dismiss_${key}`) === todayKST(); } catch { return false; } };
const dismiss = (key) => { try { localStorage.setItem(`pw_dismiss_${key}`, todayKST()); } catch {} };

function stack() {
  let s = document.getElementById('popup-stack');
  if (!s) {
    s = document.createElement('div');
    s.id = 'popup-stack';
    s.className = 'toast-stack';
    document.body.appendChild(s);
  }
  return s;
}

export async function initPopups() {
  let events = [], settings = null;
  try {
    [events, settings] = await Promise.all([listEvents(), getPopupSettings()]);
  } catch (e) {
    console.warn('popups: load failed', e);
    return;
  }
  const hearts = new Set(getHearts());
  const timers = [];

  // 이벤트 팝업
  const candidates = events.filter((ev) => popupActive(ev) && !dismissed(`ev_${ev.id}`) && (hearts.size === 0 || hearts.has(ev.id)));
  candidates.slice(0, 3).forEach((ev) => {
    const el = document.createElement('div');
    el.className = 'toast';
    el.setAttribute('role', 'status');
    const endsAt = popupEndsAt(ev);
    const link = ev.link ? (ev.link.startsWith('http') ? ev.link : `${ROOT}${ev.link}`) : `${ROOT}events.html`;
    el.innerHTML = `${FLAME}
      <div class="grow">
        <a href="${esc(link)}" style="text-decoration:none; color:inherit; font-size:14px">${esc(ev.name)}</a>
        <div class="sub">${endsAt ? `${fmtKST(endsAt).slice(11)} 종료` : '진행 중'}</div>
      </div>
      <span class="count" data-count></span>
      <button type="button" class="close" aria-label="알림 닫기">${CLOSE}</button>`;
    el.querySelector('.close').addEventListener('click', () => { dismiss(`ev_${ev.id}`); el.remove(); });
    stack().appendChild(el);
    const countEl = el.querySelector('[data-count]');
    const tick = () => {
      if (!endsAt) { countEl.textContent = ''; return; }
      const ms = endsAt - new Date();
      countEl.textContent = fmtRemaining(ms);
      if (ms <= 0) { el.remove(); timers.forEach(clearInterval); }
    };
    tick();
    timers.push(setInterval(tick, 1000));
  });

  // 마인리스트 추천: 시간대 여러 개. 닫기 → 그 시간대만 오늘 숨김, 추천하기 → 오늘 전부 숨김 (자정 지나면 새 날)
  // 페이지를 켜 둔 채 시간대에 들어서도 뜨도록 1분마다 다시 확인합니다.
  const windows = popupWindows(settings);
  let mlEl = null;
  const showMinelist = () => {
    if (mlEl || !settings?.enabled || !settings.url || dismissed('ml_voted')) return;
    const idx = windows.findIndex((w, i) => inDailyWindow(w.start, w.end) && !dismissed(`ml_${i}`));
    if (idx < 0) return;
    const w = windows[idx];
    const el = document.createElement('div');
    el.className = 'toast';
    el.setAttribute('role', 'status');
    el.innerHTML = `${STAR}
      <div class="grow">
        <div style="font-size:14px">${esc(w.text || settings.text || '마인리스트 추천으로 서버를 응원해 주세요')}</div>
        <div class="sub">${esc(w.start)} ~ ${esc(w.end)} · 추천은 하루 한 번</div>
      </div>
      <a class="btn sm primary" href="${esc(settings.url)}" target="_blank" rel="noopener">추천하기</a>
      <button type="button" class="close" aria-label="알림 닫기">${CLOSE}</button>`;
    el.querySelector('.close').addEventListener('click', () => { dismiss(`ml_${idx}`); el.remove(); mlEl = null; });
    el.querySelector('a.btn').addEventListener('click', () => { dismiss('ml_voted'); setTimeout(() => { el.remove(); mlEl = null; }, 300); });
    stack().appendChild(el);
    mlEl = el;
    // 시간대가 끝나면 스스로 사라짐
    const check = setInterval(() => { if (!inDailyWindow(w.start, w.end)) { el.remove(); mlEl = null; clearInterval(check); } }, 30000);
  };
  showMinelist();
  setInterval(showMinelist, 60000);
}

initPopups();
