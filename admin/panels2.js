// 관리 화면 2차 패널: 이벤트 · 패치노트(카테고리) · 알림 설정 · 명령어
import { $, $$, esc, toast, fmtDate } from '../assets/js/ui.js';
import * as C from '../assets/js/content.js';
import * as T from '../assets/js/time.js';

const EDIT = '<svg aria-hidden="true" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>';
const TRASH = '<svg aria-hidden="true" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="M6 6l1 14h10l1-14"/></svg>';
const toggle = (on, attrs = '') => `<span class="toggle${on ? ' on' : ''}" role="switch" aria-checked="${on}" tabindex="0" ${attrs}></span>`;
const isOn = (el) => el.classList.contains('on');
const bindToggles = (root) => root.querySelectorAll('.toggle').forEach((t) => {
  const flip = () => { t.classList.toggle('on'); t.setAttribute('aria-checked', String(isOn(t))); t.dispatchEvent(new Event('change', { bubbles: true })); };
  t.addEventListener('click', flip);
  t.addEventListener('keydown', (e) => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); flip(); } });
});
const F = (id, label, val = '', { type = 'text', ph = '', extra = '' } = {}) =>
  `<div class="field"><label for="${id}">${label}</label><input class="input" id="${id}" type="${type}" value="${esc(val ?? '')}" placeholder="${esc(ph)}" ${extra}></div>`;

// ================= 이벤트 관리 =================
export async function renderEvents(ctx) {
  const { head, me } = ctx;
  let panel = ctx.freshPanel();
  panel.innerHTML = head('이벤트 관리') + '<div class="loading">불러오는 중</div>';
  const events = await C.listEvents();
  const now = new Date();
  const withStatus = events.map((ev) => ({ ...ev, st: T.eventStatus(ev, now) })).sort((a, b) => T.STATUS_ORDER[a.st] - T.STATUS_ORDER[b.st]);
  const count = (s) => withStatus.filter((e) => e.st === s).length;
  const BADGE = { active: 'fill', always: 'green', upcoming: 'blue', ended: 'gray' };
  // 기간은 두 줄(시작 / ~종료)로 보여 칸을 좁게 유지
  const periodCell = (ev) => {
    if (ev.kind === 'always') return esc(T.eventPeriodText(ev));
    const s = ev.startAt ? T.fmtKST(ev.startAt) : '', e = ev.endAt ? T.fmtKST(ev.endAt) : '';
    if (!s && !e) return '';
    return `${esc(s)}<br>~ ${esc(e)}`;
  };

  panel = ctx.freshPanel();
  panel.innerHTML = head('이벤트 관리', `진행 중 ${count('active')} · 상시 ${count('always')} · 예정 ${count('upcoming')} · 종료 ${count('ended')}`, '<button type="button" class="btn primary" id="ev-new">새 이벤트</button>') + `
    <div class="admin-split">
      <div class="card plain table" style="--tmin: 560px">
        <div class="thead" style="grid-template-columns: minmax(0,1fr) 136px 76px 60px 72px"><span>이벤트</span><span>기간</span><span>상태</span><span>팝업</span><span></span></div>
        ${withStatus.map((ev) => `
          <div class="tr" style="grid-template-columns: minmax(0,1fr) 136px 76px 60px 72px">
            <span title="${esc(ev.note || '')}">${esc(ev.name)}</span>
            <span style="font-size: 12px; color: var(--muted); line-height: 1.4">${periodCell(ev)}</span>
            <span><span class="tag ${BADGE[ev.st]}">${T.STATUS_LABEL[ev.st]}</span></span>
            <span>${ev.popup ? '<span class="tag green">켜짐</span>' : '<span class="tag gray">꺼짐</span>'}</span>
            <div class="actions">
              <button type="button" class="icon-btn" data-edit="${ev.id}" aria-label="편집">${EDIT}</button>
              <button type="button" class="icon-btn danger" data-del="${ev.id}" aria-label="삭제">${TRASH}</button>
            </div>
          </div>`).join('') || '<div class="empty">이벤트가 없습니다. "새 이벤트"로 추가해 주세요.</div>'}
      </div>
      <form class="card plain form-card" id="ev-form">
        <div class="row-between"><h2 style="font-size: 20px" id="ev-form-title">새 이벤트</h2><span class="subtitle" style="font-size: 12px" id="ev-form-sub"></span></div>
        <input type="hidden" id="ev-id">
        ${F('ev-name', '이벤트명', '', { ph: '예: 광물 대회' })}
        <div class="field"><span style="font-size: 13px; color: var(--label)">종류</span>
          <div class="filter-row">
            <button type="button" class="btn sm dark" data-kind="period">기간 이벤트</button>
            <button type="button" class="btn sm ghost" data-kind="always">상시 (매일 반복)</button>
          </div>
        </div>
        <div id="ev-period">
          <div class="stack" style="gap: 12px">
            ${F('ev-start', '시작 <span style="color:var(--muted)">(한국 시간)</span>', '', { type: 'datetime-local' })}
            ${F('ev-end', '종료 <span style="color:var(--muted)">(한국 시간)</span>', '', { type: 'datetime-local' })}
          </div>
        </div>
        <div id="ev-always" hidden>
          <div class="form-row">
            ${F('ev-dstart', '매일 시작 시각', '', { type: 'time' })}
            ${F('ev-dend', '매일 종료 시각', '', { type: 'time' })}
          </div>
        </div>
        ${F('ev-link', '상세 링크', '', { ph: 'guide.html?p=슬러그 또는 https://…' })}
        ${F('ev-note', '한 줄 메모 (목록에 표시)', '', { ph: '예: 보상은 우편함으로 지급' })}
        <div class="stack" style="gap: 10px; padding: 14px 16px; background: var(--cream); border: 1px solid var(--line-soft); border-radius: 12px">
          <label style="display: flex; align-items: center; justify-content: space-between; font-size: 13px; cursor: pointer">팝업 알림 노출 ${toggle(true, 'id="ev-popup"')}</label>
          <div id="ev-popup-window" class="stack" style="gap: 6px; font-size: 12px; color: var(--wood)">
            <span>노출 시간 <span style="color: var(--muted)">(비우면 진행 중인 동안 계속)</span></span>
            <div style="display: grid; grid-template-columns: minmax(0,1fr) auto minmax(0,1fr); align-items: center; gap: 6px">
              <input class="input" id="ev-pstart" type="time" style="height: 32px; padding: 0 10px; font-size: 12px; background: var(--card)">
              <span>~</span>
              <input class="input" id="ev-pend" type="time" style="height: 32px; padding: 0 10px; font-size: 12px; background: var(--card)">
            </div>
          </div>
        </div>
        <div class="notice-box" style="font-size: 12px">달력에서 고른 시각은 한국 시간(KST)으로 저장되고, 해외 접속자에게도 한국 시간으로 표시됩니다.</div>
        <div style="display: flex; gap: 8px"><button type="submit" class="btn primary" style="flex-grow: 1">저장</button><button type="button" class="btn ghost" id="ev-reset">새로</button></div>
      </form>
    </div>`;
  bindToggles(panel);

  const f = (id) => $('#' + id, panel);
  let kind = 'period';
  const setKind = (k) => {
    kind = k;
    panel.querySelectorAll('[data-kind]').forEach((b) => { b.className = `btn sm ${b.dataset.kind === k ? 'dark' : 'ghost'}`; });
    f('ev-period').hidden = k !== 'period'; f('ev-always').hidden = k !== 'always';
    f('ev-popup-window').hidden = k === 'always';
  };
  const fill = (ev) => {
    f('ev-id').value = ev?.id || ''; f('ev-name').value = ev?.name || '';
    f('ev-start').value = ev?.startAt || ''; f('ev-end').value = ev?.endAt || '';
    f('ev-dstart').value = ev?.dailyStart || ''; f('ev-dend').value = ev?.dailyEnd || '';
    f('ev-link').value = ev?.link || ''; f('ev-note').value = ev?.note || '';
    f('ev-pstart').value = ev?.popupStart || ''; f('ev-pend').value = ev?.popupEnd || '';
    const t = f('ev-popup'); t.classList.toggle('on', ev ? ev.popup !== false : true); t.setAttribute('aria-checked', String(isOn(t)));
    setKind(ev?.kind || 'period');
    f('ev-form-title').textContent = ev ? '이벤트 편집' : '새 이벤트';
    f('ev-form-sub').textContent = ev?.updatedAt ? `마지막 저장 ${fmtDate(ev.updatedAt, true)}` : '';
  };
  panel.querySelector('[data-kind]').parentElement.addEventListener('click', (e) => { const b = e.target.closest('[data-kind]'); if (b) setKind(b.dataset.kind); });
  f('ev-new').addEventListener('click', () => { fill(null); f('ev-name').focus(); });
  f('ev-reset').addEventListener('click', () => fill(null));
  f('ev-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = f('ev-name').value.trim();
    if (!name) return toast('이벤트명을 입력해 주세요');
    const data = {
      name, kind, link: f('ev-link').value.trim(), note: f('ev-note').value.trim(),
      popup: isOn(f('ev-popup')),
      startAt: kind === 'period' ? f('ev-start').value : '', endAt: kind === 'period' ? f('ev-end').value : '',
      dailyStart: kind === 'always' ? f('ev-dstart').value : '', dailyEnd: kind === 'always' ? f('ev-dend').value : '',
      popupStart: kind === 'period' ? f('ev-pstart').value : '', popupEnd: kind === 'period' ? f('ev-pend').value : '',
    };
    if (kind === 'period' && data.startAt && data.endAt && data.endAt < data.startAt) return toast('종료가 시작보다 빠릅니다');
    if (kind === 'always' && (!data.dailyStart || !data.dailyEnd)) return toast('상시 이벤트는 매일 시작·종료 시각이 필요합니다');
    await C.saveEvent(f('ev-id').value || null, data, me.name);
    toast('저장했습니다'); renderEvents(ctx);
  });
  panel.addEventListener('click', async (e) => {
    const ed = e.target.closest('[data-edit]'); if (ed) { fill(events.find((x) => x.id === ed.dataset.edit)); f('ev-name').focus(); return; }
    const dl = e.target.closest('[data-del]');
    if (dl) {
      const ev = events.find((x) => x.id === dl.dataset.del);
      if (!confirm(`"${ev.name}" 이벤트를 삭제할까요?`)) return;
      await C.deleteEvent(ev.id); toast('삭제했습니다'); renderEvents(ctx);
    }
  });
  fill(null);
}

// ================= 패치노트 관리 =================
export async function renderPatch(ctx) {
  const { head, me } = ctx;
  let panel = ctx.freshPanel();
  panel.innerHTML = head('패치노트 관리') + '<div class="loading">불러오는 중</div>';
  const [cats, notes] = await Promise.all([C.listCategories(), C.listPatchNotes({ editorView: true })]);
  panel = ctx.freshPanel();
  const nPub = notes.filter((n) => n.status === 'published' && !n.scheduled).length, nSch = notes.filter((n) => n.scheduled).length, nDraft = notes.filter((n) => n.status !== 'published').length;
  panel.innerHTML = head('패치노트 관리', `게시 ${nPub}${nSch ? ` · 예약 ${nSch}` : ''} · 임시저장 ${nDraft}`, '<button type="button" class="btn primary" id="pn-new">새 패치노트</button>') + `
    <div class="admin-split">
      <div class="stack" style="gap: 20px">
        <div class="card plain pad stack" style="gap: 14px">
          <div class="row-between" style="gap: 8px 16px"><h2 style="font-size: 20px">카테고리</h2><span class="subtitle" style="font-size: 12px">본문의 [카테고리] 줄과 이름이 같으면 이 색이 붙습니다</span></div>
          <div class="filter-row" id="cat-chips">
            ${cats.map((c) => `<button type="button" class="btn sm ghost" data-cat="${c.id}"><span class="dot" style="background:${esc(c.color)}"></span>${esc(c.name)}</button>`).join('')}
            <button type="button" class="btn sm ghost" data-cat="" style="border-style: dashed">+ 추가</button>
          </div>
          <form id="cat-form" class="stack" style="gap: 12px; padding: 14px 16px; background: var(--cream); border: 1px solid var(--line-soft); border-radius: 12px">
            <div class="row-between"><span style="font-size: 12px; color: var(--label); letter-spacing: 1px" id="cat-form-title">카테고리 추가</span><button type="button" class="btn xs ghost" id="cat-del" hidden style="color: var(--accent)">삭제</button></div>
            <input type="hidden" id="cat-id">
            <div class="form-row cat-row">
              ${F('cat-name', '이름', '', { ph: '예: 신규' })}
              ${F('cat-color', '색상 코드', C.DEFAULT_COLORS[0], { extra: 'style="font-family: var(--font-mono)"' })}
              ${F('cat-order', '순서', (cats.length + 1) * 10, { type: 'number' })}
            </div>
            <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap">
              <span style="font-size: 12px; color: var(--label)">추천 색</span>
              ${C.DEFAULT_COLORS.map((c) => `<button type="button" data-color="${c}" aria-label="${c}" style="width: 26px; height: 26px; background: ${c}; border: 2px solid var(--card); border-radius: 50%; cursor: pointer"></button>`).join('')}
              <span class="tag fill" id="cat-preview" style="margin-left: auto; background: ${C.DEFAULT_COLORS[0]}; border-color: ${C.DEFAULT_COLORS[0]}">미리보기</span>
            </div>
            <button type="submit" class="btn sm dark" style="align-self: flex-start">카테고리 저장</button>
          </form>
        </div>
        <div class="card plain table" style="--tmin: 620px">
          <div class="thead" style="grid-template-columns: 96px minmax(0,1fr) 168px 68px 72px"><span>날짜</span><span>제목</span><span>카테고리</span><span>상태</span><span></span></div>
          ${notes.map((n) => `
            <div class="tr" style="grid-template-columns: 96px minmax(0,1fr) 168px 68px 72px">
              <span style="font-size: 13px; color: var(--muted)">${esc(n.date)}</span>
              <span title="${esc(n.title || '')}">${esc(n.title || (n.categories || []).join(', '))}</span>
              <div style="display: flex; gap: 4px; flex-wrap: wrap; padding: 6px 0">${(n.categories || []).map((name) => { const c = cats.find((x) => x.name === name); return `<span class="tag fill" style="background:${c ? esc(c.color) : '#5F5E5A'};border-color:${c ? esc(c.color) : '#5F5E5A'}">${esc(name)}</span>`; }).join('')}</div>
              <span>${n.status !== 'published' ? '<span class="tag gray">임시</span>' : n.scheduled ? '<span class="tag blue" title="날짜가 되면 유저에게 보입니다">예약</span>' : '<span class="tag green">게시</span>'}</span>
              <div class="actions">
                <button type="button" class="icon-btn" data-edit="${n.id}" aria-label="편집">${EDIT}</button>
                <button type="button" class="icon-btn danger" data-del="${n.id}" aria-label="삭제">${TRASH}</button>
              </div>
            </div>`).join('') || '<div class="empty">패치노트가 없습니다.</div>'}
        </div>
      </div>
      <form class="card plain form-card" id="pn-form">
        <div class="row-between"><h2 style="font-size: 20px" id="pn-form-title">새 패치노트</h2><button type="button" class="btn xs ghost" id="pn-reset">새로</button></div>
        <input type="hidden" id="pn-id">
        <div class="stack" style="gap: 12px">
          ${F('pn-date', '날짜 <span style="color:var(--muted)">(미래 날짜로 게시하면 그날 0시(KST)부터 유저에게 보입니다)</span>', T.todayKST(), { type: 'date' })}
          ${F('pn-title', '제목 (비우면 카테고리로 자동)', '', { ph: '자동 생성' })}
        </div>
        <div class="field">
          <label for="pn-body">본문</label>
          <textarea class="textarea" id="pn-body" style="min-height: 300px; font-family: var(--font-mono); font-size: 13px" placeholder="[신규]
ㆍ추가된 내용
ㆍ또 다른 내용
[기타]
ㆍ수정된 문제"></textarea>
        </div>
        <div class="notice-box" style="font-size: 12px; display: block; line-height: 1.6"><b>양식</b> · [카테고리] 줄은 색 배지 헤더가 되고, ㆍ 또는 - 로 시작하는 줄은 항목이 됩니다. 두 칸 들여쓰면 하위 항목입니다.</div>
        <div class="card plain" style="padding: 14px 16px"><span style="font-size: 12px; color: var(--label); letter-spacing: 1px">미리보기</span><div class="pn-body" id="pn-preview" style="margin-top: 8px"></div></div>
        <div style="display: flex; gap: 8px">
          <button type="button" class="btn secondary" id="pn-draft" style="flex-grow: 1">임시저장</button>
          <button type="button" class="btn primary" id="pn-publish" style="flex-grow: 1">게시</button>
        </div>
      </form>
    </div>`;

  const f = (id) => $('#' + id, panel);
  // 카테고리 폼
  const fillCat = (c) => {
    f('cat-id').value = c?.id || ''; f('cat-name').value = c?.name || ''; f('cat-color').value = c?.color || C.DEFAULT_COLORS[0]; f('cat-order').value = c?.order ?? (cats.length + 1) * 10;
    f('cat-form-title').textContent = c ? '카테고리 편집' : '카테고리 추가'; f('cat-del').hidden = !c; preview();
  };
  const preview = () => { const col = f('cat-color').value.trim(); const p = f('cat-preview'); p.style.background = col; p.style.borderColor = col; p.textContent = f('cat-name').value.trim() || '미리보기'; };
  f('cat-color').addEventListener('input', preview); f('cat-name').addEventListener('input', preview);
  panel.querySelectorAll('[data-color]').forEach((b) => b.addEventListener('click', () => { f('cat-color').value = b.dataset.color; preview(); }));
  f('cat-chips').addEventListener('click', (e) => { const b = e.target.closest('[data-cat]'); if (b) fillCat(cats.find((x) => x.id === b.dataset.cat) || null); });
  f('cat-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = f('cat-name').value.trim(), color = f('cat-color').value.trim();
    if (!name) return toast('이름을 입력해 주세요');
    if (!/^#[0-9a-fA-F]{6}$/.test(color)) return toast('색상 코드는 #과 6자리 (예: #A63A2B)');
    await C.saveCategory(f('cat-id').value || null, { name, color, order: Number(f('cat-order').value) || 0 });
    toast('저장했습니다'); renderPatch(ctx);
  });
  f('cat-del').addEventListener('click', async () => {
    const id = f('cat-id').value; if (!id) return;
    if (!confirm('카테고리를 삭제할까요? 기존 패치노트의 배지는 회색으로 표시됩니다.')) return;
    await C.deleteCategory(id); toast('삭제했습니다'); renderPatch(ctx);
  });

  // 패치노트 폼
  const fillNote = (n) => {
    f('pn-id').value = n?.id || ''; f('pn-date').value = n?.date || T.todayKST(); f('pn-title').value = n?.titleManual ? n.title : ''; f('pn-body').value = n?.body || '';
    f('pn-form-title').textContent = n ? '패치노트 편집' : '새 패치노트'; renderPreview();
  };
  const renderPreview = () => { f('pn-preview').innerHTML = C.renderPatchBody(f('pn-body').value, cats) || '<span style="color: var(--muted); font-size: 13px">본문을 입력하면 미리보기가 나타납니다</span>'; };
  f('pn-body').addEventListener('input', renderPreview);
  const collect = (status) => {
    const body = f('pn-body').value, categories = C.extractCategories(body);
    const manual = f('pn-title').value.trim();
    if (!f('pn-date').value) { toast('날짜를 선택해 주세요'); return null; }
    if (!body.trim()) { toast('본문을 입력해 주세요'); return null; }
    return { date: f('pn-date').value, body, categories, title: manual || categories.join(', ') || '패치노트', titleManual: !!manual, status };
  };
  const save = async (status) => {
    const d = collect(status); if (!d) return;
    await C.savePatchNote(f('pn-id').value || null, d, me.name);
    const scheduled = status === 'published' && d.date > T.todayKST();
    toast(status !== 'published' ? '임시저장했습니다' : scheduled ? `${d.date}부터 보이도록 예약했습니다` : '게시했습니다'); renderPatch(ctx);
  };
  f('pn-draft').addEventListener('click', () => save('draft'));
  f('pn-publish').addEventListener('click', () => save('published'));
  f('pn-new').addEventListener('click', () => { fillNote(null); f('pn-body').focus(); });
  f('pn-reset').addEventListener('click', () => fillNote(null));
  panel.addEventListener('click', async (e) => {
    const ed = e.target.closest('[data-edit]'); if (ed) { fillNote(notes.find((x) => x.id === ed.dataset.edit)); f('pn-body').focus(); return; }
    const dl = e.target.closest('[data-del]');
    if (dl) {
      const n = notes.find((x) => x.id === dl.dataset.del);
      if (!confirm(`${n.date} "${n.title}" 패치노트를 삭제할까요?`)) return;
      await C.deletePatchNote(n.id); toast('삭제했습니다'); renderPatch(ctx);
    }
  });
  fillCat(null); fillNote(null);
}

// ================= 알림 설정 =================
export async function renderPopups(ctx) {
  const { head, me } = ctx;
  let panel = ctx.freshPanel();
  panel.innerHTML = head('알림 설정') + '<div class="loading">불러오는 중</div>';
  const s = await C.getPopupSettings();
  panel = ctx.freshPanel();
  panel.innerHTML = head('알림 설정', '하단 우측 팝업의 동작 규칙') + `
    <div class="admin-split even">
      <form class="card plain form-card" id="ml-form" style="border-color: var(--line)">
        <div class="row-between"><h2 style="font-size: 20px">마인리스트 추천 알림</h2>${toggle(!!s.enabled, 'id="ml-enabled"')}</div>
        <div class="form-row">${F('ml-start', '매일 노출 시작', s.start || '23:30', { type: 'time' })}${F('ml-end', '노출 종료', s.end || '23:59', { type: 'time' })}</div>
        ${F('ml-url', '마인리스트 추천 링크', s.url || '', { ph: 'https://minelist.kr/servers/…/votes/new' })}
        ${F('ml-text', '팝업 문구', s.text || '', { ph: '예: 오늘의 마인리스트 추천을 부탁드려요' })}
        <div class="notice-box" style="font-size: 12px">추천하기 또는 닫기를 누르면 그날은 다시 뜨지 않고, 다음 날 같은 시간대에 다시 뜹니다. 시각은 한국 시간 기준입니다.</div>
        <button type="submit" class="btn primary">저장</button>
      </form>
      <div class="card plain pad stack" style="gap: 12px">
        <h2 style="font-size: 20px">이벤트 알림 규칙</h2>
        <ul style="margin: 0; padding-left: 18px; font-size: 14px; line-height: 1.8; color: var(--wood-dark)">
          <li>각 이벤트의 "팝업 알림 노출"이 켜져 있고 진행 중일 때만 뜹니다 (이벤트 관리에서 설정)</li>
          <li>유저가 하트를 하나도 안 눌렀으면 진행 중인 이벤트 전부, 하트를 눌렀으면 누른 것만 뜹니다</li>
          <li>닫으면 그날은 다시 뜨지 않습니다. 한 번에 최대 3개까지 표시합니다</li>
          <li>상시 이벤트는 매일 시작~종료 시각 안에서만 뜨고, 종료까지 남은 시간을 셉니다</li>
        </ul>
        <a class="btn sm secondary" href="#events" style="align-self: flex-start">이벤트 관리로</a>
      </div>
    </div>`;
  bindToggles(panel);
  $('#ml-form', panel).addEventListener('submit', async (e) => {
    e.preventDefault();
    const v = (id) => $('#' + id, panel).value.trim();
    await C.savePopupSettings({ enabled: isOn($('#ml-enabled', panel)), start: v('ml-start'), end: v('ml-end'), url: v('ml-url'), text: v('ml-text') }, me.name);
    toast('저장했습니다');
  });
}

// ================= 명령어 관리 =================
export async function renderCommands(ctx) {
  const { head, me } = ctx;
  let panel = ctx.freshPanel();
  panel.innerHTML = head('명령어 관리') + '<div class="loading">불러오는 중</div>';
  const cmds = await C.listCommands();
  const cats = [...new Set(cmds.map((c) => c.category).filter(Boolean))];
  panel = ctx.freshPanel();
  panel.innerHTML = head('명령어 관리', `명령어 ${cmds.length}개 · 분류 ${cats.length}개`, '<button type="button" class="btn primary" id="cm-new">새 명령어</button>') + `
    <div class="admin-split">
      <div class="card plain table" style="--tmin: 640px">
        <div class="thead" style="grid-template-columns: 48px minmax(0,1fr) minmax(0,1.3fr) 90px 80px 72px"><span>순서</span><span>명령어</span><span>설명</span><span>분류</span><span>권한</span><span></span></div>
        ${cmds.map((c) => `
          <div class="tr" style="grid-template-columns: 48px minmax(0,1fr) minmax(0,1.3fr) 90px 80px 72px">
            <span style="color: var(--muted)">${c.order ?? 0}</span>
            <div class="stack" style="gap: 2px; align-items: flex-start; padding: 8px 0"><code class="cmd-chip" title="${esc(c.command)}">${esc(c.command)}</code>${c.aliases ? `<span style="font-size: 11px; color: var(--muted); max-width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap">별칭 ${esc(c.aliases)}</span>` : ''}</div>
            <span style="font-size: 13px" title="${esc(c.desc || '')}">${esc(c.desc || '')}</span>
            <span style="font-size: 13px">${esc(c.category || '')}</span>
            <span>${c.permission ? `<span class="tag">${esc(c.permission)}</span>` : ''}</span>
            <div class="actions">
              <button type="button" class="icon-btn" data-edit="${c.id}" aria-label="편집">${EDIT}</button>
              <button type="button" class="icon-btn danger" data-del="${c.id}" aria-label="삭제">${TRASH}</button>
            </div>
          </div>`).join('') || '<div class="empty">명령어가 없습니다.</div>'}
      </div>
      <form class="card plain form-card" id="cm-form">
        <div class="row-between"><h2 style="font-size: 20px" id="cm-form-title">새 명령어</h2><button type="button" class="btn xs ghost" id="cm-reset">새로</button></div>
        <input type="hidden" id="cm-id">
        ${F('cm-command', '명령어', '', { ph: '/명령어 [인자]', extra: 'style="font-family: var(--font-mono)"' })}
        ${F('cm-aliases', '별칭 (쉼표로 구분)', '', { ph: '/짧은명령, /alias' })}
        ${F('cm-desc', '설명', '')}
        <div class="form-row">
          <div class="field"><label for="cm-category">분류</label><input class="input" id="cm-category" list="cm-cats" placeholder="예: 기본"><datalist id="cm-cats">${cats.map((c) => `<option value="${esc(c)}">`).join('')}</datalist></div>
          ${F('cm-permission', '권한', '', { ph: '예: 전체 / VIP / 운영자' })}
        </div>
        ${F('cm-order', '순서', (cmds.length + 1) * 10, { type: 'number' })}
        <button type="submit" class="btn primary">저장</button>
      </form>
    </div>`;
  const f = (id) => $('#' + id, panel);
  const fill = (c) => {
    f('cm-id').value = c?.id || ''; f('cm-command').value = c?.command || ''; f('cm-aliases').value = c?.aliases || ''; f('cm-desc').value = c?.desc || '';
    f('cm-category').value = c?.category || ''; f('cm-permission').value = c?.permission || ''; f('cm-order').value = c?.order ?? (cmds.length + 1) * 10;
    f('cm-form-title').textContent = c ? '명령어 편집' : '새 명령어';
  };
  f('cm-new').addEventListener('click', () => { fill(null); f('cm-command').focus(); });
  f('cm-reset').addEventListener('click', () => fill(null));
  f('cm-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const command = f('cm-command').value.trim();
    if (!command) return toast('명령어를 입력해 주세요');
    await C.saveCommand(f('cm-id').value || null, {
      command, aliases: f('cm-aliases').value.trim(), desc: f('cm-desc').value.trim(),
      category: f('cm-category').value.trim(), permission: f('cm-permission').value.trim(), order: Number(f('cm-order').value) || 0,
    }, me.name);
    toast('저장했습니다'); renderCommands(ctx);
  });
  panel.addEventListener('click', async (e) => {
    const ed = e.target.closest('[data-edit]'); if (ed) { fill(cmds.find((x) => x.id === ed.dataset.edit)); f('cm-command').focus(); return; }
    const dl = e.target.closest('[data-del]');
    if (dl) {
      const c = cmds.find((x) => x.id === dl.dataset.del);
      if (!confirm(`"${c.command}" 를 삭제할까요?`)) return;
      await C.deleteCommand(c.id); toast('삭제했습니다'); renderCommands(ctx);
    }
  });
  fill(null);
}

// ================= 시세 데이터 =================
export async function renderPrices(ctx) {
  const { head, me } = ctx;
  let panel = ctx.freshPanel();
  panel.innerHTML = head('시세 데이터') + '<div class="loading">불러오는 중</div>';
  const [items, note] = await Promise.all([C.listPrices(), C.getPriceNote()]);
  const cats = [...new Set(items.map((i) => i.category).filter(Boolean))];
  const fmtNum = (n) => Number(n).toLocaleString('ko-KR');
  panel = ctx.freshPanel();
  panel.innerHTML = head('시세 데이터', `아이템 ${items.length}개 · 분류 ${cats.length}개`) + `
    <div class="admin-split">
      <div class="stack" style="gap: 20px">
        <div class="card plain table" style="--tmin: 640px">
          <div class="thead" style="grid-template-columns: minmax(0,1fr) 90px 100px 90px 88px 72px"><span>아이템</span><span>분류</span><span>현재가</span><span>전일가</span><span>갱신</span><span></span></div>
          ${items.map((i) => `
            <div class="tr" style="grid-template-columns: minmax(0,1fr) 90px 100px 90px 88px 72px; min-height: 50px">
              <span title="${esc(i.name)}">${esc(i.name)}${i.unit ? `<span style="font-size: 11px; color: var(--muted)"> /${esc(i.unit)}</span>` : ''}</span>
              <span style="font-size: 13px">${esc(i.category || '')}</span>
              <span>${fmtNum(i.price)}</span>
              <span style="font-size: 13px; color: var(--muted)">${i.prevPrice != null ? fmtNum(i.prevPrice) : '-'}</span>
              <span style="font-size: 12px; color: var(--muted)">${fmtDate(i.updatedAt)}</span>
              <div class="actions">
                <button type="button" class="icon-btn" data-edit="${i.id}" aria-label="편집">${EDIT}</button>
                <button type="button" class="icon-btn danger" data-del="${i.id}" aria-label="삭제">${TRASH}</button>
              </div>
            </div>`).join('') || '<div class="empty">아직 시세가 없습니다. 오른쪽에서 한 건씩 넣거나 아래에 붙여넣어 주세요.</div>'}
        </div>
        <form class="card plain form-card" id="pr-import" style="border-color: var(--line)">
          <div class="row-between"><h2 style="font-size: 20px">한꺼번에 붙여넣기</h2><span class="subtitle" style="font-size: 12px">같은 이름은 덮어쓰고, 가격이 바뀌면 전일가·추이가 갱신됩니다</span></div>
          <textarea class="textarea" id="pr-text" style="min-height: 160px; font-family: var(--font-mono); font-size: 13px" placeholder="다이아몬드, 광물, 1200
철괴, 광물, 80, 개
[{&quot;name&quot;:&quot;다이아몬드&quot;,&quot;category&quot;:&quot;광물&quot;,&quot;price&quot;:1200}]"></textarea>
          <div class="notice-box" style="font-size: 12px; display: block; line-height: 1.6">
            <b>CSV</b> 한 줄에 <code>이름, 분류, 가격, 단위</code> (분류·단위 생략 가능, 탭 구분도 됨) · <b>JSON</b> <code>[{"name","category","price","unit"}]</code> 배열<br>
            운영자 스크립트가 직접 넣을 때는 Firestore <code>prices/{아이템id}</code> 문서에 같은 필드(name, category, price, prevPrice, unit, history[{d,p}], updatedAt)를 쓰면 이 화면과 시세 페이지에 그대로 반영됩니다.
          </div>
          <div style="display: flex; gap: 8px; align-items: center">
            <button type="submit" class="btn primary">가져오기</button>
            <span class="subtitle" style="font-size: 12px" id="pr-import-status"></span>
          </div>
        </form>
        <form class="card plain form-card" id="pr-note" style="border-color: var(--line)">
          <h2 style="font-size: 20px">시세 페이지 하단 안내 문구</h2>
          ${F('pr-note-text', '출처 · 갱신 주기 등', note, { ph: '예: 유저 상점 거래가 기준, 매일 자정 갱신' })}
          <button type="submit" class="btn sm dark" style="align-self: flex-start">저장</button>
        </form>
      </div>
      <form class="card plain form-card" id="pr-form">
        <div class="row-between"><h2 style="font-size: 20px" id="pr-form-title">아이템 추가</h2><button type="button" class="btn xs ghost" id="pr-reset">새로</button></div>
        ${F('pr-name', '아이템 이름', '', { ph: '예: 다이아몬드' })}
        <div class="form-row">
          <div class="field"><label for="pr-cat">분류</label><input class="input" id="pr-cat" list="pr-cats" placeholder="예: 광물"><datalist id="pr-cats">${cats.map((c) => `<option value="${esc(c)}">`).join('')}</datalist></div>
          ${F('pr-unit', '단위', '', { ph: '예: 개, 64개' })}
        </div>
        ${F('pr-price', '현재가', '', { type: 'number', ph: '숫자만' })}
        <div class="notice-box" style="font-size: 12px">저장하면 오늘 날짜로 이력이 쌓이고, 이전 가격이 전일가로 넘어갑니다. 하루에 여러 번 저장하면 오늘 값만 갱신됩니다.</div>
        <button type="submit" class="btn primary">저장</button>
      </form>
    </div>`;
  const f = (id) => $('#' + id, panel);
  const fill = (i) => {
    f('pr-name').value = i?.name || ''; f('pr-name').readOnly = !!i; f('pr-cat').value = i?.category || ''; f('pr-unit').value = i?.unit || ''; f('pr-price').value = i?.price ?? '';
    f('pr-form-title').textContent = i ? '시세 갱신' : '아이템 추가';
  };
  f('pr-reset').addEventListener('click', () => fill(null));
  f('pr-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = f('pr-name').value.trim(), price = Number(f('pr-price').value);
    if (!name || !Number.isFinite(price)) return toast('이름과 가격을 확인해 주세요');
    await C.savePrice({ name, category: f('pr-cat').value, unit: f('pr-unit').value, price, source: 'manual' }, me.name, T.todayKST());
    toast('저장했습니다'); renderPrices(ctx);
  });
  f('pr-import').addEventListener('submit', async (e) => {
    e.preventDefault();
    let rowsToImport;
    try { rowsToImport = C.parsePriceImport(f('pr-text').value); } catch (err) { return toast('형식을 읽지 못했습니다: ' + err.message); }
    if (!rowsToImport.length) return toast('가져올 줄이 없습니다');
    const st = f('pr-import-status');
    let n = 0;
    for (const r of rowsToImport) { await C.savePrice({ ...r, source: 'import' }, me.name, T.todayKST()); st.textContent = `${++n}/${rowsToImport.length} 저장 중`; }
    toast(`${n}건 가져왔습니다`); renderPrices(ctx);
  });
  f('pr-note').addEventListener('submit', async (e) => { e.preventDefault(); await C.savePriceNote(f('pr-note-text').value.trim(), me.name); toast('저장했습니다'); });
  panel.addEventListener('click', async (e) => {
    const ed = e.target.closest('[data-edit]'); if (ed) { fill(items.find((x) => x.id === ed.dataset.edit)); f('pr-price').focus(); return; }
    const dl = e.target.closest('[data-del]');
    if (dl) {
      const i = items.find((x) => x.id === dl.dataset.del);
      if (!confirm(`"${i.name}" 시세를 삭제할까요? 이력도 함께 지워집니다.`)) return;
      await C.deletePrice(i.id); toast('삭제했습니다'); renderPrices(ctx);
    }
  });
  fill(null);
}
