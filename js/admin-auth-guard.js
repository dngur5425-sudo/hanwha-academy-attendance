// admin-auth-guard.js — 관리자 페이지 공통 Firebase Auth 가드
// -----------------------------------------------------------------------------
// admin.html, admin-qr.js, admin-list.js 에서 공통으로 사용하는 인증 가드.
// window.auth.onAuthStateChanged 로 로그인 여부를 확인하고,
// 로그인 안 되어있으면 즉시 admin-login.html 로 리다이렉트한다.
//
// 다른 admin-* 스크립트보다 먼저 로드되어야 하며,
// 각 스크립트는 필요 시 window.adminAuthReady (Promise) 를 await 해서
// 로그인된 user 객체를 받을 수 있다.

(function () {
  if (!window.auth) {
    console.error("[admin-auth-guard] window.auth 가 없습니다. firebase-config.js 로드 순서를 확인하세요.");
    window.location.replace("./admin-login.html");
    return;
  }

  window.adminAuthReady = new Promise((resolve) => {
    const unsub = window.auth.onAuthStateChanged((user) => {
      if (!user) {
        window.location.replace("./admin-login.html");
        return;
      }
      resolve(user);
    });
    // unsub 는 필요 시 window._adminAuthUnsub 로 접근 가능
    window._adminAuthUnsub = unsub;
  });
})();
