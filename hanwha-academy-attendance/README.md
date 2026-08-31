# 한화내일아카데미 출석 시스템

QR 코드로 교육생이 출석을 제출하고, 관리자가 대시보드에서 조회 · 엑셀로 내려받는 순수 HTML/CSS/JS 기반 웹앱입니다.

- **프론트엔드**: 순수 HTML/CSS/Vanilla JS (빌드 도구 없음)
- **백엔드/DB**: Firebase Firestore
- **호스팅**: Firebase Hosting 또는 GitHub Pages (모든 경로 상대경로)
- **QR 생성**: [qrcodejs](https://github.com/davidshimjs/qrcodejs) CDN
- **엑셀 다운로드**: [SheetJS(xlsx)](https://sheetjs.com/) CDN

---

## 폴더 구조

```
hanwha-academy-attendance/
├── index.html              # attend.html 로 자동 리다이렉트
├── attend.html             # 교육생 출석 제출 페이지 (QR로 접속)
├── admin-login.html        # 관리자 로그인
├── admin.html              # 관리자 대시보드 (QR 생성 + 출석 현황)
├── css/
│   └── style.css
├── js/
│   ├── firebase-config.js  # ⚠ Firebase 콘솔 값으로 교체 필요
│   ├── attend.js
│   ├── admin-login.js
│   ├── admin-qr.js
│   ├── admin-list.js
│   └── excel-export.js
├── firestore.rules
├── .gitignore
└── README.md
```

---

## 1. Firebase 프로젝트 설정

1. [Firebase 콘솔](https://console.firebase.google.com/) 에서 새 프로젝트를 생성합니다.
2. 왼쪽 메뉴 **Build > Firestore Database** 이동 → **데이터베이스 만들기** → 프로덕션 모드로 시작.
3. 왼쪽 위 톱니바퀴 → **프로젝트 설정** → **내 앱** 섹션에서 **웹(</>)** 앱 추가.
4. 앱 등록 후 표시되는 `firebaseConfig` 객체 값을 복사합니다.
5. `js/firebase-config.js` 파일을 열어 `YOUR_...` 자리를 실제 값으로 교체합니다.

   ```js
   const firebaseConfig = {
     apiKey: "AIza...",
     authDomain: "xxx.firebaseapp.com",
     projectId: "xxx",
     storageBucket: "xxx.appspot.com",
     messagingSenderId: "1234567890",
     appId: "1:1234567890:web:abcdef"
   };
   ```

6. **Firestore 보안 규칙** 배포:
   - Firebase 콘솔 > Firestore Database > **규칙** 탭에 이 저장소의 `firestore.rules` 내용을 붙여넣고 게시.
   - 또는 CLI 로 `firebase deploy --only firestore:rules` 실행.

---

## 2. Firebase Authentication 관리자 계정 설정

관리자 로그인은 **Firebase Authentication (이메일/비밀번호)** 로 동작합니다.

1. Firebase 콘솔 > **Build > Authentication** > **시작하기**.
2. **Sign-in method** 탭 → **이메일/비밀번호** 제공업체 클릭 → **사용 설정** ON → 저장.
3. **Users** 탭 → **사용자 추가** 버튼 클릭 → 관리자 이메일/비밀번호 입력 → 추가.
   - 예: `admin@hanwha-academy.local` / 강력한 비밀번호
   - 필요 시 여러 관리자를 모두 등록 가능.
4. 이후 `admin-login.html` 에서 해당 이메일/비밀번호로 로그인하면 대시보드에 진입합니다.

> 비밀번호를 잃어버렸다면 Firebase 콘솔 Users 탭에서 재설정하거나 계정을 새로 만드세요.
> 관리자 계정은 Firestore 읽기 권한을 갖게 되므로(규칙 참조) 외부에 공유하지 마세요.

---

## 3. 반 목록 변경

반 이름을 수정하려면 다음 세 곳을 함께 업데이트해야 합니다.

| 파일 | 상수 | 설명 |
|---|---|---|
| `js/attend.js` | `CLASS_OPTIONS` | 교육생 페이지 드롭다운 |
| `js/admin-qr.js` | `QR_CLASS_OPTIONS` | QR 생성 시 사용 (label / value 쌍) |
| `js/admin-list.js` | `LIST_CLASS_OPTIONS` | 관리자 조회 필터 |
| `firestore.rules` | `class in ['A반','B반','C반']` | 서버 측 검증 |

> TODO: 반 목록을 한 곳에서 관리하도록 별도의 `js/classes-config.js` 로 분리하는 것을 향후 개선 과제로 남겨둠.

---

## 4. 로컬 실행

빌드 도구가 필요 없습니다. 아무 정적 서버로나 열면 됩니다.

**옵션 A — VS Code Live Server 확장:**
`attend.html` 우클릭 → *Open with Live Server*.

**옵션 B — Python 내장 서버:**
```powershell
cd hanwha-academy-attendance
python -m http.server 5500
```
브라우저에서 http://localhost:5500/attend.html 접속.

**옵션 C — Node 서버:**
```powershell
npx serve hanwha-academy-attendance
```

> `file://` 로 직접 열면 Firebase 요청이 CORS/쿠키 이슈로 실패할 수 있으니 항상 로컬 서버를 사용하세요.

---

## 5. 배포

### Firebase Hosting (권장)

1. Firebase CLI 설치: `npm install -g firebase-tools`
2. 로그인: `firebase login`
3. 프로젝트 폴더에서 초기화:
   ```powershell
   cd hanwha-academy-attendance
   firebase init hosting
   ```
   - **Public directory** 는 `.` (현재 폴더) 로 지정
   - **Single-page app?** → `No`
   - **Set up automatic builds?** → `No`
4. 배포:
   ```powershell
   firebase deploy --only hosting
   ```
5. 콘솔에 표시되는 URL 로 접속.

### GitHub Pages

1. 저장소를 GitHub 에 push.
2. Repo → **Settings > Pages** → Source: `main` 브랜치의 `/hanwha-academy-attendance` 폴더 선택.
3. 안내되는 URL 로 접속.

> 모든 경로가 상대경로(`./attend.html`, `./js/...`)로 작성되어 있어 서브 경로 배포도 그대로 동작합니다.

---

## 6. 사용 흐름

1. 관리자가 `admin-login.html` 접속 → 비밀번호 입력.
2. **QR 생성** 탭에서 반/날짜 선택 → QR 생성 → 강의실 화면에 표시 또는 이미지 다운로드.
3. 교육생이 스마트폰으로 QR 스캔 → `attend.html?class=A&date=2026-08-31` 접속.
4. 이름 입력 후 **출석하기** → Firestore `attendances` 컬렉션에 저장.
5. 관리자가 **출석 현황** 탭에서 날짜/반으로 조회 → 표 확인 → 필요 시 엑셀 다운로드.

---

## 7. 데이터 스키마

Firestore `attendances/{autoId}`:

| 필드 | 타입 | 예시 |
|---|---|---|
| `name` | string | `"홍길동"` |
| `class` | string | `"A반"` |
| `date` | string (`YYYY-MM-DD`) | `"2026-08-31"` |
| `submittedAt` | Timestamp (server) | serverTimestamp |

---

## 8. 알려진 제한 사항 / TODO

- ✅ 관리자 인증: Firebase Authentication (이메일/비밀번호) 적용 완료.
- ✅ Firestore `read` 규칙: `request.auth != null` 으로 제한 완료 (로그인한 관리자만 조회).
- 동일 사용자가 다른 브라우저에서 반복 제출하는 것은 막지 않음 (localStorage 는 UX 목적).
- 반 목록 변경 시 여러 파일을 동시에 수정해야 함 (config 통합 개선 여지).
