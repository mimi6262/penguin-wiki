// 2차 데이터 접근: 패치노트 · 카테고리 · 이벤트 · 명령어 · 팝업 설정
import {
  db, collection, doc, getDoc, getDocs, setDoc, addDoc, updateDoc, deleteDoc,
  query, where, orderBy, limit, serverTimestamp,
} from './firebase.js';
import { esc } from './ui.js';

const rows = (snap) => snap.docs.map((d) => ({ id: d.id, ...d.data() }));
const stamp = (by) => ({ updatedAt: serverTimestamp(), updatedBy: by });

// ---------- 패치노트 카테고리 ----------
// patchCategories/{id}: { name, color, order }
export const DEFAULT_COLORS = ['#A63A2B', '#3F6B4F', '#3A5A78', '#BA7517', '#6E5A8C', '#3B2414', '#5F5E5A'];
export async function listCategories() {
  return rows(await getDocs(query(collection(db, 'patchCategories'), orderBy('order'))));
}
export async function saveCategory(id, data) {
  if (id) { await updateDoc(doc(db, 'patchCategories', id), data); return id; }
  return (await addDoc(collection(db, 'patchCategories'), data)).id;
}
export async function deleteCategory(id) { await deleteDoc(doc(db, 'patchCategories', id)); }

// ---------- 패치노트 ----------
// patchNotes/{id}: { date 'YYYY-MM-DD', title, body, categories: [name], status: 'published'|'draft' }
export async function listPatchNotes({ editorView = false, max = 100 } = {}) {
  const col = collection(db, 'patchNotes');
  const q = editorView
    ? query(col, orderBy('date', 'desc'), limit(max))
    : query(col, where('status', '==', 'published'), orderBy('date', 'desc'), limit(max));
  return rows(await getDocs(q));
}
export async function savePatchNote(id, data, by) {
  const payload = { ...data, ...stamp(by) };
  if (id) { await updateDoc(doc(db, 'patchNotes', id), payload); return id; }
  return (await addDoc(collection(db, 'patchNotes'), { ...payload, createdAt: serverTimestamp() })).id;
}
export async function deletePatchNote(id) { await deleteDoc(doc(db, 'patchNotes', id)); }

// 본문에서 [카테고리] 헤더를 순서대로 추출 (제목 자동 생성용)
export function extractCategories(body) {
  const out = [];
  (body || '').split('\n').forEach((line) => {
    const m = line.match(/^\s*\[([^\]]{1,40})\]/);
    if (m && !out.includes(m[1].trim())) out.push(m[1].trim());
  });
  return out;
}

// 인라인: **굵게**, `코드`, [텍스트](url)
function inline(text) {
  let s = esc(text);
  s = s.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  s = s.replace(/`([^`]+)`/g, '<code>$1</code>');
  s = s.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
  return s;
}

// 패치노트 본문 → HTML.  [카테고리] 줄은 색 배지 헤더, ㆍ/-/* 줄은 항목, 들여쓴 항목은 하위 항목
export function renderPatchBody(body, categories = []) {
  const color = (name) => categories.find((c) => c.name === name)?.color || '#5F5E5A';
  const lines = (body || '').replace(/\r/g, '').split('\n');
  let html = '', depth = 0;
  const closeTo = (d) => { while (depth > d) { html += '</ul>'; depth--; } };
  const openTo = (d) => { while (depth < d) { html += '<ul>'; depth++; } };
  lines.forEach((raw) => {
    const line = raw.replace(/\t/g, '  ');
    const cat = line.match(/^\s*\[([^\]]{1,40})\]\s*(.*)$/);
    if (cat) {
      closeTo(0);
      html += `<h3 class="pn-cat"><span class="tag fill" style="background:${color(cat[1].trim())};border-color:${color(cat[1].trim())}">${esc(cat[1].trim())}</span>${cat[2] ? `<span>${inline(cat[2])}</span>` : ''}</h3>`;
      return;
    }
    const li = line.match(/^(\s*)(ㆍ|-|\*|•)\s*(.*)$/);
    if (li) {
      const d = li[1].length >= 2 || (li[2] === 'ㆍ' && /^ㆍ/.test(li[3])) ? 2 : 1;
      const text = li[3].replace(/^ㆍ\s*/, '');
      closeTo(d); openTo(d);
      html += `<li>${inline(text)}</li>`;
      return;
    }
    if (!line.trim()) { closeTo(0); return; }
    closeTo(0);
    html += `<p>${inline(line.trim())}</p>`;
  });
  closeTo(0);
  return html;
}

// ---------- 이벤트 ----------
// events/{id}: { name, kind:'period'|'always', startAt, endAt, dailyStart, dailyEnd, link, popup, popupStart, popupEnd, note }
export async function listEvents() {
  return rows(await getDocs(query(collection(db, 'events'), orderBy('createdAt', 'desc'))));
}
export async function saveEvent(id, data, by) {
  const payload = { ...data, ...stamp(by) };
  if (id) { await updateDoc(doc(db, 'events', id), payload); return id; }
  return (await addDoc(collection(db, 'events'), { ...payload, createdAt: serverTimestamp() })).id;
}
export async function deleteEvent(id) { await deleteDoc(doc(db, 'events', id)); }

// ---------- 명령어 ----------
// commands/{id}: { command, aliases, desc, permission, category, order }
export async function listCommands() {
  return rows(await getDocs(query(collection(db, 'commands'), orderBy('order'))));
}
export async function saveCommand(id, data, by) {
  const payload = { ...data, ...stamp(by) };
  if (id) { await updateDoc(doc(db, 'commands', id), payload); return id; }
  return (await addDoc(collection(db, 'commands'), { ...payload, createdAt: serverTimestamp() })).id;
}
export async function deleteCommand(id) { await deleteDoc(doc(db, 'commands', id)); }

// ---------- 팝업 설정 ----------
// popups/minelist: { enabled, start 'HH:MM', end 'HH:MM', text, url }
export async function getPopupSettings() {
  const snap = await getDoc(doc(db, 'popups', 'minelist'));
  return snap.exists() ? snap.data() : { enabled: false, start: '23:30', end: '23:59', text: '', url: '' };
}
export async function savePopupSettings(data, by) {
  await setDoc(doc(db, 'popups', 'minelist'), { ...data, ...stamp(by) }, { merge: true });
}

// ---------- 하트 (브라우저 저장) ----------
const HEART_KEY = 'pw_hearts';
export function getHearts() { try { return JSON.parse(localStorage.getItem(HEART_KEY) || '[]'); } catch { return []; } }
export function toggleHeart(id) {
  const set = new Set(getHearts());
  set.has(id) ? set.delete(id) : set.add(id);
  try { localStorage.setItem(HEART_KEY, JSON.stringify([...set])); } catch {}
  return set.has(id);
}
