# 🟣 JARVIS Purple

개인 생산성 PWA — 할일 · 가계부 · 일기 · 생필품 트래커

## 탭 구성
| 탭 | 기능 |
|---|---|
| ✅ 할일 | 루틴 / 회사업무 / 일상 / 위시리스트 |
| 💰 가계부 | 기록 / 통계 / AI 분석 |
| 📓 일기 | PIN 잠금 / 감정 / 폴라로이드 사진 |
| 🔄 주기 | 생필품 구매 주기 트래커 |
| ⚙️ 설정 | 카테고리·태그 관리 |

## 로컬 실행

```bash
npm install
npm start
```

## GitHub + Netlify 배포

1. GitHub에 repository 생성 후 push
```bash
git init
git add .
git commit -m "init"
git remote add origin https://github.com/YOUR_USERNAME/jarvis-purple.git
git push -u origin main
```

2. [Netlify](https://netlify.com) → "New site from Git" → GitHub repo 선택
3. Build command: `npm run build`, Publish directory: `build`
4. Deploy 완료 후 Android Chrome에서 URL 열기 → "홈 화면에 추가"

## 데이터 저장
- localStorage 기반 (기기 로컬)
- 탭별 독립 키 사용
- 앱 삭제/캐시 초기화 시 데이터 소실 주의

## PWA 설치 (Android)
1. Chrome에서 Netlify URL 접속
2. 주소창 우측 메뉴 → "앱 설치" or "홈 화면에 추가"
3. 이후 홈 화면에서 앱처럼 실행 가능
