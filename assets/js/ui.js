import { guideIllustration, illustration } from './illustrations.js';
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
  { key: 'home', label: '마을 입구', href: 'index.html' },
  { key: 'patch', label: '패치노트', href: 'patch.html' },
  { key: 'guide', label: '가이드', href: 'guide.html' },
  { key: 'commands', label: '명령어', href: 'commands.html' },
  { key: 'prices', label: '시세', href: 'prices.html' },
  { key: 'events', label: '이벤트', href: 'events.html' },
];

// 로그인 상태 표시(관리 메뉴·이름표 등 data-auth 요소)
// 페이지를 옮길 때마다 로그인 확인(0.5~1초)을 기다리는 동안 관리 메뉴가 숨었다 나타나면서 메뉴 줄 전체가 옆으로 밀리지 않도록,
// 마지막 로그인 상태를 브라우저에 기억해 두고 처음부터 그 상태로 그립니다. 확인이 끝나면 auth.js 가 실제 상태로 다시 맞춥니다.
// (미리 보여 주는 것일 뿐, 실제 권한은 로그인 확인과 데이터베이스 규칙이 지킵니다)
const EDITOR_KEY = 'pw_editor';
export function paintAuth(e) {
  $$('[data-auth]').forEach((el) => {
    const need = el.getAttribute('data-auth');
    el.hidden = !(e && (need === 'editor' || (need === 'admin' && e.role === 'admin')));
  });
  $$('.user-chip .user-name').forEach((el) => (el.textContent = e?.name || ''));
  $$('.user-chip .role').forEach((el) => (el.textContent = e ? (e.role === 'admin' ? '운영자' : '가이드') : ''));
}
export function rememberEditor(e) {
  try { e ? localStorage.setItem(EDITOR_KEY, JSON.stringify({ name: e.name || '', role: e.role || 'guide' })) : localStorage.removeItem(EDITOR_KEY); } catch {}
}
function lastEditor() {
  try { return JSON.parse(localStorage.getItem(EDITOR_KEY) || 'null'); } catch { return null; }
}

export function renderHeader(active = '') {
  syncCursor();
  const el = $('#site-header');
  if (!el) return;
  const links = NAV.map((n) =>
    `<a href="${ROOT}${n.href}"${active === n.key ? ' aria-current="page"' : ''}><span class="nav-illustration" aria-hidden="true">${illustration(({home:'village',patch:'book',guide:'adventure',commands:'chat',prices:'market',events:'star'})[n.key])}</span>${n.label}</a>`
  ).join('');
  const main = document.querySelector('main');
  if (main && !main.id) main.id = 'main-content';
  el.className = 'site-header';
  el.innerHTML = `
    <a class="skip-link" href="#main-content">본문 바로가기</a><div class="tile-band" aria-hidden="true"></div>
    <svg class="tile-edge" aria-hidden="true" viewBox="0 0 1280 12" preserveAspectRatio="none">
      <defs>
        <pattern id="pw-tile" width="18" height="12" patternUnits="userSpaceOnUse">
          <circle cx="9" cy="0" r="8" fill="#354b45"/><circle cx="9" cy="0" r="5" fill="#597067"/>
        </pattern>
      </defs>
      <rect width="1280" height="12" fill="url(#pw-tile)"/>
    </svg>
    <div class="bar">
      <a class="plaque" href="${ROOT}index.html"><span class="penguin-mark" aria-hidden="true">${PENGUIN}</span><span class="brand-copy"><span class="name">${esc(SITE.name)}</span><span class="brand-sub">함께 살아가는 작은 세상</span></span></a>
      <nav class="nav" aria-label="주요 메뉴">
        ${links}
        <a class="nav-admin" data-auth="editor" hidden href="${ROOT}admin/index.html"${active === 'admin' ? ' aria-current="page"' : ''}>${ICONS.gear} 관리</a>
      </nav>
      <form class="search" role="search" action="${ROOT}search.html" method="get">
        ${ICONS.search}
        <input type="search" name="q" aria-label="위키 검색" placeholder="무엇이 궁금하세요?" autocomplete="off">
      </form>
      <a class="search-link" href="${ROOT}search.html" aria-label="검색">${ICONS.search}</a>
      <button type="button" class="menu-btn" aria-label="메뉴 열기" aria-expanded="false" data-action="menu">
        <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 7h16M4 12h16M4 17h16"/></svg>
      </button>
      <div class="user-chip" data-auth="editor" hidden>
        <span class="user-name"></span>
        <span class="role"></span>
        <button type="button" class="logout" aria-label="로그아웃" data-action="logout">${ICONS.logout}</button>
      </div>
    </div>
    <div class="gold-line"></div>
    <div class="wood-line"></div>`;
  const last = lastEditor();
  if (last) paintAuth(last); // 지난번에 로그인해 있던 편집자면 관리 메뉴를 처음부터 자리 잡아 둡니다
}

// 저장·불러오기 오류를 사람이 읽을 수 있는 문장으로 (관리 화면 토스트용)
export function errText(err) {
  const code = String(err?.code || ''), msg = String(err?.message || err || '');
  if (code.includes('permission-denied') || /insufficient permissions/i.test(msg)) return '권한이 없어 막혔습니다. Firebase 데이터베이스 규칙이 최신으로 게시됐는지 확인해 주세요';
  if (code.includes('unavailable') || code.includes('network') || /network|offline/i.test(msg)) return '네트워크 연결을 확인해 주세요';
  if (code.includes('resource-exhausted')) return '오늘 데이터베이스 사용량 한도를 넘었습니다. 내일 다시 시도해 주세요';
  if (code.includes('invalid-argument') && /bytes|size|exceeds|longer/i.test(msg)) return '내용이 너무 커서 저장할 수 없습니다';
  return msg || '알 수 없는 오류';
}

// 사이트 설정(settings/site) — 페이지마다 한 번만 읽어서 하단 사업자 정보·마우스 커서·홈 화면이 함께 씁니다.
let sitePromise = null;
export function loadSiteSettings() {
  if (!sitePromise) {
    sitePromise = import('./firebase.js')
      .then(({ db, doc, getDoc }) => getDoc(doc(db, 'settings', 'site')))
      .then((snap) => (snap.exists() ? snap.data() : {}));
    sitePromise.catch(() => { sitePromise = null; }); // 실패하면 다음 호출 때 다시 시도
  }
  return sitePromise;
}

// 하단(푸터): 모든 페이지에서 사이트 설정의 상호·대표·사업자등록번호를 직접 읽어 채웁니다.
// 브라우저에 마지막 값을 기억해 두었다가 먼저 보여 주고, 설정을 읽으면 최신 값으로 바꿉니다.
const BIZ_KEY = 'pw_business';
export function renderFooter(business) {
  const el = $('#site-footer');
  if (!el) return;
  const loaded = !!business;
  let b = business;
  if (!b) { try { b = JSON.parse(localStorage.getItem(BIZ_KEY) || 'null'); } catch { b = null; } }
  const known = !!b;
  b = { ...SITE.business, ...(b || {}) };
  // 설정을 읽은 뒤에도 비어 있을 때만 [ ] 자리표시자를 보여 줍니다 (읽는 중에는 빈칸)
  const v = (x, ph) => (x ? esc(x) : loaded ? `<span style="color:#8A7D66">[${ph}]</span>` : '');
  el.className = 'site-footer';
  el.innerHTML = `
    <div class="gold-line"></div>
    <div class="body">
      <span class="logo">${esc(SITE.name)} <small>함께 쓰는 마을 이야기</small></span>
      <p>Minecraft는 Mojang AB 및 Microsoft의 상표이며, ${esc(SITE.name)}는 Mojang AB나 Microsoft와 제휴 관계가 아닙니다.</p>
      <div class="row"${known || loaded ? '' : ' style="visibility:hidden"'}>
        <span>상호: ${v(b.company, '상호')}</span>
        <span>대표: ${v(b.owner, '대표자명')}</span>
        <span>사업자등록번호: ${v(b.regNo, '000-00-00000')}</span>
      </div>
      <div class="links">
        <a href="${ROOT}guide.html?p=terms">이용약관</a>
        <a class="privacy" href="${ROOT}guide.html?p=privacy">개인정보 처리방침</a>
      </div>
      <span class="copy">© ${new Date().getFullYear()} ${esc(SITE.name)}. All rights reserved.</span>
    </div>`;
  if (loaded) {
    try { localStorage.setItem(BIZ_KEY, JSON.stringify({ company: b.company || '', owner: b.owner || '', regNo: b.regNo || '' })); } catch {}
  } else {
    loadSiteSettings().then((s) => renderFooter(s.business || {})).catch(() => { /* 오프라인이거나 아직 설정 전 */ });
  }
}

// 마우스 커서: 관리 → 사이트 설정에서 올린 작은 PNG(data URL)를 모든 페이지의 커서로 씁니다.
// 브라우저에 저장해 두고 즉시 적용한 뒤, 페이지마다 읽는 사이트 설정에서 최신 값으로 맞춥니다.
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
    const s = await loadSiteSettings();
    applyCursor(s.cursor || null);
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

// Decorative UI only. No database fields or persistence are changed.
const PENGUIN = `<svg viewBox="0 0 48 52" fill="none"><ellipse cx="24" cy="30" rx="17" ry="20" fill="#344f4b"/><ellipse cx="24" cy="33" rx="12" ry="15" fill="#fffaf0"/><ellipse cx="14" cy="29" rx="3" ry="2" fill="#dca38e"/><ellipse cx="34" cy="29" rx="3" ry="2" fill="#dca38e"/><circle cx="18" cy="24" r="2" fill="#263b37"/><circle cx="30" cy="24" r="2" fill="#263b37"/><path d="m20 29 4 4 4-4" fill="#d6a35b"/><path d="M13 37q11 9 22 0l-3 11H16z" fill="#799788"/><path d="m21 38 5 4 5-4-3 9h-4z" fill="#d6ba80"/><path d="M6 15Q24 9 42 15L40 18H8Z" fill="#34413f"/><path d="M15 13 18 3h12l3 10" fill="#34413f"/><ellipse cx="17" cy="48" rx="5" ry="2" fill="#d6a35b"/><ellipse cx="31" cy="48" rx="5" ry="2" fill="#d6a35b"/></svg>`;
export const guideIcon = guideIllustration;
export { illustration };
