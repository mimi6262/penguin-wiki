// 머리글을 지난번 모양 그대로 바로 그려 둡니다 — 페이지를 옮길 때 메뉴가 사라졌다 나타나지 않게.
// 각 페이지의 <header id="site-header"> 바로 뒤에서 (모듈이 아닌 보통 스크립트로) 실행되고, 곧이어 ui.js 의 renderHeader 가 확인합니다.
// 켜진 메뉴 · 관리 메뉴 표시는 renderHeader 와 같은 기준 (guide.html?p=rules = 펭귄법전, 약관 · 처리방침 = 없음)
(function () {
  try {
    var el = document.getElementById('site-header');
    var html = el && localStorage.getItem('pw_header:' + (window.PW_ROOT || './'));
    if (!html) return;
    el.className = 'site-header';
    el.innerHTML = html;
    el.setAttribute('data-pre', '1');
    var path = location.pathname, q = location.search, key = '', m;
    if (/\/admin\//.test(path)) key = 'admin';
    else if (/guide\.html$/.test(path)) key = /[?&]p=rules(&|$)/.test(q) ? 'law' : (/[?&]p=(terms|privacy)(&|$)/.test(q) ? '' : 'guide');
    else if ((m = path.match(/(patch|commands|prices|events)\.html$/))) key = m[1];
    var a = key && el.querySelector('[data-nav="' + key + '"]');
    if (a) a.setAttribute('aria-current', 'page');
    var ed = JSON.parse(localStorage.getItem('pw_editor') || 'null');
    if (ed) {
      var ns = el.querySelectorAll('[data-auth]');
      for (var i = 0; i < ns.length; i++) {
        var need = ns[i].getAttribute('data-auth');
        ns[i].hidden = !(need === 'editor' || (need === 'admin' && ed.role === 'admin'));
      }
      var n = el.querySelector('.user-chip .user-name'); if (n) n.textContent = ed.name || '';
      var r = el.querySelector('.user-chip .role'); if (r) r.textContent = ed.role === 'admin' ? '운영자' : '가이드';
    }
  } catch (e) { /* 기억이 없거나 막혀 있으면 평소처럼 ui.js 가 그림 */ }
})();
