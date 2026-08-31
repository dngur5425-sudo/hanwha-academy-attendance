// admin-qr.js — 관리자 QR 생성 기능
// -----------------------------------------------------------------------------
// 인증 가드는 admin-auth-guard.js 에서 공통 처리됨.
// 반 목록은 Firestore config/classNames 에서 로드 (admin-classnames.js 의 loader 재사용).

function todayLocalYMD() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function buildAttendUrl(classValue, dateValue) {
  const base = new URL("./attend.html", window.location.href);
  base.searchParams.set("class", classValue);
  base.searchParams.set("date", dateValue);
  return base.toString();
}

document.addEventListener("DOMContentLoaded", async () => {
  const classSelect = document.getElementById("qrClassSelect");
  const dateInput = document.getElementById("qrDateInput");
  const generateBtn = document.getElementById("generateQrBtn");
  const resultBox = document.getElementById("qrResult");
  const urlText = document.getElementById("qrUrlText");
  const canvasWrap = document.getElementById("qrCanvasWrap");
  const downloadBtn = document.getElementById("downloadQrBtn");

  // 반 목록 로드 (config/classNames)
  let classNames = ["A반", "B반", "C반"];
  if (window.classNamesConfig && typeof window.classNamesConfig.load === "function") {
    const cfg = await window.classNamesConfig.load();
    classNames = [cfg.class1, cfg.class2, cfg.class3];
  }

  classNames.forEach((name) => {
    const opt = document.createElement("option");
    opt.value = name; // QR URL 에 실제 반 이름 그대로 사용
    opt.textContent = name;
    classSelect.appendChild(opt);
  });

  dateInput.value = todayLocalYMD();

  generateBtn.addEventListener("click", () => {
    const classValue = classSelect.value;
    const dateValue = dateInput.value || todayLocalYMD();
    const url = buildAttendUrl(classValue, dateValue);

    urlText.textContent = url;

    canvasWrap.innerHTML = "";
    new QRCode(canvasWrap, {
      text: url,
      width: 240,
      height: 240,
      correctLevel: QRCode.CorrectLevel.M,
    });

    resultBox.hidden = false;
  });

  downloadBtn.addEventListener("click", () => {
    const canvas = canvasWrap.querySelector("canvas");
    const img = canvasWrap.querySelector("img");

    let dataUrl = null;
    if (canvas) dataUrl = canvas.toDataURL("image/png");
    else if (img) dataUrl = img.src;
    if (!dataUrl) {
      alert("먼저 QR을 생성해주세요.");
      return;
    }

    const classValue = classSelect.value;
    const dateValue = dateInput.value || todayLocalYMD();
    const filename = `QR_${classValue}_${dateValue}.png`;

    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  });
});
