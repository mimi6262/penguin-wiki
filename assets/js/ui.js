// 공통 UI: 헤더/푸터 렌더링, 토스트, 헬퍼
// Firebase에 의존하지 않으므로 네트워크가 막혀도 뼈대는 그려집니다.

export const ROOT = window.PW_ROOT || './';

export const SITE = {
  name: '펭귄서버',
  // 값이 비어 있으면 화면에 [ ] 자리표시자가 보입니다. 관리 화면 > 사이트 설정에서 채워집니다.
  business: { company: '', owner: '', regNo: '' },
};

export const $ = (sel, el = document) => el.querySelector(sel);
export const $$ = (sel, el = document) => Array.from(el.querySelectorAll(sel));

export function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

export function fmtDate(ts, withTime = false) {
  if (!ts) return '';
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  const p = (n) => String(n).padStart(2, '0');
  const base = `${d.getFullYear()}.${p(d.getMonth() + 1)}.${p(d.getDate())}`;
  return withTime ? `${base} ${p(d.getHours())}:${p(d.getMinutes())}` : base;
}

export function param(name) {
  return new URLSearchParams(location.search).get(name);
}

const ICONS = {
  search: '<svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6A4529" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg>',
  gear: '<svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1L7 17M17 7l2.1-2.1"/></svg>',
  logout: '<svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#6A4529" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 17l5-5-5-5"/><path d="M15 12H3"/><path d="M12 3h7v18h-7"/></svg>',
  close: '<svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>',
};
export { ICONS };

const NAV = [
  { key: 'patch', label: '패치노트', href: 'patch.html' },
  { key: 'guide', label: '가이드', href: 'guide.html' },
  { key: 'prices', label: '시세', href: 'prices.html' },
  { key: 'events', label: '이벤트', href: 'events.html' },
];

export function renderHeader(active = '') {
  syncCursor();
  const el = $('#site-header');
  if (!el) return;
  const links = NAV.map((n) =>
    `<a href="${ROOT}${n.href}"${active === n.key ? ' aria-current="page"' : ''}>${n.label}</a>`
  ).join('');
  el.className = 'site-header';
  el.innerHTML = `
    <div class="tile-band"></div>
    <svg class="tile-edge" aria-hidden="true" viewBox="0 0 1280 12" preserveAspectRatio="none">
      <defs>
        <pattern id="pw-tile" width="18" height="12" patternUnits="userSpaceOnUse">
          <circle cx="9" cy="0" r="8" fill="#2B3A57"/><circle cx="9" cy="0" r="5" fill="#3D4F70"/>
        </pattern>
      </defs>
      <rect width="1280" height="12" fill="url(#pw-tile)"/>
    </svg>
    <div class="bar">
      <a class="plaque" href="${ROOT}index.html"><span class="name">${esc(SITE.name)}</span><span class="seal" aria-hidden="true"></span></a>
      <nav class="nav" aria-label="주요 메뉴">
        ${links}
        <a class="nav-admin" data-auth="editor" hidden href="${ROOT}admin/index.html"${active === 'admin' ? ' aria-current="page"' : ''}>${ICONS.gear} 관리</a>
      </nav>
      <form class="search" role="search" action="${ROOT}search.html" method="get">
        ${ICONS.search}
        <input type="search" name="q" aria-label="위키 검색" placeholder="검색" autocomplete="off">
      </form>
      <a class="search-link" href="${ROOT}search.html" aria-label="검색">${ICONS.search}</a>
      <button type="button" class="menu-btn" aria-label="메뉴 열기" aria-expanded="false" data-action="menu">
        <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#F3E4C4" stroke-width="2" stroke-linecap="round"><path d="M4 7h16M4 12h16M4 17h16"/></svg>
      </button>
      <div class="user-chip" data-auth="editor" hidden>
        <span class="user-name"></span>
        <span class="role"></span>
        <button type="button" class="logout" aria-label="로그아웃" data-action="logout">${ICONS.logout}</button>
      </div>
    </div>
    <div class="gold-line"></div>
    <div class="wood-line"></div>`;
}

export function renderFooter(extra = {}) {
  const el = $('#site-footer');
  if (!el) return;
  const b = { ...SITE.business, ...extra };
  const v = (x, ph) => (x ? esc(x) : `<span style="color:#8A7D66">[${ph}]</span>`);
  el.className = 'site-footer';
  el.innerHTML = `
    <div class="gold-line"></div>
    <div class="body">
      <span class="logo">${esc(SITE.name)}</span>
      <p>Minecraft는 Mojang AB 및 Microsoft의 상표이며, ${esc(SITE.name)}는 Mojang AB나 Microsoft와 제휴 관계가 아닙니다.</p>
      <div class="row">
        <span>상호: ${v(b.company, '상호')}</span>
        <span>대표: ${v(b.owner, '대표자명')}</span>
        <span>사업자등록번호: ${v(b.regNo, '000-00-00000')}</span>
      </div>
      <div class="links">
        <a href="${ROOT}guide.html?p=privacy">개인정보처리방침</a>
        <a href="${ROOT}guide.html?p=terms">이용약관</a>
      </div>
      <span class="copy">© ${new Date().getFullYear()} ${esc(SITE.name)}. All rights reserved.</span>
    </div>`;
}

// 마우스 커서: 관리 → 사이트 설정에서 올린 작은 PNG(data URL)를 모든 페이지의 커서로 씁니다.
// 브라우저에 저장해 두고 즉시 적용한 뒤, 탭당 한 번만 Firestore 에서 최신 값을 받아옵니다.
const CURSOR_KEY = 'pw_cursor';
export function applyCursor(cursor) {
  const root = document.documentElement;
  if (cursor && cursor.data) {
    const hx = cursor.hx ?? 2, hy = cursor.hy ?? 2;
    root.style.setProperty('--pw-cursor', `url("${cursor.data}") ${hx} ${hy}`);
    root.classList.add('pw-cursor');
  } else {
    root.style.removeProperty('--pw-cursor');
    root.classList.remove('pw-cursor');
  }
  try { cursor && cursor.data ? localStorage.setItem(CURSOR_KEY, JSON.stringify(cursor)) : localStorage.removeItem(CURSOR_KEY); } catch {}
}
export async function syncCursor() {
  try { const c = JSON.parse(localStorage.getItem(CURSOR_KEY) || 'null'); if (c) applyCursor(c); } catch {}
  try {
    if (sessionStorage.getItem('pw_cursor_checked')) return;
    sessionStorage.setItem('pw_cursor_checked', '1');
    const { db, doc, getDoc } = await import('./firebase.js');
    const snap = await getDoc(doc(db, 'settings', 'site'));
    applyCursor(snap.exists() ? snap.data().cursor || null : null);
  } catch (e) { /* 오프라인이거나 아직 설정 전 */ }
}

// 스크롤 리빌: .reveal 요소가 화면에 들어오면 .in 을 붙여 CSS transition 으로 등장 (한 번만)
// 나중에 추가된 요소가 있으면 initReveal()을 다시 호출하면 됩니다. 움직임 줄이기 설정이면 즉시 표시.
let revealIO = null;
export function initReveal(root = document) {
  const els = $$('.reveal:not(.in)', root);
  if (!els.length) return;
  const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  if (reduce || !('IntersectionObserver' in window)) { els.forEach((el) => el.classList.add('in')); return; }
  revealIO ||= new IntersectionObserver((entries) => {
    entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('in'); revealIO.unobserve(e.target); } });
  }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
  els.forEach((el) => revealIO.observe(el));
}

// 간단 토스트 (하단 우측)
export function toast(message, { timeout = 2600 } = {}) {
  let stack = $('#toast-stack');
  if (!stack) {
    stack = document.createElement('div');
    stack.id = 'toast-stack';
    stack.className = 'toast-stack';
    document.body.appendChild(stack);
  }
  const t = document.createElement('div');
  t.className = 'toast simple';
  t.setAttribute('role', 'status');
  t.textContent = message;
  stack.appendChild(t);
  setTimeout(() => t.remove(), timeout);
}

export async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    toast('복사했습니다');
    return true;
  } catch {
    toast('복사에 실패했습니다. 직접 선택해 복사해 주세요');
    return false;
  }
}

// 헤더 안 트리거들
document.addEventListener('click', (e) => {
  const btn = e.target.closest('[data-action="logout"]');
  if (btn) {
    document.dispatchEvent(new CustomEvent('pw:logout'));
  }
  const menu = e.target.closest('[data-action="menu"]');
  if (menu) {
    const bar = menu.closest('.bar');
    const open = bar.classList.toggle('open');
    menu.setAttribute('aria-expanded', String(open));
    menu.setAttribute('aria-label', open ? '메뉴 닫기' : '메뉴 열기');
  }
});
