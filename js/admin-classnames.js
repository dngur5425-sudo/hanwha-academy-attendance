// admin-classnames.js — 반 이름 설정 탭 로직
// -----------------------------------------------------------------------------
// Firestore config/classNames 문서를 읽고/쓴다.
// { class1, class2, class3, updatedAt }

(function () {
  const DEFAULTS = { class1: "A반", class2: "B반", class3: "C반" };

  async function loadClassNames() {
    if (!window.db) return { ...DEFAULTS };
    try {
      const snap = await window.db.collection("config").doc("classNames").get();
      if (!snap.exists) return { ...DEFAULTS };
      const d = snap.data() || {};
      return {
        class1: (d.class1 && String(d.class1)) || DEFAULTS.class1,
        class2: (d.class2 && String(d.class2)) || DEFAULTS.class2,
        class3: (d.class3 && String(d.class3)) || DEFAULTS.class3,
      };
    } catch (err) {
      console.error("[loadClassNames]", err);
      return { ...DEFAULTS };
    }
  }

  // 다른 스크립트에서 재사용
  window.classNamesConfig = {
    load: loadClassNames,
    DEFAULTS,
  };

  document.addEventListener("DOMContentLoaded", () => {
    const input1 = document.getElementById("className1Input");
    const input2 = document.getElementById("className2Input");
    const input3 = document.getElementById("className3Input");
    const saveBtn = document.getElementById("classNamesSaveBtn");
    const statusEl = document.getElementById("classNamesStatus");

    if (!input1 || !saveBtn) return; // admin.html 이 아니면 무시

    async function fillCurrent() {
      const cur = await loadClassNames();
      input1.value = cur.class1;
      input2.value = cur.class2;
      input3.value = cur.class3;
    }

    if (window.adminAuthReady && window.adminAuthReady.then) {
      window.adminAuthReady.then(fillCurrent);
    } else {
      fillCurrent();
    }

    saveBtn.addEventListener("click", async () => {
      statusEl.textContent = "";
      statusEl.classList.remove("is-success");
      const c1 = input1.value.trim();
      const c2 = input2.value.trim();
      const c3 = input3.value.trim();
      if (!c1 || !c2 || !c3) {
        statusEl.textContent = "세 개의 반 이름을 모두 입력해주세요.";
        return;
      }
      if (c1.length > 20 || c2.length > 20 || c3.length > 20) {
        statusEl.textContent = "반 이름은 20자 이하로 입력해주세요.";
        return;
      }

      saveBtn.disabled = true;
      saveBtn.textContent = "저장 중...";
      try {
        await window.db.collection("config").doc("classNames").set({
          class1: c1,
          class2: c2,
          class3: c3,
          updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
        }, { merge: true });
        statusEl.classList.add("is-success");
        statusEl.textContent =
          "저장되었습니다. 기존에 인쇄된 QR코드는 예전 이름으로 남아있으니, 이름을 바꾼 반은 QR코드를 다시 생성해서 인쇄해주세요.";
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
