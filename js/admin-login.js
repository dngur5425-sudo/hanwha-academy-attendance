// admin-login.js — 관리자 로그인 (Firebase Authentication 이메일/비밀번호)
// -----------------------------------------------------------------------------
// Firebase 콘솔 > Authentication > Sign-in method 에서 "이메일/비밀번호" 를 활성화하고,
// Users 탭에서 관리자 계정을 미리 등록해두어야 한다.

function translateAuthError(code) {
  switch (code) {
    case "auth/invalid-email":
      return "이메일 형식이 올바르지 않습니다.";
    case "auth/user-disabled":
      return "비활성화된 계정입니다. 관리자에게 문의하세요.";
    case "auth/user-not-found":
    case "auth/wrong-password":
    case "auth/invalid-credential":
    case "auth/invalid-login-credentials":
      return "이메일 또는 비밀번호가 올바르지 않습니다.";
    case "auth/too-many-requests":
      return "로그인 시도가 너무 많습니다. 잠시 후 다시 시도하세요.";
    case "auth/network-request-failed":
      return "네트워크 오류가 발생했습니다. 연결 상태를 확인하세요.";
    default:
      return "로그인 중 오류가 발생했습니다. (" + code + ")";
  }
}

document.addEventListener("DOMContentLoaded", () => {
  if (!window.auth) {
    console.error("[admin-login] window.auth 가 없습니다. Firebase Auth SDK 로드를 확인하세요.");
    return;
  }

  const form = document.getElementById("loginForm");
  const emailInput = document.getElementById("emailInput");
  const pwInput = document.getElementById("pwInput");
  const errorEl = document.getElementById("loginError");
  const loginBtn = document.getElementById("loginBtn");

  // 이미 로그인되어 있으면 대시보드로 이동
  window.auth.onAuthStateChanged((user) => {
    if (user) {
      window.location.replace("./admin.html");
    }
  });

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    errorEl.textContent = "";

    const email = emailInput.value.trim();
    const password = pwInput.value;

    if (!email || !password) {
      errorEl.textContent = "이메일과 비밀번호를 모두 입력해주세요.";
      return;
    }

    loginBtn.disabled = true;
    loginBtn.textContent = "로그인 중...";

    try {
      await window.auth.signInWithEmailAndPassword(email, password);
      window.location.replace("./admin.html");
    } catch (err) {
      console.error(err);
      errorEl.textContent = translateAuthError(err && err.code);
      loginBtn.disabled = false;
      loginBtn.textContent = "로그인";
      pwInput.select();
    }
  });
});
