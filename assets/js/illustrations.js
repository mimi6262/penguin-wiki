// Rounded Minecraft item icons.
const art = {
  "village": "<path d=\"M9 19 28 9q4-2 8 0l19 10q3 2 3 6v22q0 5-5 7L36 62q-4 2-8 0L11 54q-5-2-5-7V25q0-4 3-6Z\" fill=\"#b88b6c\" stroke=\"#8f6e58\"/><path d=\"m32 35 26-14v25q0 6-5 8l-21 9Z\" fill=\"#a87a60\" stroke=\"none\"/><path d=\"M9 19 28 9q4-2 8 0l19 10q6 4 0 8L36 37q-4 2-8 0L9 27q-6-4 0-8Z\" fill=\"#a6d985\" stroke=\"#78aa63\"/><path d=\"m7 25 9 5v9l7 3v-8l9 4v10l8-4v-9l8-4v8l9-5V25L33 38Z\" fill=\"#8fbe73\" stroke=\"none\"/><path d=\"m17 21 8-4m9-2 8 4\" stroke=\"#d9efba\" stroke-width=\"4\"/><path d=\"m13 45 5 3m6 5 4 2m12-4 5-2m4-9 4-2\" stroke=\"#d6aa82\" stroke-width=\"4\"/>",
  "book": "<rect x=\"13\" y=\"10\" width=\"39\" height=\"47\" rx=\"9\" fill=\"#bca7e9\" stroke=\"#9280ba\"/><path d=\"M21 10v38\" stroke=\"#e5dcfa\" stroke-width=\"4\"/><path d=\"M21 47h30v9H21q-10-4 0-9Z\" fill=\"#fffdf5\" stroke=\"#9280ba\"/><path d=\"M38 11h8v17l-4-3-4 3Z\" fill=\"#ffb4c4\" stroke=\"none\"/><path d=\"M29 29h13m-13 7h9\" stroke=\"#fff8ff\" stroke-width=\"4\"/><circle cx=\"16\" cy=\"18\" r=\"2\" fill=\"#eee5ff\" stroke=\"none\"/><rect x=\"30\" y=\"28\" width=\"12\" height=\"10\" rx=\"3\" fill=\"#a8e2ed\" stroke=\"#76b6ca\"/><path d=\"m36 30 3 3-3 3-3-3Z\" fill=\"#e6fcff\" stroke=\"none\"/>",
  "farm": "<path d=\"M22 30q-12-15-5-19 8-3 13 15-4-20 5-20 9 2 1 21 12-15 18-7 3 8-16 15\" fill=\"#b2dea2\" stroke=\"#83b178\"/><path d=\"M16 34q4-10 15-6l14 6q9 5 3 12L27 58q-9 5-11-5Z\" fill=\"#ffbe83\" stroke=\"#d99a63\"/><path d=\"m19 38 9 3m-8 7 6 2\" stroke=\"#e69c65\" stroke-width=\"3\"/><path d=\"m23 32 9 3\" stroke=\"#ffe5c4\" stroke-width=\"4\"/><path d=\"m29 34 5 2m-12 9 5 2m7 0 5-3\" stroke=\"#ffe0b0\" stroke-width=\"4\"/>",
  "fish": "<path d=\"m13 47 22-32q3-4 6-1\" stroke=\"#ba916f\" stroke-width=\"6\"/><path d=\"m17 42 18-26\" stroke=\"#efd6ac\" stroke-width=\"2\"/><path d=\"M40 14q16 5 11 24\" stroke=\"#9aafc5\"/><path d=\"m49 36 4 1-1 8-4-1Z\" fill=\"#f8b3b5\" stroke=\"#d68f9a\"/><path d=\"m40 47 13-5q7-1 4 5l-4 4 3 5q3 6-4 4l-12-5\" fill=\"#9db9da\" stroke=\"#7999bd\"/><path d=\"M7 50q2-13 17-13h9q13 1 13 13T24 62Q9 62 7 50Z\" fill=\"#f3bdab\" stroke=\"#d29786\"/><path d=\"M18 39h13l7 7H18Z\" fill=\"#a3c6bd\" stroke=\"none\"/><circle cx=\"16\" cy=\"49\" r=\"3\" fill=\"#5c6676\" stroke=\"none\"/><circle cx=\"17\" cy=\"48\" r=\"1\" fill=\"#fff\" stroke=\"none\"/><path d=\"m29 48 5 4-5 4\" stroke=\"#d99786\"/>",
  "cooking": "<path d=\"M9 15 43 9q5-1 8 3l8 8v30q0 5-5 7L22 61q-5 0-8-4l-8-8V21q0-4 3-6Z\" fill=\"#b6c6d8\" stroke=\"#8597b0\"/><path d=\"m44 10 13 11-33 6L8 16Z\" fill=\"#e0e8f0\" stroke=\"none\"/><path d=\"m8 17 15 11v32L8 49Z\" fill=\"#95a8c0\" stroke=\"none\"/><rect x=\"27\" y=\"29\" width=\"24\" height=\"9\" rx=\"3\" fill=\"#5d6c87\" stroke=\"none\"/><rect x=\"27\" y=\"42\" width=\"24\" height=\"13\" rx=\"4\" fill=\"#5d6c87\" stroke=\"none\"/><path d=\"M32 53q-3-6 4-10l4 5 5-3q5 9-6 9Z\" fill=\"#ffbe79\" stroke=\"none\"/><path d=\"m32 20 9-2M12 29v9\" stroke=\"#eff6ff\" stroke-width=\"3\"/><path d=\"m34 49 4 4 4-2\" stroke=\"#ffe6a0\" stroke-width=\"3\"/>",
  "adventure": "<path d=\"m15 47-7 7q-3 3 0 5l2 2q2 2 5-1l9-9\" fill=\"#c79b7d\" stroke=\"#99775f\"/><path d=\"m25 42 7-7v-7l8-1v-8l10-10q4-4 8-1 3 4-1 8L47 27h-8v8h-7l-7 8Z\" fill=\"#7ddcd8\" stroke=\"#489f9e\" stroke-width=\"3\"/><path d=\"m31 33 20-20\" stroke=\"#c5ffed\" stroke-width=\"4\"/><path d=\"m15 36 17 17q3 3 6-1 2-3-1-5L21 31q-3-3-6 0t0 5Z\" fill=\"#75b7b1\" stroke=\"#4e8e8a\"/><path d=\"m10 55 5 3\" stroke=\"#ecd3a5\" stroke-width=\"3\"/><path d=\"M12 12v8m-4-4h8M48 43v8m-4-4h8\" stroke=\"#eac878\" stroke-width=\"3\"/>",
  "market": "<rect x=\"11\" y=\"11\" width=\"42\" height=\"43\" rx=\"13\" fill=\"#d6b09a\" stroke=\"#aa8373\"/><path d=\"M12 25V19q0-10 12-10h16q12 0 12 10v6\" fill=\"#b49b83\" stroke=\"#947d6c\"/><path d=\"M19 28h10m7 0h10\" stroke=\"#77695e\" stroke-width=\"4\"/><rect x=\"21\" y=\"32\" width=\"6\" height=\"5\" rx=\"2\" fill=\"#87ab83\" stroke=\"none\"/><rect x=\"38\" y=\"32\" width=\"6\" height=\"5\" rx=\"2\" fill=\"#87ab83\" stroke=\"none\"/><rect x=\"28\" y=\"31\" width=\"9\" height=\"15\" rx=\"4\" fill=\"#bd937e\" stroke=\"#a77f6b\"/><path d=\"M20 48q12 7 24 0\" stroke=\"#a77f6b\"/><path d=\"m42 45 8-5 10 7v11l-9 4-10-6Z\" fill=\"#9ddbb2\" stroke=\"#62aa86\"/><path d=\"m43 46 8 4 9-3m-9 3v11\" stroke=\"#d7ffe1\"/><path d=\"M17 18h22\" stroke=\"#d8c4a6\" stroke-width=\"3\"/>",
  "chat": "<rect x=\"7\" y=\"10\" width=\"48\" height=\"42\" rx=\"12\" fill=\"#dfb887\" stroke=\"#b7916a\"/><rect x=\"12\" y=\"15\" width=\"38\" height=\"32\" rx=\"8\" fill=\"#efcfa2\" stroke=\"none\"/><path d=\"M15 24h31M15 37h31\" stroke=\"#d6ad7c\"/><rect x=\"27\" y=\"49\" width=\"9\" height=\"12\" rx=\"3\" fill=\"#c39a73\" stroke=\"#a68160\"/><path d=\"m19 24 7 6-7 6m14 1h8\" stroke=\"#fffaf0\" stroke-width=\"4\"/><path d=\"M16 19h16\" stroke=\"#fff0cf\" stroke-width=\"3\"/>",
  "star": "<path d=\"M28 8q4-6 8 0l5 13 13 5q7 4 0 8l-13 5-5 15q-4 7-8 0l-5-15-13-5q-7-4 0-8l13-5Z\" fill=\"#ffe4a7\" stroke=\"#d6b875\"/><path d=\"m32 15 5 13 12 2-12 5-5 14-5-14-12-5 12-2Z\" fill=\"#fff7d8\" stroke=\"none\"/><path d=\"m32 20 4 10-4 10-4-10Z\" fill=\"#e5c4ed\" stroke=\"#c5a8d5\"/><path d=\"M11 9v7m-3-3h6m45 30v7m-3-3h6\" stroke=\"#b7d9f2\" stroke-width=\"3\"/>"
};
export function illustration(key){return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><ellipse cx="32" cy="59" rx="21" ry="3" fill="#8caec7" opacity=".13"/>${art[key]||art.book}</svg>`;}
// 관리 → 문서 관리 → 섹션 편집의 "카드 아이콘" 선택지
export const ICON_CHOICES = [
 ['village','잔디 블록 (시작·마을)'], ['book','책 (규칙·문서)'], ['farm','당근 (생활·농사)'], ['fish','낚시'],
 ['cooking','화로 (요리·기본)'], ['adventure','다이아 검 (RPG·모험)'], ['market','주민·에메랄드 (상점·경제)'],
 ['star','네더의 별 (이벤트·가차)'], ['chat','명령어 표지판 (도움말·커뮤니티)'],
];
// 섹션에 아이콘을 직접 고르지 않았으면 이름으로 짐작합니다
export function guideIconKey(name=''){
 const rules=[
  [/시작|첫걸음|입문|접속|마을|건축/,'village'],
  [/규칙|법전|약속|정책/,'book'],
  [/낚시|어부/,'fish'],
  [/요리|조리/,'cooking'],
  [/농|작물|생활|직업/,'farm'],
  [/RPG|모험|전투|던전|레이드|장비/i,'adventure'],
  [/가차|뽑기|이벤트|대회|축제/,'star'],
  [/경제|상점|거래|시세|저잣|주식|마켓|콘텐츠|후원|VIP/i,'market'],
  [/설정|도움|문의|커뮤니티|모드|리소스/,'chat'],
  [/기본|시스템/,'cooking'],
 ];
 const hit=rules.find(([re])=>re.test(name));
 return hit?hit[1]:'book';
}
export function guideIllustration(name='', key=''){
 return illustration(art[key]?key:guideIconKey(name));
}
