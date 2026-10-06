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
// 복합 색인이 필요 없도록 조건만 걸고 정렬은 브라우저에서 합니다.
export async function listPages({ editorView = false } = {}) {
  const col = collection(db, 'pages');
  const snap = await getDocs(editorView ? col : query(col, where('public', '==', true)));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() })).sort((a, b) => (a.order ?? 0) - (b.order ?? 0) || String(a.title || '').localeCompare(String(b.title || ''), 'ko'));
}
export async function getPage(slug) {
  const snap = await getDoc(doc(db, 'pages', slug));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}
export async function pageExists(slug) {
  return (await getDoc(doc(db, 'pages', slug))).exists();
}

// 임시저장: draft만 갱신 (유저에게 보이는 게시본은 그대로)
// 이미 게시된 문서는 제목·섹션 변경도 draftMeta 에만 담아 두고, "게시"할 때 함께 반영합니다.
export async function saveDraft(slug, data, by) {
  const ref = doc(db, 'pages', slug);
  const snap = await getDoc(ref);
  const exists = snap.exists();
  const live = exists && !!snap.data().markdown;
  const stamp = { updatedAt: serverTimestamp(), updatedBy: by };
  if (live) {
    await updateDoc(ref, { draft: data.draft ?? '', draftMeta: { title: data.title, sectionId: data.sectionId ?? null, order: data.order ?? 0 }, ...stamp });
  } else if (exists) {
    await updateDoc(ref, { ...data, draft: data.draft ?? '', ...stamp });
  } else {
    await setDoc(ref, { ...data, draft: data.draft ?? '', ...stamp, slug, public: false, markdown: '', createdAt: serverTimestamp() });
  }
  await log({ pageId: slug, title: data.title, action: exists ? 'draft' : 'create', by });
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
    ...data, slug, markdown: data.markdown, draft: '', draftMeta: null, public: data.public !== false,
    lastSummary: summary || '', restoredFrom: extra.restoredFrom || null,
    publishedAt: serverTimestamp(), updatedAt: serverTimestamp(), updatedBy: by,
  };
  if (prev.exists()) batch.update(ref, payload);
  else batch.set(ref, { ...payload, createdAt: serverTimestamp() });
  await batch.commit();
  const rf = extra.restoredFrom;
  await log({ pageId: slug, title: data.title, action: rf ? 'restore' : 'publish', summary: rf ? `#${rf.num} 내용으로 되돌림${summary ? ` (${summary})` : ''}` : (summary || ''), by });
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
