// 관리 화면 2차 패널: 이벤트 · 패치노트(카테고리) · 알림 설정 · 명령어
import { $, $$, esc, toast, fmtDate, errText } from '../assets/js/ui.js';
import * as C from '../assets/js/content.js';
import * as T from '../assets/js/time.js';
import * as D from '../assets/js/discord.js';

const EDIT = '<svg aria-hidden="true" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>';
const TRASH = '<svg aria-hidden="true" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="M6 6l1 14h10l1-14"/></svg>';
const BELL = '<svg aria-hidden="true" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10 21a2 2 0 0 0 4 0"/></svg>';
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
      <div class="card plain table" style="--tmin: 590px">
        <div class="thead" style="grid-template-columns: minmax(0,1fr) 136px 76px 60px 104px"><span>이벤트</span><span>기간</span><span>상태</span><span>팝업</span><span></span></div>
        ${withStatus.map((ev) => `
          <div class="tr" style="grid-template-columns: minmax(0,1fr) 136px 76px 60px 104px">
            <span title="${esc(ev.note || '')}">${esc(ev.name)}</span>
            <span style="font-size: 12px; color: var(--muted); line-height: 1.4">${periodCell(ev)}</span>
            <span><span class="tag ${BADGE[ev.st]}">${T.STATUS_LABEL[ev.st]}</span></span>
            <span>${ev.popup ? '<span class="tag green">켜짐</span>' : '<span class="tag gray">꺼짐</span>'}</span>
            <div class="actions">
              <button type="button" class="icon-btn" data-notify="${ev.id}" aria-label="디스코드에 알리기" title="디스코드에 알리기">${BELL}</button>
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
    toast('저장했습니다');
    const st = T.eventStatus(data, new Date());
    if (st !== 'ended') {
      try { const dc = await D.getDiscordSettings(); if (dc.webhook && dc.notifyEvent !== false && await D.notifyEvent(data, T.eventPeriodText(data), T.STATUS_LABEL[st])) toast('디스코드에도 알렸습니다'); }
      catch (err) { toast('디스코드 알림 실패: ' + (err.message || err)); }
    }
    renderEvents(ctx);
  });
  panel.addEventListener('click', async (e) => {
    const nt = e.target.closest('[data-notify]');
    if (nt) {
      const ev = withStatus.find((x) => x.id === nt.dataset.notify);
      if (!confirm(`"${ev.name}" 이벤트를 디스코드에 알릴까요?`)) return;
      try { (await D.notifyEvent(ev, T.eventPeriodText(ev), T.STATUS_LABEL[ev.st])) ? toast('디스코드에 알렸습니다') : toast('알림 설정에서 웹훅 주소를 먼저 넣어 주세요'); } catch (err) { toast('디스코드 알림 실패: ' + (err.message || err)); }
      return;
    }
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
    <div class="stack" style="gap: 20px">
      <form class="card plain form-card" id="pn-form">
        <div class="row-between"><h2 style="font-size: 20px" id="pn-form-title">새 패치노트</h2><button type="button" class="btn xs ghost" id="pn-reset">새로</button></div>
        <input type="hidden" id="pn-id">
        <div class="pn-meta">
          ${F('pn-date', '날짜 <span style="color:var(--muted)">(미래 날짜로 게시하면 그날 0시(KST)부터 유저에게 보입니다)</span>', T.todayKST(), { type: 'date' })}
          ${F('pn-title', '제목 <span style="color:var(--muted)">(비우면 날짜로 자동)</span>', '', { ph: C.autoPatchTitle(T.todayKST()) })}
        </div>
        <div class="pn-write">
          <div class="field">
            <label for="pn-body">본문</label>
            <textarea class="textarea" id="pn-body" style="font-family: var(--font-mono); font-size: 13px" placeholder="[신규]
ㆍ추가된 내용
ㆍ또 다른 내용
[기타]
ㆍ수정된 문제"></textarea>
          </div>
          <div class="pn-preview-col">
            <span class="pn-preview-label">미리보기</span>
            <div class="card plain pn-preview-card"><div class="pn-body" id="pn-preview"></div></div>
          </div>
        </div>
        <div class="notice-box" style="font-size: 12px; display: block; line-height: 1.6"><b>양식</b> · [카테고리] 줄은 색 배지 헤더가 되고, ㆍ 또는 - 로 시작하는 줄은 항목이 됩니다. 두 칸 들여쓰면 하위 항목입니다.</div>
        <div class="pn-actions">
          <button type="button" class="btn secondary" id="pn-draft">임시저장</button>
          <button type="button" class="btn primary" id="pn-publish">게시</button>
        </div>
      </form>
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
              <div class="field"><span style="font-size: 13px; color: var(--label)">자리</span>
                <div style="display: flex; gap: 4px"><button type="button" class="btn xs ghost" id="cat-left" title="앞으로" disabled>◀</button><button type="button" class="btn xs ghost" id="cat-right" title="뒤로" disabled>▶</button></div>
              </div>
            </div>
            <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap">
              <span style="font-size: 12px; color: var(--label)">추천 색</span>
              ${C.DEFAULT_COLORS.map((c) => `<button type="button" data-color="${c}" aria-label="${c}" style="width: 26px; height: 26px; background: ${c}; border: 2px solid var(--card); border-radius: 50%; cursor: pointer"></button>`).join('')}
              <span class="tag fill" id="cat-preview" style="margin-left: auto; background: ${C.DEFAULT_COLORS[0]}; border-color: ${C.DEFAULT_COLORS[0]}">미리보기</span>
            </div>
            <button type="submit" class="btn sm dark" style="align-self: flex-start">카테고리 저장</button>
          </form>
        </div>
        <div class="card plain table" style="--tmin: 650px">
          <div class="thead" style="grid-template-columns: 96px minmax(0,1fr) 168px 68px 104px"><span>날짜</span><span>제목</span><span>카테고리</span><span>상태</span><span></span></div>
          ${notes.map((n) => `
            <div class="tr" style="grid-template-columns: 96px minmax(0,1fr) 168px 68px 104px">
              <span style="font-size: 13px; color: var(--muted)">${esc(n.date)}</span>
              <span title="${esc(C.patchTitle(n))}">${esc(C.patchTitle(n))}</span>
              <div style="display: flex; gap: 4px; flex-wrap: wrap; padding: 6px 0">${(n.categories || []).map((name) => { const c = cats.find((x) => x.name === name); return `<span class="tag fill" style="background:${c ? esc(c.color) : '#5F5E5A'};border-color:${c ? esc(c.color) : '#5F5E5A'}">${esc(name)}</span>`; }).join('')}</div>
              <span>${n.status !== 'published' ? '<span class="tag gray">임시</span>' : n.scheduled ? '<span class="tag blue" title="날짜가 되면 유저에게 보입니다">예약</span>' : '<span class="tag green">게시</span>'}</span>
              <div class="actions">
                <button type="button" class="icon-btn" data-notify="${n.id}" aria-label="디스코드에 알리기" title="디스코드에 알리기" ${n.status !== 'published' ? 'disabled' : ''}>${BELL}</button>
                <button type="button" class="icon-btn" data-edit="${n.id}" aria-label="편집">${EDIT}</button>
                <button type="button" class="icon-btn danger" data-del="${n.id}" aria-label="삭제">${TRASH}</button>
              </div>
            </div>`).join('') || '<div class="empty">패치노트가 없습니다.</div>'}
        </div>
      </div>
    </div>`;

  const f = (id) => $('#' + id, panel);
  // 카테고리 폼
  let editingCat = null;
  const fillCat = (c) => {
    editingCat = c || null;
    f('cat-id').value = c?.id || ''; f('cat-name').value = c?.name || ''; f('cat-color').value = c?.color || C.DEFAULT_COLORS[0];
    f('cat-form-title').textContent = c ? '카테고리 편집' : '카테고리 추가'; f('cat-del').hidden = !c; preview();
    const i = c ? cats.indexOf(c) : -1;
    f('cat-left').disabled = i <= 0; f('cat-right').disabled = i < 0 || i >= cats.length - 1;
    panel.querySelectorAll('#cat-chips [data-cat]').forEach((b) => b.classList.toggle('dark', !!c && b.dataset.cat === c.id));
  };
  // 카테고리 자리 옮기기: 배지 줄과 필터 순서가 바뀝니다 (10, 20, 30…으로 다시 매김)
  const moveCat = async (dir) => {
    const i = cats.indexOf(editingCat), j = i + dir;
    if (i < 0 || j < 0 || j >= cats.length) return;
    [cats[i], cats[j]] = [cats[j], cats[i]];
    const { db, doc, writeBatch } = await import('../assets/js/firebase.js');
    const batch = writeBatch(db);
    cats.forEach((c, k) => { const o = (k + 1) * 10; if ((c.order ?? 0) !== o) batch.update(doc(db, 'patchCategories', c.id), { order: o }); });
    await batch.commit();
    renderPatch(ctx);
  };
  f('cat-left').addEventListener('click', () => moveCat(-1));
  f('cat-right').addEventListener('click', () => moveCat(1));
  const preview = () => { const col = f('cat-color').value.trim(); const p = f('cat-preview'); p.style.background = col; p.style.borderColor = col; p.textContent = f('cat-name').value.trim() || '미리보기'; };
  f('cat-color').addEventListener('input', preview); f('cat-name').addEventListener('input', preview);
  panel.querySelectorAll('[data-color]').forEach((b) => b.addEventListener('click', () => { f('cat-color').value = b.dataset.color; preview(); }));
  f('cat-chips').addEventListener('click', (e) => { const b = e.target.closest('[data-cat]'); if (b) fillCat(cats.find((x) => x.id === b.dataset.cat) || null); });
  f('cat-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = f('cat-name').value.trim(), color = f('cat-color').value.trim();
    if (!name) return toast('이름을 입력해 주세요');
    if (!/^#[0-9a-fA-F]{6}$/.test(color)) return toast('색상 코드는 #과 6자리 (예: #A63A2B)');
    if (editingCat && editingCat.name !== name && !confirm(`이름을 "${editingCat.name}" → "${name}"(으)로 바꿀까요?\n이미 쓴 패치노트는 본문의 [${editingCat.name}] 줄 이름으로 색을 찾기 때문에, 그 배지는 회색으로 보입니다.`)) return;
    const order = editingCat ? (editingCat.order ?? 0) : Math.max(0, ...cats.map((c) => c.order ?? 0)) + 10; // 새 카테고리는 맨 뒤
    await C.saveCategory(f('cat-id').value || null, { name, color, order });
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
    f('pn-form-title').textContent = n ? '패치노트 편집' : '새 패치노트'; renderPreview(); syncTitlePh();
  };
  // 제목 칸이 비었을 때 저장될 제목을 흐린 글씨로 보여 줌 (날짜를 바꾸면 따라 바뀜)
  const syncTitlePh = () => { f('pn-title').placeholder = C.autoPatchTitle(f('pn-date').value); };
  f('pn-date').addEventListener('input', syncTitlePh);
  const renderPreview = () => { f('pn-preview').innerHTML = C.renderPatchBody(f('pn-body').value, cats) || '<span style="color: var(--muted); font-size: 13px">본문을 입력하면 미리보기가 나타납니다</span>'; };
  f('pn-body').addEventListener('input', renderPreview);
  const collect = (status) => {
    const body = f('pn-body').value, categories = C.extractCategories(body);
    const manual = f('pn-title').value.trim();
    if (!f('pn-date').value) { toast('날짜를 선택해 주세요'); return null; }
    if (!body.trim()) { toast('본문을 입력해 주세요'); return null; }
    return { date: f('pn-date').value, body, categories, title: manual || C.autoPatchTitle(f('pn-date').value), titleManual: !!manual, status };
  };
  const save = async (status) => {
    const d = collect(status); if (!d) return;
    await C.savePatchNote(f('pn-id').value || null, d, me.name);
    const scheduled = status === 'published' && d.date > T.todayKST();
    toast(status !== 'published' ? '임시저장했습니다' : scheduled ? `${d.date}부터 보이도록 예약했습니다 (디스코드 알림은 날짜에 종 버튼으로)` : '게시했습니다');
    if (status === 'published' && !scheduled) {
      try { const dc = await D.getDiscordSettings(); if (dc.webhook && dc.notifyPatch !== false && await D.notifyPatch(d)) toast('디스코드에도 알렸습니다'); }
      catch (err) { toast('디스코드 알림 실패: ' + (err.message || err)); }
    }
    renderPatch(ctx);
  };
  f('pn-draft').addEventListener('click', () => save('draft'));
  f('pn-publish').addEventListener('click', () => save('published'));
  // 작성 칸이 목록 위에 있어서, 편집 · 새로 만들기 때 작성 칸으로 올라감
  const toForm = () => { f('pn-form').scrollIntoView({ behavior: 'smooth', block: 'start' }); f('pn-body').focus({ preventScroll: true }); };
  f('pn-new').addEventListener('click', () => { fillNote(null); toForm(); });
  f('pn-reset').addEventListener('click', () => fillNote(null));
  panel.addEventListener('click', async (e) => {
    const nt = e.target.closest('[data-notify]');
    if (nt && !nt.disabled) {
      const n = notes.find((x) => x.id === nt.dataset.notify);
      if (!confirm(`"${C.patchTitle(n)}" 패치노트를 디스코드에 알릴까요?`)) return;
      try { (await D.notifyPatch(n)) ? toast('디스코드에 알렸습니다') : toast('알림 설정에서 웹훅 주소를 먼저 넣어 주세요'); } catch (err) { toast('디스코드 알림 실패: ' + (err.message || err)); }
      return;
    }
    const ed = e.target.closest('[data-edit]'); if (ed) { fillNote(notes.find((x) => x.id === ed.dataset.edit)); toForm(); return; }
    const dl = e.target.closest('[data-del]');
    if (dl) {
      const n = notes.find((x) => x.id === dl.dataset.del);
      if (!confirm(`${n.date} "${C.patchTitle(n)}" 패치노트를 삭제할까요?`)) return;
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
  const [s, dc] = await Promise.all([C.getPopupSettings(), D.getDiscordSettings()]);
  panel = ctx.freshPanel();
  const rowHtml = (w = { start: '', end: '', text: '' }) => `
    <div class="ml-window" style="display: grid; grid-template-columns: 112px 16px 112px minmax(0,1fr) 30px; gap: 6px; align-items: center">
      <input class="input" type="time" data-w="start" value="${esc(w.start || '')}" style="height: 36px; padding: 0 10px; font-size: 13px" aria-label="시작">
      <span style="text-align: center; color: var(--muted)">~</span>
      <input class="input" type="time" data-w="end" value="${esc(w.end || '')}" style="height: 36px; padding: 0 10px; font-size: 13px" aria-label="종료">
      <input class="input" data-w="text" value="${esc(w.text || '')}" placeholder="이 시간대 문구 (비우면 기본 문구)" style="height: 36px; font-size: 13px">
      <button type="button" class="icon-btn danger" data-del-window aria-label="시간대 삭제" style="width: 28px; height: 28px; font-size: 12px">×</button>
    </div>`;
  panel.innerHTML = head('알림 설정', '하단 우측 팝업의 동작 규칙') + `
    <div class="admin-split even">
      <form class="card plain form-card" id="ml-form" style="border-color: var(--line)">
        <div class="row-between"><h2 style="font-size: 20px">마인리스트 추천 알림</h2>${toggle(!!s.enabled, 'id="ml-enabled"')}</div>
        <div class="field">
          <span style="font-size: 13px; color: var(--label)">매일 노출 시간대 (한국 시간, 최대 4개)</span>
          <div class="stack" id="ml-windows" style="gap: 8px">${C.popupWindows(s).map(rowHtml).join('')}</div>
          <div class="filter-row" style="margin-top: 4px">
            <button type="button" class="btn xs ghost" id="ml-add">+ 시간대 추가</button>
            <button type="button" class="btn xs ghost" id="ml-preset" title="23:30~23:59 · 00:00~00:30 · 12:00~13:00 · 18:00~19:00">자정 전후 + 점심 + 저녁으로 채우기</button>
          </div>
        </div>
        ${F('ml-url', '마인리스트 추천 링크', s.url || '', { ph: 'https://minelist.kr/servers/…/votes/new' })}
        ${F('ml-text', '기본 팝업 문구', s.text || '', { ph: '예: 오늘의 마인리스트 추천을 부탁드려요' })}
        <div class="notice-box" style="font-size: 12px; display: block; line-height: 1.6">
          <b>닫기</b>를 누르면 그 시간대만 오늘 다시 안 뜨고, <b>추천하기</b>를 누르면 오늘 남은 시간대에는 안 뜹니다. 자정이 지나면 새로운 날로 칩니다 (마인리스트 추천 초기화와 같음).<br>
          페이지를 켜 둔 상태에서도 시간대에 들어서면 뜹니다.
        </div>
        <button type="submit" class="btn primary">저장</button>
      </form>
      <form class="card plain form-card" id="dc-form" style="border-color: var(--line)">
        <div class="row-between"><h2 style="font-size: 20px">디스코드 알림 (웹훅)</h2><button type="button" class="btn xs secondary" id="dc-test">테스트 메시지</button></div>
        <div class="field"><label for="dc-webhook">웹훅 주소</label>
          <div style="display: flex; gap: 6px"><input class="input" id="dc-webhook" type="password" value="${esc(dc.webhook || '')}" placeholder="https://discord.com/api/webhooks/…" autocomplete="off" style="font-family: var(--font-mono); font-size: 12px"><button type="button" class="btn sm ghost" id="dc-show">보기</button></div>
        </div>
        ${F('dc-name', '보내는 이름 (비우면 "펭귄서버 위키")', dc.botName || '', { ph: '펭귄서버 위키' })}
        <div class="stack" style="gap: 8px; padding: 12px 16px; background: var(--cream); border: 1px solid var(--line-soft); border-radius: 12px; font-size: 13px">
          <label style="display: flex; align-items: center; justify-content: space-between; cursor: pointer">패치노트를 게시하면 알림 ${toggle(dc.notifyPatch !== false, 'id="dc-patch"')}</label>
          <label style="display: flex; align-items: center; justify-content: space-between; cursor: pointer">이벤트를 저장하면 알림 (예정·진행 중·상시) ${toggle(dc.notifyEvent !== false, 'id="dc-event"')}</label>
          <label style="display: flex; align-items: center; justify-content: space-between; cursor: pointer">가이드 문서를 게시하면 알림 (편집기에서 매번 선택 가능) ${toggle(!!dc.notifyGuide, 'id="dc-guide"')}</label>
        </div>
        <div class="notice-box" style="font-size: 12px; display: block; line-height: 1.6">웹훅 주소는 편집자만 읽을 수 있는 곳에 저장됩니다. 알림은 편집자가 저장·게시하는 순간 그 브라우저에서 보내므로, 예약 게시 패치노트는 날짜가 되어도 자동으로 나가지 않고 패치노트 관리의 종 버튼으로 직접 보냅니다.</div>
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
  const wrap = $('#ml-windows', panel);
  const rows = () => Array.from(wrap.querySelectorAll('.ml-window'));
  const readWindows = () => rows().map((r) => ({ start: r.querySelector('[data-w="start"]').value, end: r.querySelector('[data-w="end"]').value, text: r.querySelector('[data-w="text"]').value.trim() }));
  $('#ml-add', panel).addEventListener('click', () => { if (rows().length >= 4) return toast('시간대는 최대 4개까지입니다'); wrap.insertAdjacentHTML('beforeend', rowHtml()); });
  $('#ml-preset', panel).addEventListener('click', () => { wrap.innerHTML = C.DEFAULT_ML_WINDOWS.map(rowHtml).join(''); });
  wrap.addEventListener('click', (e) => { const b = e.target.closest('[data-del-window]'); if (b) b.closest('.ml-window').remove(); });
  $('#ml-form', panel).addEventListener('submit', async (e) => {
    e.preventDefault();
    const v = (id) => $('#' + id, panel).value.trim();
    const windows = readWindows().filter((w) => w.start && w.end);
    if (isOn($('#ml-enabled', panel)) && !windows.length) return toast('시간대를 하나 이상 넣어 주세요');
    await C.savePopupSettings({ enabled: isOn($('#ml-enabled', panel)), windows, url: v('ml-url'), text: v('ml-text') }, me.name);
    toast('저장했습니다');
  });
  // 디스코드
  $('#dc-show', panel).addEventListener('click', () => { const i = $('#dc-webhook', panel); i.type = i.type === 'password' ? 'text' : 'password'; });
  const readDc = () => ({ webhook: $('#dc-webhook', panel).value.trim(), botName: $('#dc-name', panel).value.trim(), notifyPatch: isOn($('#dc-patch', panel)), notifyEvent: isOn($('#dc-event', panel)), notifyGuide: isOn($('#dc-guide', panel)) });
  $('#dc-form', panel).addEventListener('submit', async (e) => {
    e.preventDefault();
    const d = readDc();
    if (d.webhook && !/^https:\/\/(discord\.com|discordapp\.com)\/api\/webhooks\//.test(d.webhook)) return toast('디스코드 웹훅 주소 형식이 아닙니다');
    await D.saveDiscordSettings(d, me.name); toast('저장했습니다');
  });
  $('#dc-test', panel).addEventListener('click', async () => {
    const d = readDc(); if (!d.webhook) return toast('웹훅 주소를 먼저 넣어 주세요');
    try { await D.notifyTest(me.name, d); toast('디스코드로 테스트 메시지를 보냈습니다'); } catch (err) { toast('보내지 못했습니다: ' + (err.message || err)); }
  });
}

// ================= 명령어 관리 =================
// 왼쪽 분류 · 가운데 목록 · 오른쪽 입력 칸(줄을 누르거나 새 명령어를 눌렀을 때만 열림). 한 번에 한 분류만 보여 스크롤을 줄입니다.
// 순서는 손잡이를 끌어서(또는 손잡이에서 ↑↓ 키) 바꾸고, 명령어를 왼쪽 분류에 놓으면 분류가 바뀝니다. 순서 값은 전체를 10, 20, 30…으로 다시 매깁니다.
const GRIP = '<svg aria-hidden="true" width="12" height="16" viewBox="0 0 12 16" fill="currentColor"><circle cx="3" cy="3" r="1.6"/><circle cx="9" cy="3" r="1.6"/><circle cx="3" cy="8" r="1.6"/><circle cx="9" cy="8" r="1.6"/><circle cx="3" cy="13" r="1.6"/><circle cx="9" cy="13" r="1.6"/></svg>';
const CM_ALL = Symbol('전체');
let cmView = null; // 고른 분류(이름 또는 CM_ALL). 다른 메뉴에 다녀와도 유지

export async function renderCommands(ctx) {
  const { head, me } = ctx;
  let panel = ctx.freshPanel();
  panel.innerHTML = head('명령어 관리') + '<div class="loading">불러오는 중</div>';
  const [{ db, doc, writeBatch, serverTimestamp }, firstList] = await Promise.all([import('../assets/js/firebase.js'), C.listCommands()]);
  let cmds = firstList, groups = [], q = '', editing = null, saving = false;
  // 분류 묶음: 처음 나타나는 순서대로
  const regroup = () => {
    groups = [];
    cmds.forEach((c) => { const k = c.category || ''; let g = groups.find((x) => x.name === k); if (!g) { g = { name: k, items: [] }; groups.push(g); } g.items.push(c); });
  };
  regroup();

  panel = ctx.freshPanel();
  panel.innerHTML = head('명령어 관리', '<span id="cm-count"></span>', '<button type="button" class="btn primary" id="cm-new">새 명령어</button>') + `
    <div class="cm-layout" id="cm-layout">
      <nav class="card plain cm-cats" aria-label="분류">
        <div class="cm-cats-label">분류</div>
        <div class="cm-catlist" id="cm-catlist"></div>
        <p class="cm-cats-tip">명령어를 여기로 끌어 놓으면 분류가 바뀝니다.</p>
      </nav>
      <section class="card plain cm-main" aria-label="명령어 목록">
        <div class="cm-tools">
          <label class="cm-search">
            <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg>
            <input type="search" id="cm-q" aria-label="명령어 검색" placeholder="명령어 · 별칭 · 설명 검색 (전체 분류)" autocomplete="off">
          </label>
          <span class="cm-hint" id="cm-hint" aria-live="polite"></span>
        </div>
        <div id="cm-list"></div>
      </section>
      <form class="card plain form-card cm-form" id="cm-form" hidden>
        <div class="row-between"><h2 style="font-size: 20px" id="cm-form-title">새 명령어</h2><button type="button" class="btn xs ghost" id="cm-close">닫기</button></div>
        ${F('cm-command', '명령어', '', { ph: '/명령어 [인자]', extra: 'style="font-family: var(--font-mono)"' })}
        ${F('cm-aliases', '별칭 (쉼표로 구분)', '', { ph: '/짧은명령, /alias' })}
        <div class="field"><label for="cm-desc">설명</label><textarea class="textarea" id="cm-desc" rows="3"></textarea></div>
        <div class="form-row">
          <div class="field"><label for="cm-category">분류</label><input class="input" id="cm-category" list="cm-cats" placeholder="예: 기본"><datalist id="cm-cats"></datalist></div>
          ${F('cm-permission', '권한', '', { ph: '예: 전체 / VIP / 운영자' })}
        </div>
        <button type="submit" class="btn primary" id="cm-save">저장</button>
        <button type="button" class="btn ghost cm-del" id="cm-del" hidden>이 명령어 삭제</button>
      </form>
    </div>`;
  const f = (id) => $('#' + id, panel);
  const handle = (name) => `<button type="button" class="drag-handle" aria-label="${esc(name)} 순서 옮기기 (끌거나 ↑ ↓ 키)" title="끌어서 순서 바꾸기">${GRIP}</button>`;

  // ---- 그리기 ----
  const drawCats = () => {
    f('cm-count').textContent = `명령어 ${cmds.length}개 · 분류 ${groups.filter((g) => g.name).length}개`;
    f('cm-cats').innerHTML = groups.filter((g) => g.name).map((g) => `<option value="${esc(g.name)}">`).join('');
    f('cm-catlist').innerHTML = `
      <div class="cm-cat${!q && cmView === CM_ALL ? ' on' : ''}" data-all>
        <span class="cm-grip-gap"></span>
        <button type="button" class="cm-cat-btn" data-pick-all><span class="nm">전체</span><span class="cnt">${cmds.length}</span></button>
      </div>` + groups.map((g) => `
      <div class="cm-cat${!q && cmView === g.name ? ' on' : ''}" data-cat="${esc(g.name)}">
        ${handle(g.name || '분류 없음')}
        <button type="button" class="cm-cat-btn" data-pick="${esc(g.name)}"><span class="nm">${g.name ? esc(g.name) : '분류 없음'}</span><span class="cnt">${g.items.length}</span></button>
      </div>`).join('');
  };
  const row = (c, canDrag) => `
    <div class="cm-row${editing?.id === c.id ? ' on' : ''}" data-id="${esc(c.id)}">
      ${canDrag ? handle(c.command) : '<span class="cm-grip-gap"></span>'}
      <button type="button" class="cm-row-main" data-edit="${esc(c.id)}" title="${esc(c.desc || c.command)}">
        <span class="cm-c"><code class="cmd-chip">${esc(c.command)}</code></span>
        <span class="cm-a">${esc(c.aliases || '')}</span>
        <span class="cm-d">${esc(c.desc || '')}</span>
        <span class="cm-p">${c.permission ? `<span class="tag">${esc(c.permission)}</span>` : ''}</span>
      </button>
    </div>`;
  const drawList = () => {
    const needle = q.toLowerCase();
    const hit = (c) => `${c.command} ${c.aliases || ''} ${c.desc || ''}`.toLowerCase().includes(needle);
    const single = !q && cmView !== CM_ALL;
    const shown = (single ? groups.filter((g) => g.name === cmView) : groups)
      .map((g) => ({ name: g.name, items: q ? g.items.filter(hit) : g.items })).filter((g) => g.items.length);
    const total = shown.reduce((n, g) => n + g.items.length, 0);
    f('cm-hint').textContent = q ? `검색 결과 ${total}개 · 순서는 검색을 지우면 바꿀 수 있어요` : `${single ? (cmView || '분류 없음') : '전체'} ${total}개 · 왼쪽 손잡이를 끌어 순서 변경`;
    f('cm-list').innerHTML = !total ? `<div class="empty">${q ? '검색 결과가 없습니다.' : '명령어가 없습니다.'}</div>` : `
      <div class="cm-head"><span class="cm-c">명령어</span><span class="cm-a">별칭</span><span class="cm-d">설명</span><span class="cm-p">권한</span></div>
      ${shown.map((g) => `${single ? '' : `<div class="cm-ghead">${g.name ? esc(g.name) : '분류 없음'} <span>${g.items.length}개</span></div>`}
        <div class="cm-rows" data-group="${esc(g.name)}">${g.items.map((c) => row(c, !q)).join('')}</div>`).join('')}`;
  };
  const draw = () => {
    if (cmView === null || (cmView !== CM_ALL && !groups.some((g) => g.name === cmView))) cmView = groups[0]?.name ?? CM_ALL;
    drawCats(); drawList();
  };

  // ---- 입력 칸 ----
  const openForm = (c) => {
    editing = c || null;
    f('cm-form').hidden = false; f('cm-layout').classList.add('editing');
    f('cm-command').value = c?.command || ''; f('cm-aliases').value = c?.aliases || ''; f('cm-desc').value = c?.desc || '';
    f('cm-category').value = c ? c.category || '' : (cmView === CM_ALL ? '' : cmView || ''); f('cm-permission').value = c?.permission || '';
    f('cm-form-title').textContent = c ? '명령어 편집' : '새 명령어';
    f('cm-del').hidden = !c;
    drawList();
    f('cm-form').scrollIntoView({ block: 'nearest' });
    f('cm-command').focus({ preventScroll: true });
  };
  const closeForm = () => { editing = null; f('cm-form').hidden = true; f('cm-layout').classList.remove('editing'); drawList(); };

  // ---- 저장: 전체 순서를 묶음 순서대로 다시 매기고 바뀐 것만 씁니다 ----
  const renumber = async (prep) => {
    const batch = writeBatch(db);
    let changed = 0, n = 0;
    if (prep) { prep(batch); changed++; }
    groups.forEach((g) => g.items.forEach((c) => { n += 10; if ((c.order ?? 0) !== n) { batch.update(doc(db, 'commands', c.id), { order: n }); c.order = n; changed++; } }));
    if (changed) await batch.commit();
  };
  const reload = async ({ tidy = true } = {}) => { cmds = await C.listCommands(); regroup(); if (tidy) await renumber(); };
  const failed = async (what, err) => { toast(`${what} 저장하지 못했습니다 — ${errText(err)}`, { timeout: 6000 }); await reload({ tidy: false }); draw(); };
  const saveOrder = async () => {
    try { await renumber(); toast('순서를 바꿨습니다'); } catch (err) { await failed('순서를', err); }
  };
  const moveToCat = async (id, name) => {
    const from = groups.find((g) => g.items.some((c) => c.id === id)), to = groups.find((g) => g.name === name);
    if (!from || !to || from === to) return;
    const c = from.items.find((x) => x.id === id);
    from.items = from.items.filter((x) => x !== c); to.items.push(c); c.category = name;
    if (!from.items.length) groups = groups.filter((g) => g !== from);
    if (editing?.id === id) f('cm-category').value = name;
    draw();
    try {
      await renumber((batch) => batch.update(doc(db, 'commands', id), { category: name, updatedAt: serverTimestamp(), updatedBy: me.name }));
      toast(`${c.command} → ${name || '분류 없음'}(으)로 옮겼습니다`);
    } catch (err) { await failed('분류를', err); }
  };
  // 화면에서 바뀐 자리를 묶음 데이터에 옮겨 적습니다
  const applyOrder = (el, box) => {
    if (el.matches('.cm-cat')) {
      groups = [...box.children].filter((x) => x.matches('.cm-cat[data-cat]')).map((x) => groups.find((g) => g.name === x.dataset.cat));
      drawList();
    } else {
      const g = groups.find((x) => x.name === box.dataset.group);
      g.items = [...box.children].map((x) => g.items.find((c) => c.id === x.dataset.id));
    }
  };

  // ---- 끌어서 옮기기. 끄는 줄은 DOM 에서 떼지 않고 이웃을 옮깁니다(떼면 포인터를 놓칩니다) ----
  let drag = null;
  const mid = (el) => { const r = el.getBoundingClientRect(); return r.top + r.height / 2; };
  const catAt = (x, y) => [...panel.querySelectorAll('.cm-cat[data-cat]')].find((c) => { const r = c.getBoundingClientRect(); return x >= r.left && x <= r.right && y >= r.top && y <= r.bottom; }) || null;
  const keyOf = (box) => [...box.children].map((x) => x.dataset.id ?? x.dataset.cat ?? '').join('\n');
  const follow = () => {
    const { el, sel, x, y, group } = drag;
    let over = group !== undefined ? catAt(x, y) : null;
    if (over && over.dataset.cat === group) over = null;
    if (over !== drag.over) { drag.over?.classList.remove('drop'); over?.classList.add('drop'); drag.over = over; }
    if (!over) {
      let p; while ((p = el.previousElementSibling) && p.matches(sel) && y < mid(p)) el.after(p);
      let n; while ((n = el.nextElementSibling) && n.matches(sel) && y > mid(n)) el.before(n);
    }
    el.style.transform = '';
    el.style.transform = `translateY(${y - drag.off - el.getBoundingClientRect().top}px)`;
  };
  const tick = () => {
    if (!drag) return;
    const edge = 70, y = drag.y; // 화면 위 · 아래 끝에 가까우면 저절로 스크롤
    if (y < edge) scrollBy(0, -Math.ceil((edge - y) / 6));
    else if (y > innerHeight - edge) scrollBy(0, Math.ceil((y - innerHeight + edge) / 6));
    follow();
    drag.raf = requestAnimationFrame(tick);
  };
  panel.addEventListener('pointerdown', (e) => {
    const h = e.target.closest('.drag-handle');
    if (!h || e.button > 0) return;
    const el = h.closest('.cm-row, .cm-cat'), box = el.parentElement, isRow = el.matches('.cm-row');
    e.preventDefault();
    h.setPointerCapture(e.pointerId);
    el.classList.add('dragging'); box.classList.add('sorting');
    drag = { el, box, sel: isRow ? '.cm-row' : '.cm-cat[data-cat]', group: isRow ? box.dataset.group : undefined, x: e.clientX, y: e.clientY, off: e.clientY - el.getBoundingClientRect().top, before: keyOf(box), over: null };
    drag.raf = requestAnimationFrame(tick);
  });
  panel.addEventListener('pointermove', (e) => { if (drag) { drag.x = e.clientX; drag.y = e.clientY; } });
  const endDrag = async () => {
    if (!drag) return;
    const { el, box, before, over, raf } = drag;
    drag = null;
    cancelAnimationFrame(raf);
    el.style.transform = ''; el.classList.remove('dragging'); box.classList.remove('sorting'); over?.classList.remove('drop');
    if (over) return moveToCat(el.dataset.id, over.dataset.cat);
    if (keyOf(box) !== before) { applyOrder(el, box); await saveOrder(); }
  };
  panel.addEventListener('pointerup', endDrag);
  panel.addEventListener('pointercancel', endDrag);
  panel.addEventListener('keydown', async (e) => {
    const h = e.target.closest('.drag-handle');
    if (!h || (e.key !== 'ArrowUp' && e.key !== 'ArrowDown')) return;
    e.preventDefault();
    const el = h.closest('.cm-row, .cm-cat'), sel = el.matches('.cm-row') ? '.cm-row' : '.cm-cat[data-cat]';
    const sib = e.key === 'ArrowUp' ? el.previousElementSibling : el.nextElementSibling;
    if (!sib || !sib.matches(sel)) return;
    if (e.key === 'ArrowUp') el.after(sib); else el.before(sib);
    applyOrder(el, el.parentElement);
    await saveOrder();
  });

  // ---- 누르기 · 입력 ----
  const clearSearch = () => { q = ''; f('cm-q').value = ''; };
  panel.addEventListener('click', (e) => {
    if (e.target.closest('[data-pick-all]')) { cmView = CM_ALL; clearSearch(); draw(); return; }
    const p = e.target.closest('[data-pick]');
    if (p) { cmView = p.dataset.pick; clearSearch(); draw(); return; }
    const ed = e.target.closest('[data-edit]');
    if (ed) openForm(cmds.find((x) => x.id === ed.dataset.edit));
  });
  f('cm-q').addEventListener('input', (e) => { q = e.target.value.trim(); drawCats(); drawList(); });
  f('cm-new').addEventListener('click', () => openForm(null));
  f('cm-close').addEventListener('click', closeForm);
  f('cm-form').addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeForm();
    if (e.key === 'Enter' && !e.shiftKey && e.target.id === 'cm-desc') { e.preventDefault(); f('cm-form').requestSubmit(); }
  });
  f('cm-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    if (saving) return;
    const command = f('cm-command').value.trim();
    if (!command) return toast('명령어를 입력해 주세요');
    const category = f('cm-category').value.trim();
    const wasNew = !editing;
    // 같은 분류면 자리 유지, 분류를 바꾸거나 새 명령어면 그 분류 맨 아래 (없는 분류면 전체 맨 아래)
    let order;
    if (editing && (editing.category || '') === category) order = editing.order ?? 0;
    else {
      const g = groups.find((x) => x.name === category);
      const last = g ? Math.max(...g.items.map((c) => c.order ?? 0)) : Math.max(0, ...cmds.map((c) => c.order ?? 0));
      order = last + 5; // 그 분류의 마지막 바로 뒤 (바로 아래 reload 에서 10 단위로 정리됨)
    }
    saving = true; f('cm-save').disabled = true;
    try {
      await C.saveCommand(editing?.id || null, {
        command, aliases: f('cm-aliases').value.trim(), desc: f('cm-desc').value.trim(),
        category, permission: f('cm-permission').value.trim(), order,
      }, me.name);
      await reload();
      if (cmView !== CM_ALL) cmView = category;
      draw();
      toast('저장했습니다');
      if (wasNew) { openForm(null); f('cm-category').value = category; } else closeForm(); // 새 명령어는 이어서 입력할 수 있게 열어 둠
    } finally { saving = false; f('cm-save').disabled = false; }
  });
  f('cm-del').addEventListener('click', async () => {
    if (!editing || !confirm(`"${editing.command}" 를 삭제할까요?`)) return;
    await C.deleteCommand(editing.id);
    toast('삭제했습니다');
    await reload({ tidy: false });
    closeForm(); draw();
  });
  draw();
}

// ================= 시세 데이터 =================
export async function renderPrices(ctx) {
  const { head, me } = ctx;
  let panel = ctx.freshPanel();
  panel.innerHTML = head('시세 데이터') + '<div class="loading">불러오는 중</div>';
  const [items, ps] = await Promise.all([C.listPrices(), C.getPriceSettings()]);
  const note = ps.note || '';
  const cats = [...new Set(items.map((i) => i.category).filter(Boolean))];
  const fmtNum = (n) => Number(n).toLocaleString('ko-KR');
  const soonText = (on) => (on
    ? '지금 유저에게는 시세 대신 「준비 중」 화면이 보여요. 편집자는 그대로 보면서 확인할 수 있어요.'
    : '지금 유저에게 시세가 공개되어 있어요.');
  panel = ctx.freshPanel();
  panel.innerHTML = head('시세 데이터', `아이템 ${items.length}개 · 분류 ${cats.length}개`) + `
    <div class="card plain soon-switch${ps.comingSoon ? ' on' : ''}" id="pr-soon-card" style="margin-bottom: 20px">
      <div class="grow">
        <h2>시세 페이지 「준비 중」으로 가리기</h2>
        <p id="pr-soon-text">${soonText(!!ps.comingSoon)}</p>
      </div>
      ${toggle(!!ps.comingSoon, 'id="pr-soon" aria-label="시세 페이지를 준비 중으로 가리기"')}
    </div>
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
  // 「준비 중」 스위치: 누르면 바로 저장 (실패하면 되돌림)
  bindToggles(f('pr-soon-card'));
  f('pr-soon').addEventListener('change', async () => {
    const on = isOn(f('pr-soon'));
    f('pr-soon-card').classList.toggle('on', on); f('pr-soon-text').textContent = soonText(on);
    try { await C.setPricesComingSoon(on, me.name); toast(on ? '시세 페이지를 「준비 중」으로 가렸습니다' : '시세 페이지를 공개했습니다'); }
    catch (err) {
      console.warn(err); toast('저장하지 못했습니다. 잠시 후 다시 시도해 주세요');
      f('pr-soon').classList.toggle('on', !on); f('pr-soon').setAttribute('aria-checked', String(!on));
      f('pr-soon-card').classList.toggle('on', !on); f('pr-soon-text').textContent = soonText(!on);
    }
  });
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
    for (const r of rowsToImport) { await C.savePrice({ ...r, category: r.category || undefined, unit: r.unit || undefined, source: 'import' }, me.name, T.todayKST()); st.textContent = `${++n}/${rowsToImport.length} 저장 중`; }
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
