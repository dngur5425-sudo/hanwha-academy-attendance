// admin-login.js — 관리자 로그인 로직
// -----------------------------------------------------------------------------
// TODO: 실제 운영 시 환경변수 또는 Firebase Auth로 교체 권장
// (현재는 배포 산출물(JS)에 비밀번호가 그대로 노출되므로 보안 강도가 낮음)
const ADMIN_PASSWORD = "hanwha2026"; // TODO: 운영 배포 전 반드시 변경

const SESSION_KEY = "hanwha_admin_auth";

// 이미 로그인 되어있으면 admin.html 로 바로 이동
if (sessionStorage.getItem(SESSION_KEY) === "1") {
  window.location.replace("./admin.html");
}

document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("loginForm");
  const pwInput = document.getElementById("pwInput");
  const errorEl = document.getElementById("loginError");

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    errorEl.textContent = "";
    const pw = pwInput.value;
    if (pw === ADMIN_PASSWORD) {
      sessionStorage.setItem(SESSION_KEY, "1");
      window.location.replace("./admin.html");
    } else {
      errorEl.textContent = "비밀번호가 올바르지 않습니다.";
      pwInput.select();
    }
  });
});
