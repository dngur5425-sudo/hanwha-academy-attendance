// admin-qr.js — 관리자 QR 생성 기능
// -----------------------------------------------------------------------------
// 인증 가드
if (sessionStorage.getItem("hanwha_admin_auth") !== "1") {
  window.location.replace("./admin-login.html");
}

// attend.js 와 동일한 반 목록 (동기화 필요)
// TODO: 반 목록이 자주 바뀌면 별도 config 파일로 분리하는 것을 고려
const QR_CLASS_OPTIONS = [
  { label: "A반", value: "A" },
  { label: "B반", value: "B" },
  { label: "C반", value: "C" },
];

function todayLocalYMD() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function buildAttendUrl(classValue, dateValue) {
  // 현재 페이지 기준 상대 경로 → attend.html 절대 URL 로 변환
  const base = new URL("./attend.html", window.location.href);
  base.searchParams.set("class", classValue);
  base.searchParams.set("date", dateValue);
  return base.toString();
}

document.addEventListener("DOMContentLoaded", () => {
  const classSelect = document.getElementById("qrClassSelect");
  const dateInput = document.getElementById("qrDateInput");
  const generateBtn = document.getElementById("generateQrBtn");
  const resultBox = document.getElementById("qrResult");
  const urlText = document.getElementById("qrUrlText");
  const canvasWrap = document.getElementById("qrCanvasWrap");
  const downloadBtn = document.getElementById("downloadQrBtn");

  // 반 select 채우기
  QR_CLASS_OPTIONS.forEach((c) => {
    const opt = document.createElement("option");
    opt.value = c.value;
    opt.textContent = c.label;
    classSelect.appendChild(opt);
  });

  // 날짜 기본값 = 오늘
  dateInput.value = todayLocalYMD();

  let qrInstance = null;

  generateBtn.addEventListener("click", () => {
    const classValue = classSelect.value;
    const dateValue = dateInput.value || todayLocalYMD();
    const url = buildAttendUrl(classValue, dateValue);

    urlText.textContent = url;

    // 기존 QR 지우기
    canvasWrap.innerHTML = "";
    qrInstance = new QRCode(canvasWrap, {
      text: url,
      width: 240,
      height: 240,
      correctLevel: QRCode.CorrectLevel.M,
    });

    resultBox.hidden = false;
  });

  downloadBtn.addEventListener("click", () => {
    // qrcodejs 는 내부적으로 <canvas> 또는 <img> 를 생성함
    const canvas = canvasWrap.querySelector("canvas");
    const img = canvasWrap.querySelector("img");

    let dataUrl = null;
    if (canvas) {
      dataUrl = canvas.toDataURL("image/png");
    } else if (img) {
      dataUrl = img.src;
    }
    if (!dataUrl) {
      alert("먼저 QR을 생성해주세요.");
      return;
    }

    const classValue = classSelect.value;
    const dateValue = dateInput.value || todayLocalYMD();
    const filename = `QR_${classValue}반_${dateValue}.png`;

    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  });
});
