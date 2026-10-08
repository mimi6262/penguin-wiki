#!/usr/bin/env python3
"""펭귄서버 상태 확인 → 켜짐/꺼짐이 바뀌었을 때만 디스코드 웹훅으로 알림.

GitHub Actions(.github/workflows/server-status.yml)가 5분마다 실행합니다.
- 서버 주소: 위키 관리 → 사이트 설정의 "서버 주소"(settings/site.serverAddress)를 읽습니다.
  저장소 변수 SERVER_ADDRESS 를 넣으면 그 값을 우선 씁니다.
- 웹훅 주소: 저장소 비밀값 DISCORD_WEBHOOK_STATUS (코드에 넣지 않습니다).
- 이전 상태: server-status 브랜치의 state.json (바뀔 때만 기록).
- 조용한 시간: 저장소 변수 STATUS_QUIET_HOURS="04:00-05:00" 처럼 넣으면 그 시간(KST)엔 확인·알림을 건너뜁니다.
"""
import datetime as dt
import json
import os
import sys
import time
import urllib.request

KST = dt.timezone(dt.timedelta(hours=9))
STATE_FILE = os.environ.get('STATE_FILE', 'state.json')
SETTINGS_URL = ('https://firestore.googleapis.com/v1/projects/penguin-wiki/databases/(default)/documents/'
                'settings/site?mask.fieldPaths=serverAddress')
UA = 'DiscordBot (https://penguinwiki.kr, 1.0) penguin-wiki-status'
RED, GREEN, BLUE = 0xA63A2B, 0x3F6B4F, 0x3A5A78


def now():
    return dt.datetime.now(KST)


def fmt(t):
    return t.astimezone(KST).strftime('%m/%d %H:%M')


def duration(sec):
    m = max(1, round(sec / 60))
    if m < 60:
        return f'약 {m}분'
    h, m = divmod(m, 60)
    return f'약 {h}시간 {m}분' if m else f'약 {h}시간'


def in_quiet_hours(spec, t):
    """'04:00-05:00' 형식. 자정을 넘는 범위('23:30-00:30')도 됩니다."""
    if not spec or '-' not in spec:
        return False
    try:
        a, b = [dt.datetime.strptime(x.strip(), '%H:%M').time() for x in spec.split('-', 1)]
    except ValueError:
        return False
    c = t.time()
    return a <= c < b if a <= b else (c >= a or c < b)


def server_address():
    if os.environ.get('SERVER_ADDRESS', '').strip():
        return os.environ['SERVER_ADDRESS'].strip()
    req = urllib.request.Request(SETTINGS_URL, headers={'User-Agent': UA})
    with urllib.request.urlopen(req, timeout=15) as r:
        d = json.load(r)
    return d.get('fields', {}).get('serverAddress', {}).get('stringValue', '').strip()


def check(addr, tries=3, gap=15):
    """세 번까지 시도해서 한 번이라도 되면 켜짐. 잠깐 끊긴 것을 꺼짐으로 착각하지 않게."""
    from mcstatus import JavaServer
    err = ''
    for i in range(tries):
        try:
            s = JavaServer.lookup(addr, timeout=8).status()
            return {'up': True, 'online': s.players.online, 'max': s.players.max, 'version': s.version.name}
        except Exception as e:  # 접속 안 됨, 시간 초과, 주소 못 찾음 등
            err = f'{type(e).__name__}: {e}'[:200]
            if i < tries - 1:
                time.sleep(gap)
    return {'up': False, 'error': err}


def post(webhook, embed):
    body = json.dumps({'username': '펭귄서버 상태', 'embeds': [embed]}).encode()
    req = urllib.request.Request(webhook, data=body, method='POST',
                                 headers={'Content-Type': 'application/json', 'User-Agent': UA})
    with urllib.request.urlopen(req, timeout=15) as r:
        return r.status


def embed(title, desc, color, fields, t):
    return {'title': title, 'description': desc, 'color': color, 'timestamp': t.isoformat(),
            'fields': [{'name': k, 'value': v, 'inline': True} for k, v in fields],
            'footer': {'text': '펭귄서버 위키 · 약 5분마다 확인'}}


def main():
    t = now()
    if in_quiet_hours(os.environ.get('QUIET_HOURS', ''), t):
        print('조용한 시간이라 건너뜁니다')
        return 0
    try:
        prev = json.load(open(STATE_FILE, encoding='utf-8'))
    except (OSError, ValueError):
        prev = {}
    addr = server_address()
    if not addr:
        print('위키 설정에 서버 주소가 없어 건너뜁니다')
        return 0

    cur = check(addr)
    webhook = os.environ.get('DISCORD_WEBHOOK_STATUS', '').strip()
    send_test = os.environ.get('SEND_TEST', '').lower() == 'true'
    players = lambda c: f"{c.get('online', 0)} / {c.get('max', 0)}명"
    msg = None

    if 'up' not in prev:
        # 처음 실행: 지금 상태만 기록하고 조용히 넘어감
        print(f'첫 확인: {addr} → {"켜짐" if cur["up"] else "꺼짐"}')
    elif prev['up'] and not cur['up']:
        msg = embed('서버 연결 끊김', f'`{addr}` 에 접속되지 않습니다. 서버 PC와 서버 프로그램을 확인해 주세요.', RED,
                    [('감지 시각', fmt(t)), ('확인 간격', '약 5~15분')], t)
    elif not prev['up'] and cur['up']:
        down_since = dt.datetime.fromisoformat(prev.get('since', t.isoformat()))
        msg = embed('서버 다시 열림', f'`{addr}` 에 다시 접속할 수 있습니다.', GREEN,
                    [('복구 시각', fmt(t)), ('끊겨 있던 시간', duration((t - down_since).total_seconds())), ('접속 중', players(cur))], t)

    if send_test and not msg:
        state = f"켜짐 · 접속 중 {players(cur)}" if cur['up'] else '꺼짐 (접속 안 됨)'
        msg = embed('서버 상태 알림 연결 확인', f'`{addr}` 현재 상태: **{state}**\n앞으로 켜짐·꺼짐이 바뀔 때 이 채널로 알려 드립니다.', BLUE,
                    [('확인 시각', fmt(t))], t)

    if msg:
        if webhook:
            print('디스코드 전송:', msg['title'], post(webhook, msg))
        else:
            print('웹훅 비밀값(DISCORD_WEBHOOK_STATUS)이 없어 전송은 건너뜀:', msg['title'])

    changed = ('up' not in prev) or (prev['up'] != cur['up'])
    new = {'up': cur['up'], 'address': addr, 'checked': t.isoformat(),
           'since': t.isoformat() if changed else prev.get('since', t.isoformat())}
    if cur['up']:
        new.update(online=cur.get('online'), max=cur.get('max'), version=cur.get('version'))
    else:
        new['error'] = cur.get('error', '')
    json.dump(new, open(STATE_FILE, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    if changed:
        open(STATE_FILE + '.changed', 'w').write('1')
    print(json.dumps(new, ensure_ascii=False))
    return 0


if __name__ == '__main__':
    sys.exit(main())
