// 마크다운 렌더링 — marked + DOMPurify (CDN ESM)
// 확장 문법
//   > [!안내] 내용        → 안내 상자(callout). 라벨은 자유 (안내 / 주의 / 팁 ...)
//   `/명령어`             → 클릭하면 복사되는 명령어 칩
import { marked } from 'https://cdn.jsdelivr.net/npm/marked@12.0.2/lib/marked.esm.js';
import DOMPurify from 'https://cdn.jsdelivr.net/npm/dompurify@3.1.6/dist/purify.es.mjs';
import { copyText, esc } from './ui.js';

marked.setOptions({ gfm: true, breaks: true });

const COPY_ICON = '<svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/></svg>';

function slugify(text, used) {
  let base = text.trim().toLowerCase().replace(/[^\p{L}\p{N}\s-]/gu, '').replace(/\s+/g, '-') || 'section';
  let s = base, i = 2;
  while (used.has(s)) s = `${base}-${i++}`;
  used.add(s);
  return s;
}

// callout: blockquote 첫 줄이 [!라벨] 로 시작하면 변환
function transformCallouts(html) {
  return html.replace(/<blockquote>\s*<p>\[!([^\]]{1,12})\]\s*([\s\S]*?)<\/blockquote>/g, (m, label, rest) => {
    return `<div class="callout"><div><span class="callout-title">${esc(label)}</span><p>${rest}</div></div>`;
  });
}

// 인라인 코드가 / 로 시작하면 복사 칩으로
function transformCommands(html) {
  return html.replace(/<code>(\/[^<]{1,80})<\/code>/g, (m, cmd) =>
    `<code class="cmd" data-cmd="${cmd}" title="클릭하면 복사됩니다">${cmd}${COPY_ICON}</code>`);
}

// 업로드 이미지: ![설명](img:문서ID) → Firestore images/{id} 의 data URL 로 나중에 채움 (resolveImages)
function transformUploadedImages(md) {
  return (md || '').replace(/!\[([^\]]*)\]\(img:([A-Za-z0-9_-]{1,40})\)/g, (m, alt, id) =>
    `<img data-pw-img="${id}" alt="${esc(alt)}">`);
}

export function renderMarkdown(md) {
  const raw = marked.parse(transformUploadedImages(md));
  // 표는 감싸는 상자 안에서만 가로 스크롤 (표 자체는 본문 폭을 꽉 채움)
  const html = transformCommands(transformCallouts(raw)).replace(/<table>/g, '<div class="table-wrap"><table>').replace(/<\/table>/g, '</table></div>');
  return DOMPurify.sanitize(html, { ADD_ATTR: ['data-cmd', 'data-pw-img', 'target'] });
}

// 렌더된 컨테이너에 목차 id 부여 + 목차 목록 반환 (업로드 이미지도 여기서 채웁니다)
export function decorate(container) {
  const used = new Set();
  const toc = [];
  container.querySelectorAll('h2, h3').forEach((h) => {
    const id = slugify(h.textContent, used);
    h.id = id;
    toc.push({ id, text: h.textContent, level: h.tagName === 'H2' ? 2 : 3 });
  });
  container.querySelectorAll('a[href^="http"]').forEach((a) => {
    a.target = '_blank';
    a.rel = 'noopener';
  });
  resolveImages(container);
  return toc;
}

// 글 사이·표 칸 안에 들어간 그림(아이템 아이콘 등)은 "글줄 그림"으로 표시합니다.
//  - 불러오는 동안 큰 빈 상자 대신 작은 자리만 차지 (화면이 덜컹거리지 않게)
//  - 그림과 바로 뒤 이름이 서로 다른 줄로 갈라지지 않게 묶음
function markInlineImages(container) {
  container.querySelectorAll('img[data-pw-img]:not(.pw-inline):not(.pw-block)').forEach((img) => {
    const parent = img.parentElement;
    const hasText = parent && Array.from(parent.childNodes).some((n) => n.nodeType === 3 && n.textContent.trim());
    if (!img.closest('td, th, li') && !hasText) { img.classList.add('pw-block'); return; }
    img.classList.add('pw-inline');
    const next = img.nextSibling;
    if (next && next.nodeType === 3) {
      const m = /^\s*\S+/.exec(next.textContent);
      if (m) {
        const rest = next.splitText(m[0].length);
        const pair = document.createElement('span');
        pair.className = 'pw-pair';
        parent.insertBefore(pair, img);
        pair.append(img, next);
        void rest;
      }
    }
  });
}

// images/{id} 를 읽어 <img data-pw-img> 에 src 를 넣습니다.
// 올린 그림은 바뀌지 않으므로(규칙상 수정 불가) 작은 그림은 브라우저에 보관해 다음부터 데이터베이스를 읽지 않습니다.
const imageCache = new Map();
const LS_PREFIX = 'pw_img_';
const LS_MAX = 64 * 1024; // 아이콘 같은 작은 그림만 보관
function cachedImage(id) {
  try { const v = localStorage.getItem(LS_PREFIX + id); return v ? JSON.parse(v) : null; } catch { return null; }
}
function keepImage(id, v) {
  if (!v || !v.data || v.data.length > LS_MAX) return;
  try { localStorage.setItem(LS_PREFIX + id, JSON.stringify(v)); } catch { /* 저장 공간이 차면 그냥 넘어감 */ }
}
export async function resolveImages(container) {
  markInlineImages(container);
  const imgs = Array.from(container.querySelectorAll('img[data-pw-img]:not([src])'));
  if (!imgs.length) return;
  let fb = null;
  const load = async (id) => {
    const hit = cachedImage(id);
    if (hit) return hit;
    fb ||= await import('./firebase.js');
    const s = await fb.getDoc(fb.doc(fb.db, 'images', id));
    if (!s.exists()) return null;
    const d = s.data();
    const v = { data: d.data, w: d.w || 0, h: d.h || 0 };
    keepImage(id, v);
    return v;
  };
  await Promise.all(imgs.map(async (img) => {
    const id = img.getAttribute('data-pw-img');
    if (!imageCache.has(id)) imageCache.set(id, load(id).catch(() => null));
    const v = await imageCache.get(id);
    if (v && v.data) {
      // 64px 이하(마인크래프트 아이템 아이콘 등)는 테두리·둥근 모서리 없이 또렷하게
      const small = (w) => w > 0 && w <= 64;
      if (small(v.w)) img.classList.add('pw-icon');
      else img.addEventListener('load', () => { if (small(img.naturalWidth)) img.classList.add('pw-icon'); }, { once: true });
      img.src = v.data;
    } else { img.classList.add('missing'); img.alt = img.alt || '이미지를 찾을 수 없습니다'; }
  }));
}

document.addEventListener('click', (e) => {
  const chip = e.target.closest('code.cmd[data-cmd]');
  if (chip) copyText(chip.getAttribute('data-cmd'));
});
