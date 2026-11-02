/**
 * 펭귄서버 상태 알림 — 5분마다 정확히 실행시키는 구글 Apps Script
 *
 * GitHub 자체 예약(cron)은 실제로는 몇 시간 간격으로만 돌아서, 이 스크립트가 5분마다
 * GitHub Actions 「서버 상태 알림」(.github/workflows/server-status.yml)을 실행 요청(workflow_dispatch)합니다.
 * 공개 저장소라 Actions 실행 시간은 무료입니다.
 *
 * 설정 (한 번만)
 *  1. GitHub → Settings → Developer settings → Personal access tokens → Fine-grained tokens → Generate new token
 *     - Repository access: Only select repositories → mimi6262/penguin-wiki
 *     - Permissions → Repository permissions → Actions: Read and write (나머지는 그대로)
 *     - Expiration: 1년. 만료 전에 새로 만들어 아래 스크립트 속성 값만 바꾸면 됩니다.
 *  2. script.google.com → 새 프로젝트 → 이 파일 내용 전체를 붙여넣고 저장
 *  3. 왼쪽 ⚙ 프로젝트 설정 → 스크립트 속성 → 속성 추가: GITHUB_TOKEN = (1에서 만든 토큰)
 *  4. 위쪽 함수 목록에서 setup 을 골라 ▶ 실행 → 권한 허용
 *     → 한 번 실행 요청을 보내 보고, 성공하면 5분마다 도는 트리거를 만듭니다.
 *  5. GitHub 저장소 Actions 탭에서 5분마다 「서버 상태 알림」 실행이 생기는지 확인
 *
 * 토큰은 코드에 넣지 않습니다(스크립트 속성에만). 실행 요청이 실패하면 오류를 내서
 * 구글이 트리거 실패 메일을 보냅니다(왼쪽 ⏰ 트리거 → 실패 알림 설정에서 「즉시」로 바꿀 수 있음).
 * 멈추려면 stop 을 실행합니다.
 */
const REPO = 'mimi6262/penguin-wiki';
const WORKFLOW = 'server-status.yml';
const HANDLER = 'dispatchServerStatus';

// 5분마다 트리거가 부르는 함수: GitHub 에 「서버 상태 알림」 실행을 요청
function dispatchServerStatus() {
  const token = PropertiesService.getScriptProperties().getProperty('GITHUB_TOKEN');
  if (!token) throw new Error('스크립트 속성 GITHUB_TOKEN 이 없습니다. 프로젝트 설정 → 스크립트 속성에 GitHub 토큰을 넣어 주세요.');
  const res = UrlFetchApp.fetch(`https://api.github.com/repos/${REPO}/actions/workflows/${WORKFLOW}/dispatches`, {
    method: 'post',
    contentType: 'application/json',
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28' },
    payload: JSON.stringify({ ref: 'main' }),
    muteHttpExceptions: true,
  });
  const code = res.getResponseCode();
  if (code !== 204) throw new Error(`GitHub 실행 요청 실패 (${code}): ${res.getContentText().slice(0, 300)}`);
}

// 한 번만 실행: 실행 요청을 한 번 보내 보고, 성공하면 기존 트리거를 지우고 5분 트리거를 새로 만듭니다.
function setup() {
  dispatchServerStatus(); // 토큰이 없거나 권한이 틀리면 여기서 멈추고 이유를 보여 줍니다
  removeTriggers_();
  ScriptApp.newTrigger(HANDLER).timeBased().everyMinutes(5).create();
  Logger.log('완료: 5분마다 실행됩니다. GitHub 저장소 Actions 탭에서 「서버 상태 알림」 실행을 확인해 보세요.');
}

// 멈추고 싶을 때 실행
function stop() {
  removeTriggers_();
  Logger.log('멈춤: 5분 트리거를 지웠습니다. GitHub 자체 예약(몇 시간 간격)만 남습니다.');
}

function removeTriggers_() {
  ScriptApp.getProjectTriggers()
    .filter((t) => t.getHandlerFunction() === HANDLER)
    .forEach((t) => ScriptApp.deleteTrigger(t));
}
