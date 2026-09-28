# 펭귄위키 (penguin-wiki)

펭귄서버 공식 위키. GitHub Pages(정적) + Firebase(Auth, Firestore)로 동작하며 빌드 과정이 없습니다.
유저는 로그인 없이 읽고, 가이드·운영자만 `/admin/`에서 로그인해 편집합니다.

## 구조

```
index.html          홈
guide.html          가이드 문서 (?p=슬러그, ?s=섹션id, ?q=검색어)
patch.html          패치노트 (2차)
events.html         이벤트 (2차)
commands.html       명령어 (2차)
prices.html         시세 (3차)
admin/login.html    관리자 로그인
admin/index.html    관리 (#docs 문서 · #settings 사이트 설정 · #editors 편집자 · #history 이력)
admin/editor.html   문서 편집기 (?p=슬러그)
assets/css/site.css 공통 스타일 (시안 v1 "한지와 먹")
assets/js/          ui.js(헤더·푸터) firebase.js(초기화) auth.js(로그인·역할) pages.js(문서) markdown.js(렌더링)
firestore.rules     Firestore 보안 규칙
```

## 처음 한 번 해야 하는 설정

1. **GitHub Pages**: 레포 Settings → Pages → Source "Deploy from a branch", Branch `main` / `/ (root)` → Save.
   몇 분 뒤 `https://mimi6262.github.io/penguin-wiki/` 에서 열립니다.
2. **Firestore 만들기**: Firebase 콘솔 → Firestore Database → 데이터베이스 만들기 (서울 `asia-northeast3`, 프로덕션 모드).
3. **보안 규칙**: Firestore → 규칙 탭에 `firestore.rules` 내용을 그대로 붙여넣고 게시.
4. **로그인 방식**: Authentication → Sign-in method → 이메일/비밀번호 사용 설정.
5. **승인된 도메인**: Authentication → Settings → 승인된 도메인에 `mimi6262.github.io` 추가 (나중에 커스텀 도메인도 추가).
6. **첫 운영자 등록** (한 번만 수동):
   - Authentication → Users → 사용자 추가 (이메일 + 비밀번호) → 만들어진 사용자의 **UID** 복사
   - Firestore → 컬렉션 `editors` → 문서 ID를 그 UID로 → 필드 `name`(문자열), `email`(문자열), `role` = `admin`
   - 이후 편집자 추가는 관리 화면 → 편집자 관리에서 처리됩니다.
7. **색인**: 처음 목록을 열 때 콘솔에 "index 필요" 링크가 뜨면 그 링크를 눌러 색인을 만들어 주세요.
   (`pages`: public + order, `pageVersions`: pageId + savedAt, `editLogs`/`loginLogs`: at)

## 문서 작성 규칙 (마크다운)

- `## 소제목`, `### 작은 제목` → 오른쪽 목차에 자동 반영
- `> [!안내] 내용` → 안내 상자 (라벨은 자유: 주의, 팁 …)
- `` `/명령어` `` → 클릭하면 복사되는 명령어 칩
- 표, 목록, 이미지, 링크는 일반 마크다운

## 편집 흐름

- 임시저장: 편집자만 보는 초안(draft). 유저에게는 이전 게시본이 그대로 보입니다.
- 게시: 게시본 교체 + 이전 게시본을 이력(pageVersions)에 보관. 이력에서 되돌리기 가능.
- 공개 토글: 끄면 유저에게 숨겨집니다(편집자에게는 "비공개" 표시).

## 커스텀 도메인 연결 (구입 후)

1. DNS에 CNAME 레코드: `wiki`(또는 원하는 서브도메인) → `mimi6262.github.io`
2. 레포 Settings → Pages → Custom domain에 입력 → Enforce HTTPS 체크
3. Firebase Authentication → 승인된 도메인에 같은 도메인 추가
