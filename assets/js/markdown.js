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
  const html = transformCommands(transformCallouts(raw));
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

// images/{id} 를 읽어 <img data-pw-img> 에 src 를 넣습니다. 같은 세션에서는 한 번만 읽습니다.
const imageCache = new Map();
export async function resolveImages(container) {
  const imgs = Array.from(container.querySelectorAll('img[data-pw-img]:not([src])'));
  if (!imgs.length) return;
  const { db, doc, getDoc } = await import('./firebase.js');
  await Promise.all(imgs.map(async (img) => {
    const id = img.getAttribute('data-pw-img');
    if (!imageCache.has(id)) {
      imageCache.set(id, getDoc(doc(db, 'images', id)).then((s) => (s.exists() ? s.data().data : null)).catch(() => null));
    }
    const data = await imageCache.get(id);
    if (data) img.src = data;
    else { img.classList.add('missing'); img.alt = img.alt || '이미지를 찾을 수 없습니다'; }
  }));
}

document.addEventListener('click', (e) => {
  const chip = e.target.closest('code.cmd[data-cmd]');
  if (chip) copyText(chip.getAttribute('data-cmd'));
});
