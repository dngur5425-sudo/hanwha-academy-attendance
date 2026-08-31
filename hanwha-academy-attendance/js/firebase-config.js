// 이 파일은 실제 배포 전 Firebase 콘솔에서 발급받은 값으로 교체할 것
// Firebase 콘솔 > 프로젝트 설정 > 일반 > 내 앱 (웹) 에서 config 객체를 확인할 수 있습니다.
//
// 주의: 이 파일에 실제 API 키를 넣고 GitHub에 push하기 전에
//       .gitignore 처리 여부를 반드시 결정하세요.
//       (Firebase 웹 apiKey는 공개되어도 안전하지만, 프로젝트 정책상 숨기고 싶다면 .gitignore에 추가.)

// compat 버전을 사용하여 <script src="https://www.gstatic.com/firebasejs/..."> 로딩 후 window.firebase 로 접근.
// (빌드 도구 없이 순수 HTML/JS 로 동작시키기 위함)

// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyCEzRHxY2AAJ9uZ7Dgvn8q8EhTkwd4qzX4",
  authDomain: "attendance-a9654.firebaseapp.com",
  projectId: "attendance-a9654",
  storageBucket: "attendance-a9654.firebasestorage.app",
  messagingSenderId: "832527525954",
  appId: "1:832527525954:web:0874c37ea40c248e11e5db",
  measurementId: "G-KQE0EG6M98"
};

// Firebase 앱 초기화 (이미 초기화되어 있으면 재사용)
if (!window.firebase) {
  console.error("[firebase-config] firebase SDK가 로드되지 않았습니다. HTML에서 firebase-app-compat.js / firebase-firestore-compat.js 를 먼저 include 하세요.");
} else if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

// 다른 스크립트에서 window.db 로 Firestore 인스턴스에 접근
window.db = window.firebase ? firebase.firestore() : null;
