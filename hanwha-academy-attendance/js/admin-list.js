// admin-list.js — 출석 현황 조회 (출석률/상태 계산 포함)
// -----------------------------------------------------------------------------
// 인증 가드는 admin-auth-guard.js 에서 공통 처리됨.
//
// 데이터 모델 가정:
//   attendances/{id}: { name, class, date, submittedAt, checkInAt?, checkOutAt? }
//     - checkInAt, checkOutAt 은 Firestore Timestamp.
//     - 하위호환: checkInAt 이 없으면 submittedAt 을 입실시각으로 간주.
//     - checkOutAt 이 없으면 "퇴실 없음" 으로 판단 → 불인정.
//     TODO: attend.js 에 별도의 "퇴실" 제출 흐름을 구현하면 checkOutAt 이 자동으로 채워짐.
//   schedules/{date}: { startTime: "HH:MM", endTime: "HH:MM", updatedAt }

const LIST_CLASS_OPTIONS = ["A반", "B반", "C반"];
const ALL_VALUE = "__ALL__";

function todayLocalYMD() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function tsToDate(ts) {
  if (!ts) return null;
  return typeof ts.toDate === "function" ? ts.toDate() : new Date(ts);
}

function formatTimeHM(dateObj) {
  if (!dateObj) return "";
  const hh = String(dateObj.getHours()).padStart(2, "0");
  const mm = String(dateObj.getMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
}

function hhmmToDateOnDate(dateStr, hhmm) {
  const [y, mo, da] = dateStr.split("-").map(Number);
  const [h, m] = hhmm.split(":").map(Number);
  return new Date(y, mo - 1, da, h, m, 0, 0);
}

/**
 * 학생 1명 출석률/상태 계산.
 * schedule: { startTime, endTime } | null
 * row: { date, checkInAt(Date|null), checkOutAt(Date|null) }
 * return: { rate: 0~1 | null, statusText, statusClass }
 */
function computeAttendanceStatus(row, schedule) {
  if (!schedule) {
    return { rate: null, statusText: "시간표 미설정", statusClass: "status-none" };
  }
  const checkIn = row.checkInAt;
  const checkOut = row.checkOutAt;
  if (!checkIn || !checkOut) {
    return { rate: 0, statusText: "불인정", statusClass: "status-fail" };
  }
  const schedStart = hhmmToDateOnDate(row.date, schedule.startTime);
  const schedEnd = hhmmToDateOnDate(row.date, schedule.endTime);
  const totalMin = Math.max(0, (schedEnd - schedStart) / 60000);
  if (totalMin <= 0) {
    return { rate: 0, statusText: "불인정", statusClass: "status-fail" };
  }
  const effectiveStart = new Date(Math.max(checkIn.getTime(), schedStart.getTime()));
  const effectiveEnd = new Date(Math.min(checkOut.getTime(), schedEnd.getTime()));
  const actualMin = Math.max(0, (effectiveEnd - effectiveStart) / 60000);
  const rate = actualMin / totalMin;
  if (rate >= 0.8) {
    return { rate, statusText: "정상출석", statusClass: "status-ok" };
  }
  return { rate, statusText: "불인정", statusClass: "status-fail" };
}

// 다른 스크립트(excel-export.js) 에서 재사용
window.attendanceUtils = {
  computeAttendanceStatus,
  hhmmToDateOnDate,
  tsToDate,
  formatTimeHM,
};

let currentRows = [];
let currentSchedule = null;
let currentFilter = { date: "", className: ALL_VALUE };

async function fetchSchedule(date) {
  try {
    const snap = await window.db.collection("schedules").doc(date).get();
    if (!snap.exists) return null;
    const d = snap.data();
    if (!d.startTime || !d.endTime) return null;
    return { startTime: d.startTime, endTime: d.endTime };
  } catch (err) {
    console.error("[fetchSchedule]", err);
    return null;
  }
}

function mapDocToRow(doc) {
  const d = doc.data();
  const checkInAt = tsToDate(d.checkInAt) || tsToDate(d.submittedAt) || null;
  const checkOutAt = tsToDate(d.checkOutAt) || null;
  return {
    id: doc.id,
    name: d.name || "",
    class: d.class || "",
    date: d.date || "",
    checkInAt,
    checkOutAt,
    submittedAt: d.submittedAt || null,
  };
}

document.addEventListener("DOMContentLoaded", () => {
  const dateInput = document.getElementById("listDateInput");
  const classSelect = document.getElementById("listClassSelect");
  const queryBtn = document.getElementById("queryBtn");
  const excelBtn = document.getElementById("excelBtn");
  const excelAllBtn = document.getElementById("excelAllBtn");
  const statusEl = document.getElementById("listStatus");
  const tbody = document.querySelector("#attendTable tbody");

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
      let attRef = window.db.collection("attendances").where("date", "==", date);
      if (className !== ALL_VALUE) {
        attRef = attRef.where("class", "==", className);
      }

      const [schedule, snap] = await Promise.all([fetchSchedule(date), attRef.get()]);

      const rows = [];
      snap.forEach((doc) => rows.push(mapDocToRow(doc)));

      // 입실시각 오름차순
      rows.sort((a, b) => {
        const ta = a.checkInAt ? a.checkInAt.getTime() : Infinity;
        const tb = b.checkInAt ? b.checkInAt.getTime() : Infinity;
        return ta - tb;
      });

      currentRows = rows;
      currentSchedule = schedule;
      currentFilter = { date, className };

      renderRows(rows, schedule, tbody);
      const scheduleMsg = schedule
        ? `시간표: ${schedule.startTime} ~ ${schedule.endTime}`
        : "⚠ 이 날짜의 시간표가 설정되지 않았습니다 (출석률 계산 불가)";
      statusEl.textContent = `총 ${rows.length}건 · ${scheduleMsg}`;
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
    const scheduleMap = {};
    if (currentSchedule) scheduleMap[currentFilter.date] = currentSchedule;
    window.exportAttendancesToExcel(currentRows, filename, scheduleMap);
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
      snap.forEach((doc) => rows.push(mapDocToRow(doc)));

      const uniqueDates = Array.from(new Set(rows.map((r) => r.date).filter(Boolean)));
      const scheduleMap = {};
      await Promise.all(
        uniqueDates.map(async (d) => {
          const s = await fetchSchedule(d);
          if (s) scheduleMap[d] = s;
        })
      );

      rows.sort((a, b) => {
        if (a.date !== b.date) return a.date < b.date ? -1 : 1;
        const ta = a.checkInAt ? a.checkInAt.getTime() : Infinity;
        const tb = b.checkInAt ? b.checkInAt.getTime() : Infinity;
        return ta - tb;
      });

      const today = todayLocalYMD();
      window.exportAttendancesToExcel(rows, `출석부_전체데이터_${today}.xlsx`, scheduleMap);
      statusEl.textContent = `전체 ${rows.length}건 다운로드 완료`;
    } catch (err) {
      console.error(err);
      statusEl.textContent = "전체 데이터 다운로드 실패";
    }
  });
});

function renderRows(rows, schedule, tbody) {
  tbody.innerHTML = "";
  if (!rows.length) {
    const tr = document.createElement("tr");
    const td = document.createElement("td");
    td.colSpan = 7;
    td.textContent = "데이터가 없습니다.";
    td.className = "empty-cell";
    tr.appendChild(td);
    tbody.appendChild(tr);
    return;
  }
  rows.forEach((r, i) => {
    const { rate, statusText, statusClass } = computeAttendanceStatus(r, schedule);
    const ratePct = rate == null ? "-" : `${Math.floor(rate * 100)}%`;
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${i + 1}</td>
      <td>${escapeHtml(r.name)}</td>
      <td>${escapeHtml(r.class)}</td>
      <td>${escapeHtml(formatTimeHM(r.checkInAt))}</td>
      <td>${escapeHtml(formatTimeHM(r.checkOutAt))}</td>
      <td>${ratePct}</td>
      <td><span class="status-badge ${statusClass}">${escapeHtml(statusText)}</span></td>
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
