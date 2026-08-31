// admin-schedule.js — 관리자 "교육 시간 설정" 탭 로직
// -----------------------------------------------------------------------------
// schedules/{YYYY-MM-DD} 문서에 startTime, endTime (HH:MM) 을 저장/조회한다.
// 시간표는 날짜마다 1개이며 3개 반 공통.

(function () {
  function todayLocalYMD() {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  }

  const HHMM_RE = /^\d{2}:\d{2}$/;

  document.addEventListener("DOMContentLoaded", () => {
    const dateInput = document.getElementById("scheduleDateInput");
    const startInput = document.getElementById("scheduleStartInput");
    const endInput = document.getElementById("scheduleEndInput");
    const saveBtn = document.getElementById("scheduleSaveBtn");
    const statusEl = document.getElementById("scheduleStatus");

    if (!dateInput) return; // admin.html 이 아닌 페이지에서 안전하게 종료

    dateInput.value = todayLocalYMD();

    async function loadForDate(date) {
      if (!window.db || !date) return;
      statusEl.textContent = "";
      startInput.value = "";
      endInput.value = "";
      try {
        const snap = await window.db.collection("schedules").doc(date).get();
        if (snap.exists) {
          const d = snap.data();
          if (HHMM_RE.test(d.startTime || "")) startInput.value = d.startTime;
          if (HHMM_RE.test(d.endTime || "")) endInput.value = d.endTime;
          statusEl.textContent = "기존 시간표를 불러왔습니다.";
        } else {
          statusEl.textContent = "이 날짜에는 아직 시간표가 없습니다.";
        }
      } catch (err) {
        console.error(err);
        statusEl.textContent = "시간표 조회 중 오류가 발생했습니다.";
      }
    }

    dateInput.addEventListener("change", () => loadForDate(dateInput.value));

    // 최초 진입 시(관리자 인증 후) 자동 로드
    if (window.adminAuthReady && window.adminAuthReady.then) {
      window.adminAuthReady.then(() => loadForDate(dateInput.value));
    } else {
      loadForDate(dateInput.value);
    }

    saveBtn.addEventListener("click", async () => {
      statusEl.textContent = "";
      const date = dateInput.value;
      const startTime = startInput.value;
      const endTime = endInput.value;

      if (!date) {
        statusEl.textContent = "날짜를 선택해주세요.";
        return;
      }
      if (!HHMM_RE.test(startTime) || !HHMM_RE.test(endTime)) {
        statusEl.textContent = "시작/종료 시간을 모두 입력해주세요.";
        return;
      }
      // 시작 < 종료 간단 검증
      if (startTime >= endTime) {
        statusEl.textContent = "종료 시간은 시작 시간보다 뒤여야 합니다.";
        return;
      }

      saveBtn.disabled = true;
      saveBtn.textContent = "저장 중...";
      try {
        await window.db.collection("schedules").doc(date).set({
          startTime: startTime,
          endTime: endTime,
          updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
        }, { merge: true });
        statusEl.textContent = "저장되었습니다.";
      } catch (err) {
        console.error(err);
        statusEl.textContent = "저장 실패: " + (err.message || err.code || "");
      } finally {
        saveBtn.disabled = false;
        saveBtn.textContent = "저장";
      }
    });
  });
})();
