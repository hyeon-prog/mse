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

## 도미노 온라인 멀티플레이 (설정 필요 없음)

도미노의 온라인 멀티플레이는 **PeerJS(WebRTC P2P)** 기반이라 별도 백엔드나
계정 설정이 전혀 필요 없습니다. 연결 중개만 PeerJS 공용 무료 서버를 쓰고,
게임 데이터는 브라우저끼리 직접 주고받습니다.

- 방장이 "방 만들기" → 방 코드/링크 생성 → 친구가 링크로 접속하면 합류(최대 4명)
- **방장 브라우저가 딜러 역할**(단일 진실 공급원): 착수 검증/뽑기/패스/점수 계산을
  전부 방장 쪽에서 처리하고, 각 참가자에게는 자기 손패와 공개 정보만 보냅니다
  (다른 사람 손패·보유고 내용은 개수만 공개).
- 참가자가 새로고침하면 같은 방 코드로 재접속 시 자기 자리로 복귀합니다.
- **한계**: 방장이 창을 닫으면 방이 사라집니다. 서버가 없는 P2P 구조라
  전 세계 공용 순위표는 불가능하며, "전적 보기"는 이 기기에 저장된 온라인
  매치 기록을 보여줍니다.

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
