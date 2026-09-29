// 디스코드 웹훅 알림 — 웹훅 주소는 settings/private(편집자만 읽기)에 보관하고, 편집자의 브라우저에서 직접 보냅니다.
// 서버가 없어서 "예약된 시각에 자동 발송"은 못 하고, 편집자가 저장·게시하는 순간에 보냅니다.
import { db, doc, getDoc, setDoc, serverTimestamp } from './firebase.js';
import { ROOT } from './ui.js';

const COLOR = { patch: 0xA63A2B, event: 0xBA7517, guide: 0x3A5A78, test: 0x3F6B4F };
let cache = null;

export async function getDiscordSettings() {
  if (cache) return cache;
  try {
    const snap = await getDoc(doc(db, 'settings', 'private'));
    cache = snap.exists() ? snap.data() : {};
  } catch { cache = {}; }
  return cache;
}
export async function saveDiscordSettings(data, by) {
  await setDoc(doc(db, 'settings', 'private'), { ...data, updatedAt: serverTimestamp(), updatedBy: by }, { merge: true });
  cache = null;
}
export const siteUrl = (path = '') => new URL(ROOT + path, location.href).href;

// 실제 전송. 웹훅이 없으면 조용히 건너뜀. 성공 여부를 돌려줍니다.
export async function postDiscord({ title, description = '', url = '', color = COLOR.patch, fields = [], footer = '펭귄서버 위키' }, settings) {
  const s = settings || await getDiscordSettings();
  if (!s.webhook) return false;
  const embed = { title: title.slice(0, 256), description: description.slice(0, 3500), color, footer: { text: footer }, timestamp: new Date().toISOString() };
  if (url) embed.url = url;
  if (fields.length) embed.fields = fields.slice(0, 10).map((f) => ({ name: String(f.name).slice(0, 256), value: String(f.value || '-').slice(0, 1024), inline: !!f.inline }));
  const res = await fetch(s.webhook, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: s.botName || '펭귄서버 위키', embeds: [embed] }),
  });
  if (!res.ok) throw new Error(`디스코드 응답 ${res.status}`);
  return true;
}

// 패치노트 본문([카테고리] / ㆍ항목)을 디스코드용 텍스트로
export function patchBodyToText(body, max = 1800) {
  const lines = (body || '').replace(/\r/g, '').split('\n').map((l) => {
    const m = l.match(/^\s*\[([^\]]{1,40})\]\s*$/);
    if (m) return `**[${m[1]}]**`;
    return l.replace(/^(\s*)[ㆍ\-*]\s?/, '$1• ');
  }).filter((l, i, arr) => !(l.trim() === '' && (arr[i - 1] || '').trim() === ''));
  let out = lines.join('\n');
  if (out.length > max) out = out.slice(0, max - 1) + '…';
  return out;
}

export async function notifyPatch(note) {
  return postDiscord({
    title: `📋 패치노트 · ${note.date} · ${note.title || (note.categories || []).join(', ')}`,
    description: patchBodyToText(note.body),
    url: siteUrl('patch.html'), color: COLOR.patch,
  });
}
export async function notifyEvent(ev, periodText, statusLabel) {
  return postDiscord({
    title: `🔥 이벤트 · ${ev.name}`,
    description: ev.note || '',
    url: ev.link && ev.link.startsWith('http') ? ev.link : siteUrl(ev.link || 'events.html'), color: COLOR.event,
    fields: [{ name: '기간', value: periodText || '-', inline: true }, { name: '상태', value: statusLabel || '-', inline: true }],
  });
}
export async function notifyGuide(page, summary) {
  return postDiscord({
    title: `📖 가이드 업데이트 · ${page.title}`,
    description: summary || '',
    url: siteUrl(`guide.html?p=${encodeURIComponent(page.id)}`), color: COLOR.guide,
  });
}
export async function notifyTest(by, settings) {
  return postDiscord({ title: '✅ 펭귄서버 위키 연결 확인', description: `${by} 님이 관리 화면에서 보낸 테스트 메시지입니다.`, url: siteUrl('index.html'), color: COLOR.test }, settings);
}
