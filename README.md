# 미니게임 아케이드 🕹️

**2048 · 사과게임 · 테트리스**를 한 플랫폼에 모은 미니게임 종합 사이트.
3명이 게임 하나씩 맡아서 동시에 작업할 수 있도록 구조를 잡아둔 저장소입니다.

## 기술 스택

- React 19 + TypeScript
- Vite (빌드/개발 서버)
- React Router (라우팅)
- 순수 CSS (CSS 변수 기반 디자인 토큰, 별도 UI 라이브러리 없음)
- localStorage (게임별 최고 점수 저장)

## 빠른 시작

```bash
npm install
npm run dev       # http://localhost:5173
```

```bash
npm run build      # 프로덕션 빌드 (타입 체크 포함)
npm run preview    # 빌드 결과 미리보기
npm run lint        # oxlint 검사
npm test              # vitest 유닛 테스트
```

## 도미노 온라인 멀티플레이 설정 (Firebase)

도미노의 온라인 멀티플레이/랭킹 기능은 Firebase Realtime Database를 사용합니다.
로컬에서 이 기능을 켜려면:

1. [Firebase 콘솔](https://console.firebase.google.com)에서 새 프로젝트를 만듭니다(무료 Spark 플랜).
2. Authentication → Sign-in method에서 "익명" 로그인을 활성화합니다.
3. Realtime Database를 생성합니다(테스트 모드로 만든 뒤, 이 레포 루트의
   `database.rules.json` 내용을 Rules 탭에 붙여넣고 게시하세요).
4. 프로젝트 설정 → 일반에서 웹 앱을 추가하고 발급받은 설정값을 복사합니다.
5. `.env.example`을 `.env`로 복사하고 값을 채웁니다.
6. `npm run dev`로 실행하면 온라인 멀티플레이/랭킹이 동작합니다.

**주의**: `database.rules.json`은 실제 Firebase 프로젝트 없이 설계된 규칙입니다.
게시 후 Firebase 콘솔의 Rules 시뮬레이터로 아래를 직접 검증해보세요.

- 호스트가 대기 중(아직 `public`이 생기기 전)에만 다른 사람의 손패 경로에 쓸 수
  있는지, 게임 시작 후에는 호스트도 못 쓰는지
- 자기 턴이 아닌 사람이 공개 상태(`public`)를 못 쓰는지
- 각자 자기 손패(`hands/{uid}`)만 읽을 수 있고 남의 손패는 못 읽는지

## 폴더 구조

```
src/
  types/game.ts        # 모든 게임이 따르는 공통 인터페이스 (GameModule)
  gameRegistry.ts       # 게임 등록 목록 - 새 게임 추가 시 여기 한 줄만 수정
  hooks/useHighScore.ts # 공용 최고점수 저장 훅
  components/
    GameShell.tsx        # 게임 화면 공통 레이아웃 (헤더/점수판/뒤로가기)
    GameCard.tsx          # 로비에 표시되는 게임 카드
  pages/
    Lobby.tsx              # 첫 화면 (게임 선택)
  games/
    game2048/              # 2048 담당자 작업 공간
    appleGame/              # 사과게임 담당자 작업 공간
    tetris/                  # 테트리스 담당자 작업 공간
```

## 3인 공동 작업 방식

이 저장소는 "**각자 자기 게임 폴더 안에서만 작업**"하는 것을 전제로
구조를 잡았습니다. 자세한 협업 규칙은 [CONTRIBUTING.md](./CONTRIBUTING.md)를,
각 게임의 구현 과제는 해당 폴더의 `README.md`를 확인하세요.

- 2048 담당 → `src/games/game2048/README.md`
- 사과게임 담당 → `src/games/appleGame/README.md`
- 테트리스 담당 → `src/games/tetris/README.md`

## 게임 화면 살펴보기 (라우팅)

| 경로 | 화면 |
| --- | --- |
| `/` | 로비 (게임 선택) |
| `/2048` | 2048 |
| `/apple-game` | 사과게임 |
| `/tetris` | 테트리스 |

새 게임을 추가해도 `src/gameRegistry.ts`에 등록만 하면 위 표처럼 경로와
로비 카드가 자동으로 생깁니다.
