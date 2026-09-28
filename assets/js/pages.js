// 가이드 문서/섹션 데이터 접근
import {
  db, collection, doc, getDoc, getDocs, setDoc, addDoc, updateDoc, deleteDoc,
  query, where, orderBy, serverTimestamp, writeBatch,
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
// pages/{slug}: { slug, title, sectionId, order, markdown(게시본), draft(임시), public, updatedAt, updatedBy, createdAt }
export async function listPages({ editorView = false } = {}) {
  const col = collection(db, 'pages');
  const q = editorView ? query(col, orderBy('order')) : query(col, where('public', '==', true), orderBy('order'));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}
export async function getPage(slug) {
  const snap = await getDoc(doc(db, 'pages', slug));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}
export async function pageExists(slug) {
  return (await getDoc(doc(db, 'pages', slug))).exists();
}

// 임시저장: draft만 갱신 (유저에게 보이는 게시본은 그대로)
export async function saveDraft(slug, data, by) {
  const ref = doc(db, 'pages', slug);
  const exists = (await getDoc(ref)).exists();
  const base = { ...data, draft: data.draft ?? '', updatedAt: serverTimestamp(), updatedBy: by };
  if (exists) await updateDoc(ref, base);
  else await setDoc(ref, { ...base, slug, public: false, markdown: '', createdAt: serverTimestamp() });
  await log({ pageId: slug, title: data.title, action: exists ? 'draft' : 'create', by });
}

// 게시: 게시본 교체 + 이전 게시본을 이력에 보관
export async function publish(slug, data, by, summary) {
  const ref = doc(db, 'pages', slug);
  const prev = await getDoc(ref);
  const batch = writeBatch(db);
  if (prev.exists() && prev.data().markdown) {
    const p = prev.data();
    batch.set(doc(collection(db, 'pageVersions')), {
      pageId: slug, title: p.title, markdown: p.markdown,
      summary: p.lastSummary || '', savedAt: p.publishedAt || p.updatedAt || serverTimestamp(), savedBy: p.updatedBy || '',
    });
  }
  const payload = {
    ...data, slug, markdown: data.markdown, draft: '', public: data.public !== false,
    lastSummary: summary || '', publishedAt: serverTimestamp(), updatedAt: serverTimestamp(), updatedBy: by,
  };
  if (prev.exists()) batch.update(ref, payload);
  else batch.set(ref, { ...payload, createdAt: serverTimestamp() });
  await batch.commit();
  await log({ pageId: slug, title: data.title, action: 'publish', summary: summary || '', by });
}

export async function setPagePublic(slug, isPublic, by) {
  await updateDoc(doc(db, 'pages', slug), { public: isPublic, updatedAt: serverTimestamp(), updatedBy: by });
  await log({ pageId: slug, action: isPublic ? 'show' : 'hide', by });
}

export async function deletePage(slug, by, title) {
  await deleteDoc(doc(db, 'pages', slug));
  await log({ pageId: slug, title, action: 'delete', by });
}

export async function listVersions(slug) {
  const snap = await getDocs(query(collection(db, 'pageVersions'), where('pageId', '==', slug), orderBy('savedAt', 'desc')));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
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
export function buildTree(sections, pages) {
  const bySection = {};
  pages.forEach((p) => {
    const k = p.sectionId || '_none';
    (bySection[k] ||= []).push(p);
  });
  Object.values(bySection).forEach((arr) => arr.sort((a, b) => (a.order ?? 0) - (b.order ?? 0)));
  const top = sections.filter((s) => !s.parentId);
  const tree = top.map((s) => ({
    section: s,
    pages: bySection[s.id] || [],
    children: sections.filter((c) => c.parentId === s.id).map((c) => ({ section: c, pages: bySection[c.id] || [] })),
  }));
  return { tree, orphans: bySection['_none'] || [] };
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
