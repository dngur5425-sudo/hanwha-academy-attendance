// excel-export.js — SheetJS(xlsx) 를 이용한 엑셀 내보내기 유틸
// -----------------------------------------------------------------------------
// admin-list.js 에서 window.exportAttendancesToExcel(rows, filename) 로 호출됨.
//
// rows: [{ name, class, date, submittedAt(Firestore Timestamp | null) }]
// filename: 예) "출석부_A반_2026-08-31.xlsx"

(function () {
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

  window.exportAttendancesToExcel = function (rows, filename) {
    if (typeof XLSX === "undefined") {
      alert("엑셀 라이브러리(xlsx)가 로드되지 않았습니다.");
      return;
    }
    const data = rows.map((r, i) => ({
      번호: i + 1,
      이름: r.name,
      반: r.class,
      날짜: r.date,
      "제출 시각": formatTimestamp(r.submittedAt),
    }));

    const ws = XLSX.utils.json_to_sheet(data, {
      header: ["번호", "이름", "반", "날짜", "제출 시각"],
    });

    // 컬럼 폭 대략 지정
    ws["!cols"] = [
      { wch: 6 },
      { wch: 14 },
      { wch: 8 },
      { wch: 12 },
      { wch: 22 },
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "출석부");
    XLSX.writeFile(wb, filename);
  };
})();
