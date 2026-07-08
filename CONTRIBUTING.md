# 협업 가이드 (CONTRIBUTING)

3명이 게임을 하나씩 맡아 **동시에, 충돌 없이** 작업하기 위한 규칙입니다.

## 1. 역할 분담과 "내 영역"

| 담당 게임 | 작업 폴더 (이 안에서만 수정) |
| --- | --- |
| 2048 | `src/games/game2048/` |
| 사과게임 | `src/games/appleGame/` |
| 테트리스 | `src/games/tetris/` |

원칙은 하나입니다 — **자기 게임 폴더 밖은 웬만하면 건드리지 않기.**
로비, 라우팅, 공통 레이아웃, 점수 저장 방식은 이미 구성되어 있어서
게임 로직만 채우면 전체 사이트에 자동으로 연결됩니다.

공통 파일(`src/gameRegistry.ts`, `src/components/*`, `src/types/game.ts`)을
꼭 고쳐야 한다면, 먼저 다른 팀원에게 알리고 별도 PR로 분리해서 올려주세요.
공통 파일 변경이 섞이면 충돌(merge conflict)이 나기 쉽습니다.

## 2. 브랜치 전략

`main`은 항상 빌드가 되는 상태로 유지합니다. 각자 아래처럼 브랜치를 파서
작업하세요.

```bash
git checkout -b game/2048        # 2048 담당
git checkout -b game/apple-game  # 사과게임 담당
git checkout -b game/tetris      # 테트리스 담당
```

작업이 끝나면 `main`으로 Pull Request를 올리고, 최소 1명의 리뷰를 받은 뒤
머지합니다. 작업 폴더가 서로 겹치지 않기 때문에 세 브랜치가 동시에 열려
있어도 충돌이 거의 발생하지 않습니다.

## 3. 게임 모듈 계약 (`GameModule`)

모든 게임은 `src/types/game.ts`에 정의된 아래 형태를 따릅니다.

```ts
interface GameModule {
  id: string;              // URL 경로 & 식별자 (예: "2048")
  title: string;            // 로비에 보이는 이름
  description: string;       // 카드 한 줄 설명
  icon: string;               // 이모지 아이콘
  accentVar: `--accent-${string}`; // 카트리지 색 (tokens.css 참고)
  Component: ComponentType;    // 실제 게임 화면
  inProgress?: boolean;         // 구현 중이면 true (완료 후 지우기)
}
```

각 게임 폴더의 `index.ts`가 이 형태의 객체를 export하고,
`src/gameRegistry.ts`가 그걸 모아서 로비/라우팅에 뿌려줍니다. 즉 새 게임을
추가하거나 완성 상태로 바꿀 때 건드리는 공통 파일은 **딱 한 줄**입니다.

```ts
// src/gameRegistry.ts
export const games: GameModule[] = [game2048, appleGame, tetris];
//                                                              ^ 여기에 내 게임 추가
```

## 4. 공용으로 이미 준비된 것들 (다시 만들지 마세요)

- **`GameShell`** (`src/components/GameShell.tsx`) — 헤더, 점수/최고점수
  표시, 로비로 돌아가기 버튼을 담당. 게임 보드만 `children`으로 넣으면 됨.
- **`useHighScore(gameId)`** (`src/hooks/useHighScore.ts`) — localStorage에
  최고 점수를 저장/조회. `submitScore(score)`를 부르면 기존 기록보다 높을
  때만 자동 갱신됩니다.
- **디자인 토큰** (`src/styles/tokens.css`) — 색상, 폰트, 여백 단위가
  CSS 변수로 정의되어 있습니다. 게임별 포인트 컬러는
  `--accent-2048` / `--accent-apple` / `--accent-tetris`.

## 5. 코드 스타일

- TypeScript strict 모드 사용 중 (임의로 `any`, `// @ts-ignore` 지양)
- 커밋 전 아래 두 가지는 꼭 통과시켜 주세요.

```bash
npm run build   # 타입 에러 + 빌드 에러 체크
npm run lint     # oxlint
```

- CSS는 게임 폴더 안의 전용 `.css` 파일에 작성 (다른 게임의 클래스명과
  겹치지 않도록 게임 이름을 접두사로 사용 — 예: `.tetris-board`)

## 6. PR 체크리스트

PR을 올리기 전에 확인하세요 (`.github/PULL_REQUEST_TEMPLATE.md`에도 동일한
목록이 있습니다):

- [ ] `npm run build`, `npm run lint` 통과
- [ ] 내 게임 폴더 밖의 파일은 `gameRegistry.ts` 등록 한 줄 외에 건드리지 않음
- [ ] 구현이 끝났다면 `index.ts`의 `inProgress: true` 제거
- [ ] 키보드/마우스 조작이 실제로 동작하는지 `npm run dev`로 직접 확인
