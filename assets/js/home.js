// 홈 화면 문구·첫 화면 그림의 기본값.
// 관리 → 사이트 설정에서 비워 두면 이 값이 보이고, 채우면 그 값으로 바뀝니다 (settings/site.home, settings/site.heroImage).
import { esc } from './ui.js';

export const HOME_TEXT_DEFAULTS = {
  heroEdition: 'PENGUIN VILLAGE · 마을 안내소',
  heroEyebrow: '함께 머무는 작은 세상',
  heroTitle: '오늘도,\n우리 *마을에서.*',
  heroCaption: '산 너머 작은 마을, 당신의 이야기가 시작되는 곳',
  guideKicker: '하나씩 알아가는 마을 생활',
  guideTitle: '당신의 하루를 골라보세요',
  communityKicker: '발걸음이 모여 이야기가 되는 곳',
  communityTitle: '우리 마을 사랑방',
};

// 첫 화면 그림 기본값과 권장 크기 (교체용 그림을 이 크기·비율로 만들면 잘림이 가장 적습니다)
export const HERO_DEFAULT = {
  src: 'assets/images/penguin-village.webp',
  alt: '갓을 쓴 펭귄과 농부 펭귄이 반기는 아늑한 한옥 마을',
  width: 1536,
  height: 1024,
};

// 큰 제목: 줄바꿈은 그대로, *별표*로 감싼 부분은 강조색
export function titleHtml(text) {
  return esc(text).replace(/\*([^*\n]+)\*/g, '<em>$1</em>').replace(/\n/g, '<br>');
}

// settings/site.heroImage 값('img:문서ID' 또는 https 주소)을 실제 이미지 주소로
export async function resolveHeroSrc(value) {
  if (!value) return null;
  if (/^https:\/\//.test(value)) return value;
  const m = /^img:([A-Za-z0-9_-]{1,40})$/.exec(value);
  if (!m) return null;
  const { db, doc, getDoc } = await import('./firebase.js');
  const snap = await getDoc(doc(db, 'images', m[1]));
  return snap.exists() ? snap.data().data : null;
}
