// admin-list.js — 출석 현황 조회 + 엑셀 다운로드
// -----------------------------------------------------------------------------
// 인증 가드는 admin-auth-guard.js 에서 공통 처리됨.

const LIST_CLASS_OPTIONS = ["A반", "B반", "C반"];
const ALL_VALUE = "__ALL__";

function todayLocalYMD() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function formatTimestamp(ts) {
  if (!ts) return "";
  const d = typeof ts.toDate === "function" ? ts.toDate() : new Date(ts);
  const y = d.getFullYear();
  const mo = String(d.getMonth() + 1).padStart(2, "0");
  const da = String(d.getDate()).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  const ss = String(d.getSeconds()).padStart(2, "0");
  return `${y}-${mo}-${da} ${hh}:${mm}:${ss}`;
}

// 현재 표에 렌더된 데이터를 보관 (엑셀 다운로드에 사용)
let currentRows = [];
let currentFilter = { date: "", className: ALL_VALUE };

document.addEventListener("DOMContentLoaded", () => {
  const dateInput = document.getElementById("listDateInput");
  const classSelect = document.getElementById("listClassSelect");
  const queryBtn = document.getElementById("queryBtn");
  const excelBtn = document.getElementById("excelBtn");
  const excelAllBtn = document.getElementById("excelAllBtn");
  const statusEl = document.getElementById("listStatus");
  const tbody = document.querySelector("#attendTable tbody");

  // 반 select 채우기 (전체 옵션은 HTML에 이미 있음)
  LIST_CLASS_OPTIONS.forEach((c) => {
    const opt = document.createElement("option");
    opt.value = c;
    opt.textContent = c;
    classSelect.appendChild(opt);
  });

  dateInput.value = todayLocalYMD();

  queryBtn.addEventListener("click", async () => {
    if (!window.db) {
      statusEl.textContent = "Firebase 설정이 필요합니다.";
      return;
    }
    const date = dateInput.value;
    const className = classSelect.value;
    if (!date) {
      statusEl.textContent = "날짜를 선택해주세요.";
      return;
    }

    statusEl.textContent = "조회 중...";
    tbody.innerHTML = "";

    try {
      let ref = window.db.collection("attendances").where("date", "==", date);
      if (className !== ALL_VALUE) {
        ref = ref.where("class", "==", className);
      }
      const snap = await ref.get();

      const rows = [];
      snap.forEach((doc) => {
        const d = doc.data();
        rows.push({
          id: doc.id,
          name: d.name || "",
          class: d.class || "",
          date: d.date || "",
          submittedAt: d.submittedAt || null,
        });
      });

      // 제출 시각 오름차순 (submittedAt 없는 항목은 뒤로)
      rows.sort((a, b) => {
        const ta = a.submittedAt && a.submittedAt.toMillis ? a.submittedAt.toMillis() : Infinity;
        const tb = b.submittedAt && b.submittedAt.toMillis ? b.submittedAt.toMillis() : Infinity;
        return ta - tb;
      });

      currentRows = rows;
      currentFilter = { date, className };

      renderRows(rows, tbody);
      statusEl.textContent = `총 ${rows.length}건`;
    } catch (err) {
      console.error(err);
      statusEl.textContent = "조회 중 오류가 발생했습니다. (Firestore 규칙/인덱스를 확인하세요)";
    }
  });

  excelBtn.addEventListener("click", () => {
    if (!currentRows.length) {
      alert("먼저 조회를 실행해주세요.");
      return;
    }
    const classLabel = currentFilter.className === ALL_VALUE ? "전체" : currentFilter.className;
    const filename = `출석부_${classLabel}_${currentFilter.date}.xlsx`;
    window.exportAttendancesToExcel(currentRows, filename);
  });

  excelAllBtn.addEventListener("click", async () => {
    if (!window.db) {
      alert("Firebase 설정이 필요합니다.");
      return;
    }
    if (!confirm("attendances 컬렉션의 전체 데이터를 다운로드합니다. 계속할까요?")) return;

    statusEl.textContent = "전체 데이터 로딩 중...";
    try {
      const snap = await window.db.collection("attendances").get();
      const rows = [];
      snap.forEach((doc) => {
        const d = doc.data();
        rows.push({
          id: doc.id,
          name: d.name || "",
          class: d.class || "",
          date: d.date || "",
          submittedAt: d.submittedAt || null,
        });
      });
      rows.sort((a, b) => {
        if (a.date !== b.date) return a.date < b.date ? -1 : 1;
        const ta = a.submittedAt && a.submittedAt.toMillis ? a.submittedAt.toMillis() : Infinity;
        const tb = b.submittedAt && b.submittedAt.toMillis ? b.submittedAt.toMillis() : Infinity;
        return ta - tb;
      });
      const today = todayLocalYMD();
      window.exportAttendancesToExcel(rows, `출석부_전체데이터_${today}.xlsx`);
      statusEl.textContent = `전체 ${rows.length}건 다운로드 완료`;
    } catch (err) {
      console.error(err);
      statusEl.textContent = "전체 데이터 다운로드 실패";
    }
  });
});

function renderRows(rows, tbody) {
  tbody.innerHTML = "";
  if (!rows.length) {
    const tr = document.createElement("tr");
    const td = document.createElement("td");
    td.colSpan = 4;
    td.textContent = "데이터가 없습니다.";
    td.className = "empty-cell";
    tr.appendChild(td);
    tbody.appendChild(tr);
    return;
  }
  rows.forEach((r, i) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${i + 1}</td>
      <td>${escapeHtml(r.name)}</td>
      <td>${escapeHtml(r.class)}</td>
      <td>${escapeHtml(formatTimestamp(r.submittedAt))}</td>
    `;
    tbody.appendChild(tr);
  });
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
