// 실시간 서버 상태 (홈 "접속 중" 표시)
// 공개 마인크래프트 상태 조회 서비스에서 켜짐/꺼짐·접속 인원을 읽습니다.
//   1) api.mcstatus.io (약 1분 캐시)  2) 안 되면 api.mcsrvstat.us (약 5분 캐시)
// 둘 다 실패하면 null 을 돌려주고, 홈은 관리 화면에 직접 넣은 숫자(onlineCount)로 대신 표시합니다.

async function getJson(url, timeout) {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), timeout);
  try {
    const r = await fetch(url, { signal: ctl.signal, cache: 'no-store' });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return await r.json();
  } finally {
    clearTimeout(timer);
  }
}

const SOURCES = [
  (a, t) => getJson(`https://api.mcstatus.io/v2/status/java/${a}?query=false`, t).then((r) => ({
    online: !!r.online, players: r.players?.online ?? null, max: r.players?.max ?? null, source: 'mcstatus.io',
  })),
  (a, t) => getJson(`https://api.mcsrvstat.us/3/${a}`, t).then((r) => ({
    online: !!r.online, players: r.players?.online ?? null, max: r.players?.max ?? null, source: 'mcsrvstat.us',
  })),
];

export async function fetchServerStatus(address, { timeout = 6000 } = {}) {
  const a = encodeURIComponent(String(address || '').trim());
  if (!a) return null;
  for (const src of SOURCES) {
    try { return await src(a, timeout); } catch { /* 다음 곳으로 */ }
  }
  return null;
}

// 화면이 열려 있는 동안 1분마다 다시 확인 (탭이 숨겨져 있으면 쉬었다가 돌아오면 바로 확인)
export function watchServerStatus(address, onStatus, { every = 60000 } = {}) {
  let timer = null, stopped = false;
  const tick = async () => {
    if (stopped) return;
    if (document.visibilityState === 'hidden') { timer = setTimeout(tick, every); return; }
    onStatus(await fetchServerStatus(address));
    timer = setTimeout(tick, every);
  };
  const onVis = () => { if (document.visibilityState === 'visible') { clearTimeout(timer); tick(); } };
  document.addEventListener('visibilitychange', onVis);
  tick();
  return () => { stopped = true; clearTimeout(timer); document.removeEventListener('visibilitychange', onVis); };
}
