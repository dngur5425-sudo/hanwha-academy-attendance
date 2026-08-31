// attend.js — 교육생 출석 제출 (입실/퇴실 upsert)
// -----------------------------------------------------------------------------
// 데이터 모델:
//   attendances/{autoId}
//     name, class, date, checkInAt|null, checkOutAt|null, createdAt, updatedAt
//   같은 (date, class, name) 조합에 대해 문서는 1개이며,
//   입실 제출 시 checkInAt, 퇴실 제출 시 checkOutAt 을 채운다.
//
// 반 목록은 Firestore config/classNames 문서에서 동적으로 가져온다.

const DEFAULT_CLASS_NAMES = ["A반", "B반", "C반"];
let CLASS_OPTIONS = [...DEFAULT_CLASS_NAMES]; // config 로드 후 갱신

async function fetchClassNames() {
  if (!window.db) return [...DEFAULT_CLASS_NAMES];
  try {
    const snap = await window.db.collection("config").doc("classNames").get();
    if (!snap.exists) return [...DEFAULT_CLASS_NAMES];
    const d = snap.data() || {};
    return [
      d.class1 || DEFAULT_CLASS_NAMES[0],
      d.class2 || DEFAULT_CLASS_NAMES[1],
      d.class3 || DEFAULT_CLASS_NAMES[2],
    ];
  } catch (err) {
    console.error("[fetchClassNames]", err);
    return [...DEFAULT_CLASS_NAMES];
  }
}

// URL ?class= 파라미터를 실제 옵션에 매칭.
// 우선 완전 일치, 없으면 "반" 접미사 붙여 재시도 (구 QR 하위호환).
function normalizeClassParam(raw, options) {
  if (!raw) return null;
  const trimmed = String(raw).trim();
  if (options.includes(trimmed)) return trimmed;
  const withSuffix = trimmed.endsWith("반") ? trimmed : trimmed + "반";
  if (options.includes(withSuffix)) return withSuffix;
  // 단축값(A/B/C) → 인덱스 기반 하위호환
  const idx = { A: 0, B: 1, C: 2 }[trimmed.toUpperCase()];
  if (idx != null && options[idx]) return options[idx];
  return null;
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

// localStorage 는 (date + class + name + type) 조합으로 관리
function localStorageKey(date, className, name, type) {
  return `attend:${date}:${className}:${name}:${type}`;
}

function typeLabel(type) {
  return type === "in" ? "입실" : "퇴실";
}

document.addEventListener("DOMContentLoaded", async () => {
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

  // 반 이름을 Firestore config 에서 로드
  CLASS_OPTIONS = await fetchClassNames();

  // 반 드롭다운 채우기
  CLASS_OPTIONS.forEach((c) => {
    const opt = document.createElement("option");
    opt.value = c;
    opt.textContent = c;
    classSelect.appendChild(opt);
  });

  // 쿼리 파라미터 처리
  const { classParam, dateParam } = getQuery();
  const selectedClassFromUrl = normalizeClassParam(classParam, CLASS_OPTIONS);
  if (selectedClassFromUrl) classSelect.value = selectedClassFromUrl;

  const attendanceDate = (dateParam && /^\d{4}-\d{2}-\d{2}$/.test(dateParam))
    ? dateParam
    : todayLocalYMD();

  dateLabel.textContent = `${attendanceDate} 출석`;

  // 이미 제출 감지 (선택된 type 기준)
  function selectedType() {
    const el = document.querySelector('input[name="type"]:checked');
    return el ? el.value : null;
  }

  function refreshAlreadyUI() {
    const type = selectedType();
    const name = nameInput.value.trim();
    if (!type || !name) {
      alreadyBox.hidden = true;
      return;
    }
    const key = localStorageKey(attendanceDate, classSelect.value, name, type);
    alreadyBox.hidden = !localStorage.getItem(key);
  }

  document.querySelectorAll('input[name="type"]').forEach((el) =>
    el.addEventListener("change", refreshAlreadyUI)
  );
  classSelect.addEventListener("change", refreshAlreadyUI);
  nameInput.addEventListener("input", refreshAlreadyUI);

  let forceOverwrite = false;
  submitAgainBtn.addEventListener("click", () => {
    alreadyBox.hidden = true;
    forceOverwrite = true;
  });

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    errorMsg.textContent = "";

    const name = nameInput.value.trim();
    const className = classSelect.value;
    const type = selectedType();

    if (!name) {
      errorMsg.textContent = "이름을 입력해주세요.";
      nameInput.focus();
      return;
    }
    if (!CLASS_OPTIONS.includes(className)) {
      errorMsg.textContent = "반을 선택해주세요.";
      return;
    }
    if (!type) {
      errorMsg.textContent = "입실 또는 퇴실을 선택해주세요.";
      return;
    }
    if (!window.db) {
      errorMsg.textContent = "서버 연결 설정이 아직 되지 않았습니다. 관리자에게 문의하세요.";
      return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = "제출 중...";

    try {
      const col = window.db.collection("attendances");
      const q = await col
        .where("date", "==", attendanceDate)
        .where("class", "==", className)
        .where("name", "==", name)
        .limit(1)
        .get();

      const serverTs = firebase.firestore.FieldValue.serverTimestamp;
      let extraNote = "";

      if (q.empty) {
        // 새 문서 생성 — 선택한 type 만 값 채움, 나머지는 null
        const payload = {
          name,
          class: className,
          date: attendanceDate,
          checkInAt: type === "in" ? serverTs() : null,
          checkOutAt: type === "out" ? serverTs() : null,
          createdAt: serverTs(),
          updatedAt: serverTs(),
        };
        await col.add(payload);

        if (type === "out") {
          extraNote = " 다만 입실 기록이 없어 출석률 계산 시 불인정으로 처리될 수 있습니다.";
        }
      } else {
        const doc = q.docs[0];
        const data = doc.data();
        const hasIn = !!data.checkInAt;
        const hasOut = !!data.checkOutAt;

        if (type === "in" && hasIn && !forceOverwrite) {
          submitBtn.disabled = false;
          submitBtn.textContent = "출석하기";
          alreadyBox.hidden = false;
          alreadyBox.querySelector("p").textContent =
            "이미 입실 처리되었습니다. 그래도 다시 제출하시겠어요?";
          return;
        }
        if (type === "out" && hasOut && !forceOverwrite) {
          submitBtn.disabled = false;
          submitBtn.textContent = "출석하기";
          alreadyBox.hidden = false;
          alreadyBox.querySelector("p").textContent =
            "이미 퇴실 처리되었습니다. 그래도 다시 제출하시겠어요?";
          return;
        }

        // update: 해당 필드 + updatedAt 만 갱신
        const updatePayload = { updatedAt: serverTs() };
        if (type === "in") updatePayload.checkInAt = serverTs();
        else updatePayload.checkOutAt = serverTs();

        await doc.ref.update(updatePayload);

        if (type === "out" && !hasIn) {
          extraNote = " 다만 입실 기록이 없어 출석률 계산 시 불인정으로 처리될 수 있습니다.";
        }
      }

      // localStorage 기록
      localStorage.setItem(
        localStorageKey(attendanceDate, className, name, type),
        new Date().toISOString()
      );

      form.hidden = true;
      alreadyBox.hidden = true;
      doneBox.hidden = false;
      doneMsg.textContent = `${name}님, ${className} ${typeLabel(type)}이 완료되었습니다.${extraNote}`;
    } catch (err) {
      console.error(err);
      errorMsg.textContent = "제출 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.";
      submitBtn.disabled = false;
      submitBtn.textContent = "출석하기";
      forceOverwrite = false;
    }
  });
});
