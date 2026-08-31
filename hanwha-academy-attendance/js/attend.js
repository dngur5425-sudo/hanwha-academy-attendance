// attend.js — 교육생 출석 제출 페이지 로직
// -----------------------------------------------------------------------------
// 반 목록은 여기서 관리 (수정하기 쉽게 상단에 배치)
// TODO: 실제 운영 반 이름이 다르면 여기 값을 교체하세요.
const CLASS_OPTIONS = ["A반", "B반", "C반"];

// URL 쿼리에서 class 파라미터로 넘어오는 값은 "A", "B", "C" 형태로 가정.
// (관리자 QR 생성 페이지에서 그렇게 만들어 보냄)
// 그 값을 실제 드롭다운 값(CLASS_OPTIONS)과 매핑하기 위한 함수.
function normalizeClassParam(raw) {
  if (!raw) return null;
  const trimmed = String(raw).trim();
  // "A" → "A반", "A반" → "A반"
  const withSuffix = trimmed.endsWith("반") ? trimmed : trimmed + "반";
  return CLASS_OPTIONS.includes(withSuffix) ? withSuffix : null;
}

function todayLocalYMD() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function getQuery() {
  const q = new URLSearchParams(window.location.search);
  return {
    classParam: q.get("class"),
    dateParam: q.get("date"),
  };
}

function localStorageKey(date, className) {
  return `attend:${date}:${className}`;
}

document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("attendForm");
  const nameInput = document.getElementById("nameInput");
  const classSelect = document.getElementById("classSelect");
  const errorMsg = document.getElementById("errorMsg");
  const submitBtn = document.getElementById("submitBtn");
  const dateLabel = document.getElementById("dateLabel");
  const doneBox = document.getElementById("doneBox");
  const doneMsg = document.getElementById("doneMsg");
  const alreadyBox = document.getElementById("alreadyBox");
  const submitAgainBtn = document.getElementById("submitAgainBtn");

  // 반 드롭다운 채우기
  CLASS_OPTIONS.forEach((c) => {
    const opt = document.createElement("option");
    opt.value = c;
    opt.textContent = c;
    classSelect.appendChild(opt);
  });

  // 쿼리 파라미터 처리
  const { classParam, dateParam } = getQuery();
  const selectedClassFromUrl = normalizeClassParam(classParam);
  if (selectedClassFromUrl) {
    classSelect.value = selectedClassFromUrl;
    // 요구사항: disable 하지 말 것 (사용자가 수정 가능)
  }

  const attendanceDate = (dateParam && /^\d{4}-\d{2}-\d{2}$/.test(dateParam))
    ? dateParam
    : todayLocalYMD();

  dateLabel.textContent = `${attendanceDate} 출석`;

  // 이미 제출한 이력 감지 (localStorage 기반, UX 목적)
  function refreshAlreadySubmittedUI() {
    const key = localStorageKey(attendanceDate, classSelect.value);
    if (localStorage.getItem(key)) {
      alreadyBox.hidden = false;
    } else {
      alreadyBox.hidden = true;
    }
  }
  refreshAlreadySubmittedUI();
  classSelect.addEventListener("change", refreshAlreadySubmittedUI);

  submitAgainBtn.addEventListener("click", () => {
    alreadyBox.hidden = true;
  });

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    errorMsg.textContent = "";

    const name = nameInput.value.trim();
    const className = classSelect.value;

    if (!name) {
      errorMsg.textContent = "이름을 입력해주세요.";
      nameInput.focus();
      return;
    }
    if (!CLASS_OPTIONS.includes(className)) {
      errorMsg.textContent = "반을 선택해주세요.";
      return;
    }
    if (!window.db) {
      errorMsg.textContent = "서버 연결 설정이 아직 되지 않았습니다. 관리자에게 문의하세요.";
      return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = "제출 중...";

    try {
      await window.db.collection("attendances").add({
        name: name,
        class: className,
        date: attendanceDate,
        submittedAt: firebase.firestore.FieldValue.serverTimestamp(),
      });

      // localStorage 기록
      localStorage.setItem(
        localStorageKey(attendanceDate, className),
        new Date().toISOString()
      );

      form.hidden = true;
      alreadyBox.hidden = true;
      doneBox.hidden = false;
      doneMsg.textContent = `${name}님, ${className} 출석이 완료되었습니다.`;
    } catch (err) {
      console.error(err);
      errorMsg.textContent = "제출 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.";
      submitBtn.disabled = false;
      submitBtn.textContent = "출석하기";
    }
  });
});
