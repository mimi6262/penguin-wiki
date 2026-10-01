// Local, resolution-independent illustrations. No network or data access.
const art = {
 village: `<path fill="#d8c39a" d="M14 30h36v25H14z"/><path fill="#f8eed3" d="M19 32h26v23H19z"/><path fill="#87674b" d="M13 30h5v26h-5zm33 0h5v26h-5z"/><path fill="#60736e" d="M5 28q10-1 14-13h26q4 12 14 13l-2 5H7z"/><path fill="#354f4b" d="M5 28q25 5 54 0l-2 5H7z"/><path stroke="#a0afa0" d="m22 17-5 9m11-9-2 10m8-10 1 10m5-10 5 9"/><path fill="#ac8152" d="M26 37h12v19H26z"/><path stroke="#ddbf86" d="M32 38v17"/><circle fill="#efe0ae" cx="29" cy="47" r="1"/><path fill="#b5bc9a" d="M10 56h44v4H10z"/>`,
 farm: `<path stroke="#7d9255" d="M22 37 19 11m12 27 4-29m7 29 7-20"/><path fill="#d4b368" d="m18 11-6 2 1 6 7 2zm2 11-7 1 1 6 7 2zm15-12-6 4 1 6 6-3zm-1 12-6 3v6l6-2z"/><path fill="#edce83" d="m20 13 6-3 2 6-7 6zm14 0 7-2 1 6-8 5zm-1 11 7-2 1 6-8 4z"/><path fill="#749354" d="M41 36q-5-17 8-21 7 11-8 21Z"/><path fill="#aac282" d="M42 35q3-12 13-10 1 9-13 10Z"/><path fill="#c7955c" d="m9 36 5 21q17 6 36 0l5-21z"/><path fill="#ead09a" d="M8 34h48v7H8z"/><path stroke="#96653e" d="M14 47h36m-34 6h32m-27-10 2 14m9-14v15m10-15-2 14"/>`,
 fish: `<path fill="#bed7cf" stroke="none" d="M5 51q11-7 22 0t22 0l10 6H5z"/><path stroke="#9d714a" stroke-width="5" d="m12 53 22-43"/><path stroke="#e1bc7e" stroke-width="2" d="m14 48 18-35"/><path stroke="#879d92" d="M35 10q13 2 14 16v10"/><path fill="#d6a26e" d="M46 26h6v8h-6z"/><path fill="#f6e9c9" d="M46 26h6v4h-6z"/><path fill="#6d9f9f" d="M20 44q12-17 28-1-11 18-28 1Z"/><path fill="#699090" d="m47 43 10-7v14z"/><path fill="#d5e4d8" d="M21 45q13 9 26-1-10 15-26 1Z"/><path fill="#9bbab2" d="m31 34 7-5 4 9"/><circle fill="#334b46" cx="27" cy="41" r="2"/><path stroke="#c5d6c8" d="m35 41 3 3-3 4"/>`,
 cooking: `<path stroke="#c5bca4" d="M24 16c-5-6 5-7 0-12m13 12c-5-6 5-7 0-12"/><path fill="#b99060" d="m16 57 29-9 4 5-29 9z"/><path fill="#d0ab75" d="m18 49 29 9-2 5-30-10z"/><path fill="#d6924d" d="M23 55q-4-9 5-15l3 7 6-7q10 11 2 16z"/><path fill="#f0c16c" stroke="none" d="m28 55 4-9 5 10z"/><path fill="#59645a" d="M12 29h40l-3 15q-16 10-34 0z"/><path fill="#778477" d="M16 31h32l-2 6q-15 6-29 0z"/><path fill="#c0bca0" d="M9 27q22-22 46 0v5H9z"/><path fill="#8d9885" d="M10 27h44v5H10z"/><path fill="#526359" d="M27 14h10v6H27z"/><path d="M11 34H6v6h8m38-6h6v6h-8" fill="none"/>`,
 adventure: `<path fill="#6a8b77" d="m15 24 17-6 17 6v15q-3 13-17 20-14-7-17-20z"/><path fill="#91ab87" d="m20 28 12-5 12 5v11q-3 9-12 14-9-5-12-14z"/><path fill="#c6d4c6" d="m43 6 9 1 1 9-26 27-9-9z"/><path fill="#f4f4dd" d="m43 6 4 5-25 27-4-4z"/><path stroke="#80958d" d="m47 12-22 27"/><path fill="#d6b36d" d="m15 29 19 18-4 5-20-18z"/><path fill="#916746" d="m15 39 8 8-10 11-8-8z"/><path stroke="#d2a46d" d="m11 45 7 6"/><path fill="#dfbf7a" d="m6 48 10 9-4 5-10-9z"/>`,
 market: `<path fill="#e7d4a6" d="M12 28h40v28H12z"/><path fill="#98714b" d="M11 29h5v29h-5zm37 0h5v29h-5z"/><path fill="#778c6c" d="m7 18 8-9h34l8 9v11H7z"/><path fill="#f2e5c5" d="M18 9h9l-2 20H15zm19 0h9l4 20H39z"/><path fill="#cdb578" d="M7 24h50v6q-6 7-12 0-7 7-13 0-6 7-12 0-7 7-13 0z"/><path fill="#b58b59" d="M8 45h48v13H8z"/><path fill="#d9b580" d="M7 43h50v5H7z"/><path fill="#9aaf70" d="M19 42q-7-9 0-13 9 1 7 13z"/><path fill="#c37e51" d="M29 43q-2-10 6-11 8 3 6 11z"/><path stroke="#f4db9b" d="M14 51h35"/>`,
 book: `<path fill="#b5915e" d="M12 9h40v48H12z"/><path fill="#f6e8c8" d="M17 7h34v46H17z"/><path fill="#789785" d="M13 8h10v48H13z"/><path fill="#e2c18a" d="M11 56h41v4H11z"/><path stroke="#efe0bc" d="M18 15h-7m7 10h-7m7 10h-7m7 10h-7"/><path fill="#ddca9d" stroke="none" d="M28 17h17v18H28z"/><path stroke="#897b57" d="M32 22h9m-9 6h6M28 43h17"/><path fill="#b5765c" d="M38 7h7v15l-3-3-4 3z"/>`,
 chat: `<path fill="#56766c" d="M10 15h43v31H29L16 57V46h-6z"/><path fill="#f5e9cc" d="M8 10h43v32H24L13 50v-8H8z"/><path fill="#789789" d="M15 16h29v20H15z"/><circle fill="#f8edce" stroke="none" cx="22" cy="26" r="2"/><circle fill="#f8edce" stroke="none" cx="30" cy="26" r="2"/><circle fill="#f8edce" stroke="none" cx="38" cy="26" r="2"/><path fill="#dbb572" d="m48 34 3 6 7 1-5 5 1 7-6-3-6 3 1-7-5-5 7-1z"/>`,
 star: `<path fill="#9a7750" d="m32 7 8 15 17 3-12 13 2 18-15-8-16 8 3-18L6 25l18-3z"/><path fill="#dbb66e" d="m32 4 8 15 17 3-12 13 2 18-15-8-16 8 3-18L6 22l18-3z"/><path fill="#f1dca0" stroke="none" d="m32 10 5 14 13 1-16 8-12 12 2-13-9-8 13-1z"/><path stroke="#b69255" d="m32 33 10 14M32 33l2-17"/><path stroke="#b6a16b" d="M55 9v8m-4-4h8M8 43v8m-4-4h8"/>`
};
export function illustration(key){return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64" fill="none" stroke="#615b46" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><ellipse cx="32" cy="59" rx="24" ry="3" fill="#565637" opacity=".12" stroke="none"/>${art[key]||art.book}</svg>`;}
// 관리 → 문서 관리 → 섹션 편집의 "카드 아이콘" 선택지
export const ICON_CHOICES = [
 ['village','한옥 (시작·마을)'], ['book','책 (규칙·문서)'], ['farm','곡식 바구니 (생활·농사)'], ['fish','낚시'],
 ['cooking','가마솥 (요리·기본)'], ['adventure','검과 방패 (RPG·모험)'], ['market','가판대 (상점·경제)'],
 ['star','별 (이벤트·가차)'], ['chat','대화 (도움말·커뮤니티)'],
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
