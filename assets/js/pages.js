// 가이드 문서/섹션 데이터 접근
import {
  db, collection, doc, getDoc, getDocs, setDoc, addDoc, updateDoc, deleteDoc,
  query, where, orderBy, serverTimestamp, writeBatch, deleteField,
} from './firebase.js';

// ---------- 섹션 ----------
// sections/{id}: { name, order, parentId|null, createdAt }
export async function listSections() {
  const snap = await getDocs(query(collection(db, 'sections'), orderBy('order')));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}
export async function saveSection(id, data) {
  if (id) {
    await updateDoc(doc(db, 'sections', id), data);
    return id;
  }
  const ref = await addDoc(collection(db, 'sections'), { ...data, createdAt: serverTimestamp() });
  return ref.id;
}
export async function deleteSection(id) {
  await deleteDoc(doc(db, 'sections', id));
}

// ---------- 문서 ----------
// pages/{slug}: { slug, title, sectionId, order, markdown(게시본), public, updatedAt, updatedBy, createdAt }
// pageDrafts/{slug}: { draft(임시저장 원고), draftMeta(게시된 문서의 바뀐 제목 · 섹션 · 순서), updatedAt, updatedBy } — 편집자만 읽음.
//   공개 문서는 pages 문서 전체가 누구에게나 읽혀서, 게시 전 원고는 따로 둔다(2026-11).
//   규칙이 아직 게시되지 않았으면(권한 없음) 예전처럼 pages 문서의 draft · draftMeta 칸을 쓰고, 읽을 때도 그 칸을 본다.
// 화면에는 예전과 같이 page.draft · page.draftMeta 로 합쳐서 돌려준다(편집자로 읽을 때만).
// 복합 색인이 필요 없도록 조건만 걸고 정렬은 브라우저에서 합니다.
const DRAFTS = 'pageDrafts';
const denied = (e) => String(e?.code || '').includes('permission-denied');
const withDraft = (p, d) => (d ? { ...p, draft: d.draft ?? '', draftMeta: d.draftMeta ?? null } : p);

export async function listPages({ editorView = false } = {}) {
  const col = collection(db, 'pages');
  const [snap, drafts] = await Promise.all([
    getDocs(editorView ? col : query(col, where('public', '==', true))),
    editorView ? getDocs(collection(db, DRAFTS)).catch((e) => { if (!denied(e)) console.warn('drafts', e); return null; }) : null,
  ]);
  const byId = Object.fromEntries((drafts?.docs || []).map((d) => [d.id, d.data()]));
  return snap.docs.map((d) => withDraft({ id: d.id, ...d.data() }, byId[d.id])).sort((a, b) => (a.order ?? 0) - (b.order ?? 0) || String(a.title || '').localeCompare(String(b.title || ''), 'ko'));
}
export async function getPage(slug, { editor = false } = {}) {
  const [snap, draft] = await Promise.all([
    getDoc(doc(db, 'pages', slug)),
    editor ? getDoc(doc(db, DRAFTS, slug)).catch((e) => { if (!denied(e)) console.warn('draft', e); return null; }) : null,
  ]);
  if (!snap.exists()) return null;
  return withDraft({ id: snap.id, ...snap.data() }, draft?.exists() ? draft.data() : null);
}
export async function pageExists(slug) {
  return (await getDoc(doc(db, 'pages', slug))).exists();
}

// 임시저장: 원고만 갱신 (유저에게 보이는 게시본은 그대로)
// 이미 게시된 문서는 제목·섹션 변경도 draftMeta 에만 담아 두고, "게시"할 때 함께 반영합니다.
export async function saveDraft(slug, data, by) {
  const ref = doc(db, 'pages', slug);
  const snap = await getDoc(ref);
  const exists = snap.exists();
  const live = exists && !!snap.data().markdown;
  const stamp = { updatedAt: serverTimestamp(), updatedBy: by };
  const { draft: rawDraft, ...meta } = data; // meta: title · sectionId · order
  const draft = rawDraft ?? '';
  const draftMeta = live ? { title: data.title, sectionId: data.sectionId ?? null, order: data.order ?? 0 } : null;
  // 원고는 pageDrafts 에. 규칙이 아직이면 예전 칸에 (이때는 공개 문서의 원고가 밖에서 읽힐 수 있음)
  let separate = true;
  try {
    await setDoc(doc(db, DRAFTS, slug), { draft, draftMeta, ...stamp });
  } catch (e) {
    if (!denied(e)) throw e;
    separate = false;
    console.warn('pageDrafts 규칙이 게시되지 않아 예전 방식(pages 문서)으로 임시저장합니다');
  }
  const inPage = separate ? { draft: deleteField(), draftMeta: deleteField() } : live ? { draft, draftMeta } : { draft };
  if (live) {
    await updateDoc(ref, { ...inPage, ...stamp });
  } else if (exists) {
    await updateDoc(ref, { ...meta, ...inPage, ...stamp });
  } else {
    await setDoc(ref, { ...meta, ...(separate ? {} : { draft }), ...stamp, slug, public: false, markdown: '', createdAt: serverTimestamp() });
  }
  await log({ pageId: slug, title: data.title, action: exists ? 'draft' : 'create', by });
}

// 게시 · 삭제 뒤 남은 원고 정리 (규칙이 아직이면 지울 원고도 없으니 조용히 넘어감)
async function dropDraft(slug) {
  try { await deleteDoc(doc(db, DRAFTS, slug)); } catch (e) { if (!denied(e)) console.warn('draft cleanup', e); }
}

// 게시: 게시본 교체 + 이전 게시본을 이력에 보관
// extra.restoredFrom: { id, num, summary } — 이력에서 되돌린 경우 어느 버전에서 왔는지 (이력 화면 표시용)
export async function publish(slug, data, by, summary, extra = {}) {
  const ref = doc(db, 'pages', slug);
  const prev = await getDoc(ref);
  const batch = writeBatch(db);
  if (prev.exists() && prev.data().markdown) {
    const p = prev.data();
    batch.set(doc(collection(db, 'pageVersions')), {
      pageId: slug, title: p.title, markdown: p.markdown,
      summary: p.lastSummary || '', savedAt: p.publishedAt || p.updatedAt || serverTimestamp(), savedBy: p.updatedBy || '',
      restoredFrom: p.restoredFrom || null,
    });
  }
  const payload = {
    ...data, slug, markdown: data.markdown, public: data.public !== false,
    lastSummary: summary || '', restoredFrom: extra.restoredFrom || null,
    publishedAt: serverTimestamp(), updatedAt: serverTimestamp(), updatedBy: by,
  };
  // 예전 방식으로 pages 문서에 남은 원고 칸도 함께 지움
  if (prev.exists()) batch.update(ref, { ...payload, draft: deleteField(), draftMeta: deleteField() });
  else batch.set(ref, { ...payload, createdAt: serverTimestamp() });
  await batch.commit();
  await dropDraft(slug);
  const rf = extra.restoredFrom;
  await log({ pageId: slug, title: data.title, action: rf ? 'restore' : 'publish', summary: rf ? `#${rf.num} 내용으로 되돌림${summary ? ` (${summary})` : ''}` : (summary || ''), by });
}

export async function setPagePublic(slug, isPublic, by) {
  await updateDoc(doc(db, 'pages', slug), { public: isPublic, updatedAt: serverTimestamp(), updatedBy: by });
  await log({ pageId: slug, action: isPublic ? 'show' : 'hide', by });
}

export async function deletePage(slug, by, title) {
  await deleteDoc(doc(db, 'pages', slug));
  await dropDraft(slug);
  await log({ pageId: slug, title, action: 'delete', by });
}

export async function listVersions(slug) {
  const snap = await getDocs(query(collection(db, 'pageVersions'), where('pageId', '==', slug)));
  const ms = (v) => (v.savedAt?.toMillis ? v.savedAt.toMillis() : 0);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() })).sort((a, b) => ms(b) - ms(a));
}

// ---------- 수정 이력 ----------
async function log(entry) {
  try {
    await addDoc(collection(db, 'editLogs'), { ...entry, at: serverTimestamp() });
  } catch (e) {
    console.warn('edit log failed', e);
  }
}

// ---------- 트리 구성 ----------
// 반환: [{ section, children: [{ section, pages }], pages }]
// 섹션이 지워졌거나 상위 섹션이 없어진 경우에도 문서가 목차에서 사라지지 않도록:
//  - 없는 섹션을 가리키는 문서는 "미배치"(orphans)로
//  - 상위 섹션이 없어진 하위 섹션은 최상위로 올려서 보여 줍니다
export function buildTree(sections, pages) {
  const isTop = (s) => !s.parentId || !sections.some((t) => t.id === s.parentId && !t.parentId);
  const top = sections.filter(isTop);
  const shown = new Set([...top, ...sections.filter((c) => top.some((t) => t.id === c.parentId))].map((s) => s.id));
  const bySection = {};
  pages.forEach((p) => {
    const k = p.sectionId && shown.has(p.sectionId) ? p.sectionId : '_none';
    (bySection[k] ||= []).push(p);
  });
  Object.values(bySection).forEach((arr) => arr.sort((a, b) => (a.order ?? 0) - (b.order ?? 0)));
  const tree = top.map((s) => ({
    section: s,
    pages: bySection[s.id] || [],
    children: sections.filter((c) => c.parentId === s.id && !isTop(c)).map((c) => ({ section: c, pages: bySection[c.id] || [] })),
  }));
  return { tree, orphans: bySection['_none'] || [] };
}

// 목차에 보일 짧은 이름: 섹션 이름과 겹치는 부분을 뺍니다 (전체 제목은 문서 화면 · 마우스를 올리면 보임)
//   어부 섹션의 "직업 - 어부" → "직업", "어부 - 스킬" → "스킬" / 커스텀 인챈트 섹션의 "커스텀 인챈트 종류" → "종류"
export function treeTitle(title, sectionName = '') {
  const t = String(title || '').trim(), s = String(sectionName || '').trim();
  if (!s || !t) return t;
  const parts = t.split(/\s+[-–—|:·]\s+/).map((x) => x.trim()).filter(Boolean);
  const rest = parts.filter((x) => x !== s);
  if (parts.length > 1 && rest.length && rest.length < parts.length) return rest.join(' - ');
  if (t.startsWith(s + ' ') && t.length > s.length + 1) return t.slice(s.length + 1).trim();
  return t;
}

// 트리 순서대로 문서를 평탄화 (이전/다음 이동용)
export function flatten(tree, orphans) {
  const out = [];
  tree.forEach((t) => {
    t.pages.forEach((p) => out.push({ ...p, sectionName: t.section.name }));
    t.children.forEach((c) => c.pages.forEach((p) => out.push({ ...p, sectionName: `${t.section.name} › ${c.section.name}` })));
  });
  orphans.forEach((p) => out.push({ ...p, sectionName: '' }));
  return out;
}

export function slugFromTitle(title) {
  return title.trim().toLowerCase().replace(/[^\p{L}\p{N}\s-]/gu, '').replace(/\s+/g, '-').slice(0, 60) || 'page';
}
