// 목차 구성 (Firebase 없이 쓰는 순수 함수) — 컨텐츠 화면이 기억해 둔 데이터로 서버 응답 전에 목차를 그릴 때 씁니다. pages.js 도 그대로 내보냄

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
