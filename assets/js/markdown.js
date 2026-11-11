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
  const clean = DOMPurify.sanitize(html, { ADD_ATTR: ['data-cmd', 'data-pw-img', 'target'] });
  return labelTableCells(clean);
}

// 표 칸마다 머리글 이름을 data-label 로 붙임 — 휴대폰에서 칸이 4개 이상인 표를 줄마다 카드로 보여 줄 때 씀 (site.css 「휴대폰 표」)
function labelTableCells(html) {
  if (!html.includes('<table')) return html;
  const tpl = document.createElement('template');
  tpl.innerHTML = html;
  tpl.content.querySelectorAll('table').forEach((t) => {
    const heads = [...t.querySelectorAll('thead th')].map((th) => th.textContent.trim());
    t.querySelectorAll('tbody tr').forEach((tr) => [...tr.children].forEach((td, i) => { if (heads[i]) td.dataset.label = heads[i]; }));
    t.querySelectorAll('td').forEach(levelChips);
    if (['인첸트', '적용 장비', '최대 레벨'].every((h) => heads.includes(h))) enchantTable(t, heads);
    else if (heads.length === 2 && heads[0] === '장비' && /인첸트|인챈트/.test(heads[1])) poolTable(t);
  });
  return tpl.innerHTML;
}

// 「I 15% · II 25% · III 35%」 같은 칸 → 레벨마다 칩 하나 (줄은 칩 사이에서만 바뀜, 마지막 레벨은 강조)
// 앞에 「쿨타임:」 같은 짧은 이름표가 있으면 칩 앞에 따로 둠. 모양이 다르면 손대지 않음
const ROMAN = /^(?=[IVX])(X|IX|IV|V?I{0,3})$/;
function levelChips(td) {
  const m = td.textContent.trim().match(/^(?:([^:·]{1,12}):\s*)?(.+)$/);
  if (!m) return;
  const parts = m[2].split(/\s*·\s*/).map((s) => s.match(/^(\S+)\s+(.+)$/));
  let chips;
  if (parts.every((p) => p && ROMAN.test(p[1]))) chips = parts.map((p) => [p[1], p[2]]);
  else {
    // 「I·II·III 상시 적용」 처럼 여러 레벨이 한 값을 같이 쓰는 경우 → 칩 하나
    const one = m[2].match(/^((?:X|IX|IV|V?I{0,3})(?:\s*·\s*(?:X|IX|IV|V?I{0,3}))+)\s+(.+)$/);
    if (!one) return;
    chips = [[one[1].replace(/\s*·\s*/g, '·'), one[2]]];
  }
  const list = document.createElement('span'); // 휴대폰 카드에서 칩들이 한 칸 안에 같이 있도록 한 덩어리로
  list.className = 'lv-list';
  if (m[1]) list.append(Object.assign(document.createElement('span'), { className: 'lv-label', textContent: m[1] }));
  chips.forEach(([lv, val], i) => {
    const c = document.createElement('span');
    c.className = 'lv-chip' + (i === chips.length - 1 && chips.length > 1 ? ' max' : '');
    c.append(Object.assign(document.createElement('b'), { textContent: lv }), val);
    list.append(c);
  });
  td.textContent = '';
  td.append(list);
}

// 인첸트 표: 장비를 이름 아래 태그로 합치고, 최대 레벨은 배지로, 바로 위 제목(🔵 엘리트 …)의 등급 색을 입힘
function enchantTable(t, heads) {
  const eq = heads.indexOf('적용 장비');
  const mx = heads.indexOf('최대 레벨');
  t.classList.add('ench');
  const h2 = t.closest('.table-wrap')?.previousElementSibling;
  const title = h2 && /^H[2-4]$/.test(h2.tagName) ? h2.textContent : '';
  const tier = /레전더리|🟡/.test(title) ? 'legend' : /유니크|🟢/.test(title) ? 'unique' : /엘리트|🔵/.test(title) ? 'elite' : '';
  if (tier) t.classList.add('tier-' + tier);
  t.querySelectorAll('tr').forEach((tr) => {
    const cells = [...tr.children];
    const first = cells[0], eqCell = cells[eq], mxCell = cells[mx];
    if (!eqCell || !first) return;
    if (tr.parentElement.tagName === 'THEAD') {
      first.textContent = '인첸트 · 장비';
      if (mxCell) mxCell.textContent = '최대';
    } else {
      const name = document.createElement('div');
      name.className = 'ench-name';
      name.append(...first.childNodes);
      first.append(name);
      const tags = document.createElement('div');
      tags.className = 'ench-tags';
      eqCell.textContent.split(/\s*[·,/]\s*/).filter(Boolean).forEach((s) => tags.append(Object.assign(document.createElement('span'), { className: 'ench-tag', textContent: s })));
      first.append(tags);
      if (mxCell && ROMAN.test(mxCell.textContent.trim())) {
        const v = mxCell.textContent.trim();
        mxCell.textContent = '';
        mxCell.append(Object.assign(document.createElement('span'), { className: 'ench-lv', textContent: v }));
        mxCell.dataset.label = '최대';
      }
    }
    eqCell.remove();
  });
}

// 바닐라 「장비 | 후보 인첸트」 표: 장비 이름은 크게, 후보 인첸트는 하나씩 칩으로
function poolTable(t) {
  t.classList.add('ench', 'ench-pool');
  t.querySelectorAll('tbody tr').forEach((tr) => {
    const [first, list] = tr.children;
    if (!first || !list) return;
    const name = document.createElement('div');
    name.className = 'ench-name';
    name.textContent = first.textContent.trim().split(/\s*·\s*/).join(' · ');
    first.textContent = '';
    first.append(name);
    const picks = document.createElement('div');
    picks.className = 'ench-picks';
    list.textContent.split(/\s*[·,]\s*/).map((s) => s.trim()).filter(Boolean).forEach((s) => picks.append(Object.assign(document.createElement('span'), { className: 'ench-pick', textContent: s })));
    list.textContent = '';
    list.append(picks);
  });
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
  enchantFilter(container);
  return toc;
}

// ---- 이름 찾기 (띄어쓰기 · 대소문자 무시, 「ㄴㄹ」 처럼 초성만 써도 됨) ----
const CHO = 'ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ';
const norm = (s) => (s || '').toLowerCase().replace(/\s+/g, '');
const chosung = (s) => [...s].map((ch) => { const c = ch.charCodeAt(0) - 0xAC00; return c >= 0 && c < 11172 ? CHO[Math.floor(c / 588)] : ch; }).join('');
function textMatches(text, q) {
  const t = norm(text);
  return t.includes(q) || (/^[ㄱ-ㅎ]+$/.test(q) && chosung(t).includes(q));
}

// 인첸트 표가 있는 문서: 첫 표 위에 찾기 칸 — 이름 · 장비로 줄을 걸러 냄 (맞는 줄이 없는 표는 제목과 함께 숨김)
// 등급별 커스텀 인첸트 표면 찾기 칸 아래에 「장비별 등급」 칩: 장비마다 어느 등급에 몇 개 있는지 보여 주고, 누르면 그 장비로 거름
const TIERS = [['elite', '엘리트'], ['unique', '유니크'], ['legend', '레전더리']];
// 「방어구」 태그는 네 부위 모두에 붙는 인첸트 — 장비별로 셀 때는 부위마다 하나씩 셈
const EQUIP_GROUP = { 방어구: ['투구', '흉갑', '각반', '부츠'] };
function enchantFilter(container) {
  const tables = [...container.querySelectorAll('table.ench')];
  if (!tables.length) return;
  const pool = tables.every((t) => t.classList.contains('ench-pool'));
  const groups = tables.map((t) => {
    const wrap = t.closest('.table-wrap') || t;
    const head = wrap.previousElementSibling && /^H[2-4]$/.test(wrap.previousElementSibling.tagName) ? wrap.previousElementSibling : null;
    const tier = (TIERS.find(([k]) => t.classList.contains('tier-' + k)) || [''])[0];
    const rows = [...t.querySelectorAll('tbody tr')].map((tr) => {
      const name = tr.querySelector('.ench-name')?.textContent || tr.children[0]?.textContent || '';
      const equip = t.classList.contains('ench-pool') ? name.split(/\s*·\s*/) : [...new Set([...tr.querySelectorAll('.ench-tag')].flatMap((x) => EQUIP_GROUP[x.textContent] || [x.textContent]))];
      const picks = [...tr.querySelectorAll('.ench-pick')];
      const tags = [...equip, ...[...tr.querySelectorAll('.ench-tag')].map((x) => x.textContent)]; // 글자로 찾을 때는 「방어구」 그대로도
      return { tr, name, equip, tags, picks };
    });
    return { wrap, head, tier, rows };
  });

  const box = document.createElement('div');
  box.className = 'ench-filter';
  box.innerHTML = '<svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>'
    + `<input type="search" placeholder="${pool ? '장비 · 인첸트 찾기 (초성 OK: ㅎㅇ)' : '인첸트 · 장비 찾기 (초성 OK: ㄴㄹ)'}" aria-label="인첸트 찾기" autocomplete="off" enterkeyhint="search">`
    + '<span class="ench-count" aria-live="polite"></span>';
  const first = groups[0];
  (first.head || first.wrap).before(box);
  const input = box.querySelector('input'), count = box.querySelector('.ench-count');
  const empty = Object.assign(document.createElement('p'), { className: 'ench-empty', textContent: '찾는 인첸트가 없어요. 이름을 조금만 써 보세요.', hidden: true });

  // 장비별 등급 칩
  let equipSel = '';
  let bar = null;
  if (groups.some((g) => g.tier)) {
    const byEquip = new Map();
    groups.forEach((g) => g.rows.forEach((r) => r.equip.forEach((e) => {
      if (!byEquip.has(e)) byEquip.set(e, {});
      const c = byEquip.get(e);
      c[g.tier] = (c[g.tier] || 0) + 1;
    })));
    bar = document.createElement('div');
    bar.className = 'ench-equip';
    bar.innerHTML = `<div class="eq-head"><span>장비별 등급</span><span class="eq-legend">${TIERS.map(([k, n]) => `<i class="eq-dot ${k}"></i>${n}`).join('')}</span></div><div class="eq-list"></div>`;
    const list = bar.querySelector('.eq-list');
    byEquip.forEach((c, e) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'eq-chip';
      b.dataset.equip = e;
      b.setAttribute('aria-pressed', 'false');
      b.title = TIERS.filter(([k]) => c[k]).map(([k, n]) => `${n} ${c[k]}개`).join(' · ');
      b.append(Object.assign(document.createElement('span'), { className: 'eq-name', textContent: e }));
      TIERS.forEach(([k]) => { if (c[k]) b.append(Object.assign(document.createElement('span'), { className: 'eq-n ' + k, textContent: c[k] })); });
      list.append(b);
    });
    list.addEventListener('click', (ev) => {
      const b = ev.target.closest('.eq-chip');
      if (!b) return;
      equipSel = equipSel === b.dataset.equip ? '' : b.dataset.equip;
      list.querySelectorAll('.eq-chip').forEach((x) => x.setAttribute('aria-pressed', String(x.dataset.equip === equipSel)));
      run();
    });
    box.after(bar);
  }
  (bar || box).after(empty);

  const run = () => {
    const q = norm(input.value);
    let total = 0;
    groups.forEach((g) => {
      let n = 0;
      g.rows.forEach((r) => {
        const pickHit = r.picks.map((p) => !!q && textMatches(p.textContent, q));
        r.picks.forEach((p, i) => p.classList.toggle('hit', pickHit[i]));
        const ok = (!q || textMatches(r.name, q) || r.tags.some((e) => textMatches(e, q)) || pickHit.some(Boolean))
          && (!equipSel || r.equip.includes(equipSel));
        r.tr.hidden = !ok;
        if (ok) n++;
      });
      const filtering = !!q || !!equipSel;
      g.wrap.hidden = filtering && !n;
      if (g.head) g.head.hidden = filtering && !n;
      total += n;
    });
    count.textContent = q || equipSel ? `${total}개` : '';
    empty.hidden = !(q || equipSel) || total > 0;
  };
  input.addEventListener('input', run);
  input.addEventListener('keydown', (e) => { if (e.key === 'Escape' && input.value) { input.value = ''; run(); } });
}

// 검색 결과에서 들어왔을 때: 검색어가 들어간 줄(인첸트 이름 먼저)로 스크롤하고 잠깐 강조
export function highlightTerm(container, term) {
  const words = [term, ...term.split(/\s+/)].map(norm).filter(Boolean);
  for (const q of words) {
    const byName = [...container.querySelectorAll('table.ench tbody tr')].find((tr) => textMatches(tr.querySelector('.ench-name')?.textContent || '', q));
    const el = byName || [...container.querySelectorAll('tbody tr, li, p, h2, h3, h4, blockquote')].find((x) => norm(x.textContent).includes(q));
    if (!el) continue;
    el.scrollIntoView({ block: 'center', behavior: 'instant' });
    el.classList.add('pw-hit');
    setTimeout(() => el.classList.remove('pw-hit'), 2600);
    return true;
  }
  return false;
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
