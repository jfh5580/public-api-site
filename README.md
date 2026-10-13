# 보험사 공시 조회 · 목록 브리핑 (개인 학습용)

회사·기간을 고르면 Open DART 최신 공시 3건과 원문 링크를 보여 주고, 목록(제목·접수일)만 근거로 Gemini 3줄 브리핑을 만든다.
기준 문서: `../공시조회_PRD.md`. DB·로그인·공시 본문 요약 없음.

## 준비
1. Node.js 18.18 이상 설치 (이 PC에서는 `node`가 확인되지 않았다).
2. `npm install`
3. `.env.local`에 직접 입력 (값은 대화·공유·커밋 금지)
   - `DART_API_KEY` — Open DART 인증키
   - `GEMINI_API_KEY` — Google AI Studio 키
   - `GEMINI_MODEL` — 본인 프로젝트에서 무료로 쓸 수 있는 모델명. 비어 있으면 브리핑은 오류로 안내하며 다른 모델로 대체하지 않는다.

## 실행
```
npm run dev        # http://localhost:3000
npm run typecheck
npm run build
```
- `GET /api/env-check` — 환경변수 설정 여부(true/false)만 반환.
- `GET /api/disclosures?company=현대해상&months=1`
- `POST /api/briefing` — `{company, months, items[≤3]}`

## 배포 (Vercel, 직접 요청할 때만)
Vercel 프로젝트 Settings → Environment Variables에 위 3개를 서버용으로 등록한다. `NEXT_PUBLIC_` 접두사 금지.
`.env.local`·`.vercel`·`node_modules`는 공유·ZIP·배포에서 제외하고 빈 `.env.example`만 전달한다.

## 확인 필요
- 회사별 DART 정식 법인명(`lib/dart.ts`의 `DART_CORP_NAME`)은 고유번호 ZIP과 대조 전. 불일치하면 추측하지 않고 오류가 난다.
- DART status 코드 의미(010·011·012·020·100), Gemini 헤더·스키마 옵션명은 공식 문서와 대조.
- 화면의 제목·접수일·링크는 실제 DART와 사람이 대조 후 `../웹서비스_검수.md`에 기록.
