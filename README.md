# 📚 Folio

논문 라이브러리 + 노션 스타일 노트 + Claude. 

## 파일 구성
```
index.html      앱 화면
style.css       디자인
app.js          기능 전체 (라이브러리, 블록 에디터, PDF, Claude 패널, 동기화)
api/ai.js       Claude API 중계 (API 키는 서버에만 보관)
api/sync.js     기기 간 동기화 (종단간 암호화, Vercel Blob)
sw.js           서비스워커 (오프라인 실행)
manifest.json   홈 화면 설치 정보
vercel.json     함수 설정 (긴 답변용 시간 제한 300초)
```

## 배포 (Grove와 같은 방식)
1. GitHub에 새 저장소 `folio`를 만들고 이 폴더 내용을 올리기
2. Vercel → Add New → Project → `folio` 저장소 Import → Deploy
3. **Storage → Blob** 연결 (Grove에서 쓰던 Blob 스토어를 그대로 연결해도 됨 — 데이터는 `folio/` 폴더로 분리돼요)
4. **Settings → Environment Variables**
   - `ANTHROPIC_API_KEY` = console.anthropic.com 에서 만든 API 키
   - `FOLIO_ACCESS_CODE` = 아무 비밀 문구 (다른 사람이 내 크레딧을 못 쓰게 막는 용도)
5. Redeploy → 앱에서 Settings → Access code 입력

## Claude 비용
Claude API는 claude.ai 구독과 **별개로 사용량만큼 결제**돼요 (console.anthropic.com에서 크레딧 충전).
- 논문 1편(약 15~25k 토큰)을 Sonnet으로 요약 ≈ 약 100원 안팎 ($2 입력 / $10 출력 per 1M 토큰 기준)
- 같은 논문에 이어서 질문하면 논문 본문이 캐시돼서 더 저렴해요
- 제목·저자 자동 채우기는 가장 싼 Haiku로 처리

## 수정 후 업데이트할 때
`sw.js` 맨 위 `VERSION` 값을 바꿔야 설치된 앱이 새 버전을 받아요.
