// excel-export.js — SheetJS(xlsx) 를 이용한 엑셀 내보내기 유틸
// -----------------------------------------------------------------------------
// window.exportAttendancesToExcel(rows, filename, scheduleMap)
//   rows: [{ name, class, date, checkInAt(Date|null), checkOutAt(Date|null), ... }]
//   filename: 예) "출석부_A반_2026-08-31.xlsx"
//   scheduleMap: { "YYYY-MM-DD": { startTime, endTime } }  (없는 날짜는 "시간표 미설정")

(function () {
  function formatTimeHM(d) {
    if (!d) return "";
    const hh = String(d.getHours()).padStart(2, "0");
    const mm = String(d.getMinutes()).padStart(2, "0");
    return `${hh}:${mm}`;
  }

  window.exportAttendancesToExcel = function (rows, filename, scheduleMap) {
    if (typeof XLSX === "undefined") {
      alert("엑셀 라이브러리(xlsx)가 로드되지 않았습니다.");
      return;
    }
    scheduleMap = scheduleMap || {};
    const utils = window.attendanceUtils; // admin-list.js 에서 노출

    const data = rows.map((r, i) => {
      const schedule = scheduleMap[r.date] || null;
      let ratePct = "";
      let statusText = "";
      if (utils && typeof utils.computeAttendanceStatus === "function") {
        const { rate, statusText: st } = utils.computeAttendanceStatus(r, schedule);
        statusText = st;
        ratePct = rate == null ? "" : `${Math.floor(rate * 100)}%`;
      } else {
        statusText = schedule ? "" : "시간표 미설정";
      }

      return {
        번호: i + 1,
        이름: r.name,
        반: r.class,
        날짜: r.date,
        입실시각: formatTimeHM(r.checkInAt),
        퇴실시각: formatTimeHM(r.checkOutAt),
        "출석률(%)": ratePct,
        상태: statusText,
      };
    });

    const ws = XLSX.utils.json_to_sheet(data, {
      header: ["번호", "이름", "반", "날짜", "입실시각", "퇴실시각", "출석률(%)", "상태"],
    });

    ws["!cols"] = [
      { wch: 6 },
      { wch: 14 },
      { wch: 8 },
      { wch: 12 },
      { wch: 10 },
      { wch: 10 },
      { wch: 10 },
      { wch: 14 },
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "출석부");
    XLSX.writeFile(wb, filename);
  };
})();
