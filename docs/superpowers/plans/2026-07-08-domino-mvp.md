# 도미노 MVP(1:1 vs AI) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `mini-game-platform`에 4번째 게임으로 표준 블록 도미노(더블식스, 28피스)의 **1:1(나 vs AI 1명) 로컬 플레이 MVP**를 추가하고, `npm run dev`로 실제 플레이가 가능하게 만든다.

**Architecture:** 게임 규칙은 `src/games/domino/engine/`에 프레임워크 독립적인 순수 함수로 구현하고(덱/보드/매치 오케스트레이션/AI), `Domino.tsx`는 이 순수 함수들을 호출하는 얇은 React 상태 계층(`useState` + `useEffect`)으로만 작성한다. `GameShell`/`useHighScore`를 재사용하고, 공통 파일은 `gameRegistry.ts` 한 줄과 `tokens.css`에 색상 변수 추가만 한다.

**Tech Stack:** React 19 + TypeScript(strict) + Vite, react-router-dom. 신규: `vitest`(순수 로직 유닛 테스트용, 이 저장소에 테스트 러너가 없어서 새로 추가).

**범위(스코프):** 이번 계획은 설계 문서(`docs/superpowers/specs/2026-07-08-domino-game-design.md`)의 전체 기능 중 **싱글플레이 1:1(나 vs AI 1명)만** 다룬다. 2~4인 좌석 선택, 온라인 멀티플레이(Firebase)는 이 계획의 범위 밖이며 이후 별도 계획으로 진행한다. `index.ts`의 `inProgress`는 이 계획 완료 후에도 `true`로 유지한다(멀티플레이까지 끝나야 완성으로 간주).

## Global Constraints

- 이 개발 환경에는 64비트 Node가 PATH에 없다(32비트 Node만 발견됨: `C:\Program Files (x86)\HncTools\McpServers\Node`). 모든 `npm`/`npx` 명령 전에 PowerShell에서 다음을 실행해야 한다:
  ```powershell
  $env:PATH = "C:\Program Files (x86)\HncTools\McpServers\Node;" + $env:PATH
  ```
- 이 32비트 Node에서는 `npm run build`(vite/rolldown 번들링)가 네이티브 바인딩 부재로 실패한다. 대신 `npx tsc -b`(타입 체크)와 `npx oxlint`(린트)는 정상 동작하므로, 각 태스크의 검증은 이 두 명령 + `npx vitest run` + `npm run dev` 수동 플레이로 한다. 최종 `npm run build` 확인은 사용자의 64비트 Node 환경에서 별도로 받는다.
- TypeScript는 strict 모드이며 `verbatimModuleSyntax: true`이므로, 타입만 가져올 때는 반드시 `import type { ... }`를 쓴다(값과 타입을 섞어 가져올 때는 `import { type X, y }` 형태).
- 공통 파일 변경은 `src/gameRegistry.ts`(한 줄 추가)와 `src/styles/tokens.css`(변수 추가, 기존 줄 수정 금지) 두 곳으로 제한한다. `src/App.tsx`, `src/components/GameShell.tsx`, `src/hooks/useHighScore.ts`, 다른 게임 폴더(`game2048`, `appleGame`, `tetris`)는 수정하지 않는다.
- 도미노 규칙(이번 MVP 확정 사항):
  - 인원수와 무관하게 각자 **무조건 7피스**를 받는다. 1:1이므로 14장 분배, 14장 보유고.
  - 낼 수 없으면 보유고에서 한 장씩 뽑아 **낼 수 있게 되거나 보유고가 빌 때까지 반복**한다.
  - 라운드 승자는 **나머지 전원의 남은 핀 합**을 점수로 획득한다.
  - 매치 종료 방식은 시작 화면에서 선택: **단판**(1라운드로 종료) 또는 **목표점수**(기본 100점, 조정 가능— 도달자가 나올 때까지 라운드 반복, 직전 라운드 승자가 다음 라운드를 시작).
  - 블록(양쪽 다 못 내고 보유고도 빔) 시 핀 합이 더 낮은 사람이 승리, 동점이면 **라운드 시작자가 아닌 사람**이 승리(1:1이므로 곧 상대방).

---

## File Structure

```
src/games/domino/
  index.ts                 # GameModule export (id: "domino")
  Domino.tsx                # 메인 컴포넌트: 상태 관리 + 렌더링
  Domino.css
  DominoMenu.tsx              # 시작화면 (단판/목표점수 선택, 이집트 톤)
  DominoMenu.css
  DominoTile.tsx               # 타일 렌더 컴포넌트 (pip 표시)
  engine/
    types.ts                    # Tile, BoardState, MatchState 등 타입
    deck.ts                       # createDeck, shuffle, HAND_SIZE
    board.ts                       # getValidMoves, canPlay, applyMove, pipSum, createEmptyBoard
    match.ts                        # createMatch, resolveDrawPhase, playMove, passTurn, startNextRound
    ai.ts                             # chooseAiMove
  engine/deck.test.ts
  engine/board.test.ts
  engine/match.test.ts
  engine/ai.test.ts

수정:
  src/gameRegistry.ts        # domino import + 배열에 추가
  src/styles/tokens.css       # --accent-domino, --accent-domino-dim 추가
  package.json                  # vitest devDependency + "test" script
  vite.config.ts                  # vitest/config로 전환 + test 필드 추가
```

---

### Task 1: 테스트 러너(vitest) 추가

**Files:**
- Modify: `package.json`
- Modify: `vite.config.ts`

**Interfaces:**
- Produces: `npx vitest run` 명령으로 이후 태스크의 `*.test.ts` 파일들을 실행할 수 있는 환경.

- [ ] **Step 1: vitest 설치**

Run:
```powershell
$env:PATH = "C:\Program Files (x86)\HncTools\McpServers\Node;" + $env:PATH
npm install -D vitest
```
Expected: `package.json`의 `devDependencies`에 `vitest`가 추가되고 설치가 성공한다(exit code 0).

- [ ] **Step 2: `package.json`에 `test` 스크립트 추가**

`package.json`의 `scripts`를 아래처럼 수정한다(기존 `dev`/`build`/`lint`/`preview`는 유지하고 `test`만 추가):

```json
{
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "lint": "oxlint",
    "preview": "vite preview",
    "test": "vitest run"
  }
}
```

- [ ] **Step 3: `vite.config.ts`를 `vitest/config` 기반으로 전환**

`vite.config.ts` 전체를 아래 내용으로 교체한다:

```ts
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  test: {
    environment: "node",
  },
});
```

- [ ] **Step 4: 동작 확인**

Run:
```powershell
$env:PATH = "C:\Program Files (x86)\HncTools\McpServers\Node;" + $env:PATH
npx vitest run
```
Expected: 아직 테스트 파일이 없으므로 `No test files found` 메시지와 함께 종료(에러 없이). vitest 자체는 정상 실행됨을 확인.

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json vite.config.ts
git commit -m "chore: add vitest test runner"
```

---

### Task 2: 엔진 타입 & 덱 유틸리티

**Files:**
- Create: `src/games/domino/engine/types.ts`
- Create: `src/games/domino/engine/deck.ts`
- Test: `src/games/domino/engine/deck.test.ts`

**Interfaces:**
- Produces:
  - `types.ts`: `Tile { a: number; b: number }`, `PlacedTile { tile: Tile; flipped: boolean }`, `BoardEnd = "left" | "right"`, `BoardState { chain: PlacedTile[]; leftEnd: number | null; rightEnd: number | null }`, `Move { tile: Tile; end: BoardEnd }`, `PlayerId = "human" | "ai"`, `MatchMode = "single-round" | "target-score"`, `RoundResult { winnerId: PlayerId; reason: "emptied-hand" | "blocked"; pointsAwarded: number }`, `MatchState { mode; targetScore; hands: Record<PlayerId, Tile[]>; scores: Record<PlayerId, number>; board: BoardState; boneyard: Tile[]; currentTurn: PlayerId; roundStarter: PlayerId; status: "playing" | "round-over" | "match-over"; lastRoundResult: RoundResult | null; matchWinnerId: PlayerId | null }`
  - `deck.ts`: `HAND_SIZE = 7`, `createDeck(): Tile[]`, `shuffle<T>(items: T[]): T[]`

- [ ] **Step 1: 타입 정의 작성**

`src/games/domino/engine/types.ts`:

```ts
export interface Tile {
  a: number;
  b: number;
}

export interface PlacedTile {
  tile: Tile;
  /** true면 체인에 이어질 때 손패 표시 순서(a,b)가 뒤집혀서(b,a) 그려진다 */
  flipped: boolean;
}

export type BoardEnd = "left" | "right";

export interface BoardState {
  chain: PlacedTile[];
  leftEnd: number | null;
  rightEnd: number | null;
}

export interface Move {
  tile: Tile;
  end: BoardEnd;
}

export type PlayerId = "human" | "ai";

export type MatchMode = "single-round" | "target-score";

export interface RoundResult {
  winnerId: PlayerId;
  reason: "emptied-hand" | "blocked";
  pointsAwarded: number;
}

export interface MatchState {
  mode: MatchMode;
  targetScore: number;
  hands: Record<PlayerId, Tile[]>;
  scores: Record<PlayerId, number>;
  board: BoardState;
  boneyard: Tile[];
  currentTurn: PlayerId;
  roundStarter: PlayerId;
  status: "playing" | "round-over" | "match-over";
  lastRoundResult: RoundResult | null;
  matchWinnerId: PlayerId | null;
}
```

- [ ] **Step 2: 실패하는 테스트 작성**

`src/games/domino/engine/deck.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { createDeck, shuffle, HAND_SIZE } from "./deck";

describe("createDeck", () => {
  it("28개의 서로 다른 타일을 생성한다", () => {
    const deck = createDeck();
    expect(deck).toHaveLength(28);
    const keys = new Set(deck.map((t) => `${t.a}-${t.b}`));
    expect(keys.size).toBe(28);
  });

  it("0-0부터 6-6까지 모든 조합을 포함한다", () => {
    const deck = createDeck();
    for (let a = 0; a <= 6; a++) {
      for (let b = a; b <= 6; b++) {
        expect(deck.some((t) => t.a === a && t.b === b)).toBe(true);
      }
    }
  });
});

describe("shuffle", () => {
  it("길이와 구성 요소는 그대로 유지한 채 배열을 반환한다", () => {
    const deck = createDeck();
    const shuffled = shuffle(deck);
    expect(shuffled).toHaveLength(deck.length);
    const sortKey = (t: { a: number; b: number }) => `${t.a}-${t.b}`;
    expect([...shuffled].sort((x, y) => (sortKey(x) > sortKey(y) ? 1 : -1))).toEqual(
      [...deck].sort((x, y) => (sortKey(x) > sortKey(y) ? 1 : -1))
    );
  });

  it("원본 배열을 변경하지 않는다", () => {
    const deck = createDeck();
    const original = [...deck];
    shuffle(deck);
    expect(deck).toEqual(original);
  });
});

describe("HAND_SIZE", () => {
  it("7이다", () => {
    expect(HAND_SIZE).toBe(7);
  });
});
```

- [ ] **Step 3: 테스트 실행해서 실패 확인**

Run: `npx vitest run src/games/domino/engine/deck.test.ts`
Expected: FAIL — `Cannot find module './deck'` (아직 `deck.ts`가 없음)

- [ ] **Step 4: `deck.ts` 구현**

`src/games/domino/engine/deck.ts`:

```ts
import type { Tile } from "./types";

export const HAND_SIZE = 7;

export function createDeck(): Tile[] {
  const deck: Tile[] = [];
  for (let a = 0; a <= 6; a++) {
    for (let b = a; b <= 6; b++) {
      deck.push({ a, b });
    }
  }
  return deck;
}

export function shuffle<T>(items: T[]): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}
```

- [ ] **Step 5: 테스트 통과 확인**

Run: `npx vitest run src/games/domino/engine/deck.test.ts`
Expected: PASS (5개 테스트 모두 통과)

- [ ] **Step 6: Commit**

```bash
git add src/games/domino/engine/types.ts src/games/domino/engine/deck.ts src/games/domino/engine/deck.test.ts
git commit -m "feat(domino): add tile types and deck utilities"
```

---

### Task 3: 보드/타일 매칭 로직

**Files:**
- Create: `src/games/domino/engine/board.ts`
- Test: `src/games/domino/engine/board.test.ts`

**Interfaces:**
- Consumes: `Tile`, `Move`, `BoardState`, `BoardEnd`, `PlacedTile` from `./types` (Task 2)
- Produces: `createEmptyBoard(): BoardState`, `getValidMoves(hand: Tile[], board: BoardState): Move[]`, `canPlay(hand: Tile[], board: BoardState): boolean`, `applyMove(board: BoardState, move: Move): BoardState`, `pipSum(hand: Tile[]): number`

- [ ] **Step 1: 실패하는 테스트 작성**

`src/games/domino/engine/board.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { applyMove, canPlay, createEmptyBoard, getValidMoves, pipSum } from "./board";

describe("createEmptyBoard", () => {
  it("빈 체인과 null 끝값을 가진다", () => {
    expect(createEmptyBoard()).toEqual({ chain: [], leftEnd: null, rightEnd: null });
  });
});

describe("getValidMoves", () => {
  it("빈 보드에서는 손패의 모든 타일이 유효하다", () => {
    const hand = [{ a: 1, b: 2 }, { a: 3, b: 4 }];
    const moves = getValidMoves(hand, createEmptyBoard());
    expect(moves).toEqual([
      { tile: { a: 1, b: 2 }, end: "right" },
      { tile: { a: 3, b: 4 }, end: "right" },
    ]);
  });

  it("양쪽 끝에 맞는 타일은 두 개의 수로 계산된다", () => {
    const board = { chain: [{ tile: { a: 3, b: 3 }, flipped: false }], leftEnd: 3, rightEnd: 3 };
    const moves = getValidMoves([{ a: 3, b: 5 }], board);
    expect(moves).toEqual([
      { tile: { a: 3, b: 5 }, end: "left" },
      { tile: { a: 3, b: 5 }, end: "right" },
    ]);
  });

  it("어느 끝과도 맞지 않으면 빈 배열을 반환한다", () => {
    const board = { chain: [{ tile: { a: 1, b: 2 }, flipped: false }], leftEnd: 1, rightEnd: 2 };
    expect(getValidMoves([{ a: 5, b: 6 }], board)).toEqual([]);
  });
});

describe("canPlay", () => {
  it("유효한 수가 있으면 true를 반환한다", () => {
    const board = { chain: [{ tile: { a: 1, b: 2 }, flipped: false }], leftEnd: 1, rightEnd: 2 };
    expect(canPlay([{ a: 2, b: 6 }], board)).toBe(true);
  });

  it("유효한 수가 없으면 false를 반환한다", () => {
    const board = { chain: [{ tile: { a: 1, b: 2 }, flipped: false }], leftEnd: 1, rightEnd: 2 };
    expect(canPlay([{ a: 5, b: 6 }], board)).toBe(false);
  });
});

describe("applyMove", () => {
  it("빈 보드에 첫 타일을 놓으면 양 끝이 타일 값으로 설정된다", () => {
    const result = applyMove(createEmptyBoard(), { tile: { a: 2, b: 5 }, end: "right" });
    expect(result).toEqual({ chain: [{ tile: { a: 2, b: 5 }, flipped: false }], leftEnd: 2, rightEnd: 5 });
  });

  it("오른쪽 끝에 이어 붙이면 새 끝값이 갱신된다", () => {
    const board = { chain: [{ tile: { a: 2, b: 5 }, flipped: false }], leftEnd: 2, rightEnd: 5 };
    const result = applyMove(board, { tile: { a: 5, b: 6 }, end: "right" });
    expect(result.rightEnd).toBe(6);
    expect(result.leftEnd).toBe(2);
    expect(result.chain).toHaveLength(2);
    expect(result.chain[1]).toEqual({ tile: { a: 5, b: 6 }, flipped: false });
  });

  it("왼쪽 끝에 이어 붙이면 새 끝값이 갱신된다", () => {
    const board = { chain: [{ tile: { a: 2, b: 5 }, flipped: false }], leftEnd: 2, rightEnd: 5 };
    const result = applyMove(board, { tile: { a: 1, b: 2 }, end: "left" });
    expect(result.leftEnd).toBe(1);
    expect(result.chain[0]).toEqual({ tile: { a: 1, b: 2 }, flipped: false });
  });

  it("매칭 핀이 타일의 첫 번째 값이면 뒤집혀 표시된다", () => {
    const board = { chain: [{ tile: { a: 2, b: 5 }, flipped: false }], leftEnd: 2, rightEnd: 5 };
    const result = applyMove(board, { tile: { a: 2, b: 1 }, end: "left" });
    expect(result.leftEnd).toBe(1);
    expect(result.chain[0]).toEqual({ tile: { a: 2, b: 1 }, flipped: true });
  });
});

describe("pipSum", () => {
  it("손패 핀 합을 계산한다", () => {
    expect(pipSum([{ a: 1, b: 2 }, { a: 3, b: 3 }])).toBe(9);
  });

  it("빈 손패는 0을 반환한다", () => {
    expect(pipSum([])).toBe(0);
  });
});
```

- [ ] **Step 2: 테스트 실행해서 실패 확인**

Run: `npx vitest run src/games/domino/engine/board.test.ts`
Expected: FAIL — `Cannot find module './board'`

- [ ] **Step 3: `board.ts` 구현**

`src/games/domino/engine/board.ts`:

```ts
import type { BoardEnd, BoardState, Move, Tile } from "./types";

export function createEmptyBoard(): BoardState {
  return { chain: [], leftEnd: null, rightEnd: null };
}

export function getValidMoves(hand: Tile[], board: BoardState): Move[] {
  const { leftEnd, rightEnd } = board;
  if (leftEnd === null || rightEnd === null) {
    return hand.map((tile) => ({ tile, end: "right" as BoardEnd }));
  }
  const moves: Move[] = [];
  for (const tile of hand) {
    if (tile.a === leftEnd || tile.b === leftEnd) {
      moves.push({ tile, end: "left" });
    }
    if (tile.a === rightEnd || tile.b === rightEnd) {
      moves.push({ tile, end: "right" });
    }
  }
  return moves;
}

export function canPlay(hand: Tile[], board: BoardState): boolean {
  return getValidMoves(hand, board).length > 0;
}

function otherValue(tile: Tile, matched: number): number {
  return tile.a === matched ? tile.b : tile.a;
}

export function applyMove(board: BoardState, move: Move): BoardState {
  const { tile } = move;
  const { leftEnd, rightEnd } = board;

  if (leftEnd === null || rightEnd === null) {
    return { chain: [{ tile, flipped: false }], leftEnd: tile.a, rightEnd: tile.b };
  }

  if (move.end === "left") {
    const flipped = tile.a === leftEnd;
    return { chain: [{ tile, flipped }, ...board.chain], leftEnd: otherValue(tile, leftEnd), rightEnd };
  }

  const flipped = tile.b === rightEnd;
  return { chain: [...board.chain, { tile, flipped }], leftEnd, rightEnd: otherValue(tile, rightEnd) };
}

export function pipSum(hand: Tile[]): number {
  return hand.reduce((sum, t) => sum + t.a + t.b, 0);
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npx vitest run src/games/domino/engine/board.test.ts`
Expected: PASS (11개 테스트 모두 통과)

- [ ] **Step 5: Commit**

```bash
git add src/games/domino/engine/board.ts src/games/domino/engine/board.test.ts
git commit -m "feat(domino): add board matching and tile placement logic"
```

---

### Task 4: 매치 오케스트레이션

**Files:**
- Create: `src/games/domino/engine/match.ts`
- Test: `src/games/domino/engine/match.test.ts`

**Interfaces:**
- Consumes: `createDeck`, `shuffle`, `HAND_SIZE` from `./deck` (Task 2); `applyMove`, `canPlay`, `createEmptyBoard`, `pipSum` from `./board` (Task 3); types from `./types` (Task 2)
- Produces: `createMatch(mode: MatchMode, targetScore: number, starter: PlayerId): MatchState`, `resolveDrawPhase(state: MatchState): MatchState`, `playMove(state: MatchState, move: Move): MatchState`, `passTurn(state: MatchState): MatchState`, `startNextRound(state: MatchState): MatchState`

- [ ] **Step 1: 실패하는 테스트 작성**

`src/games/domino/engine/match.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { createEmptyBoard } from "./board";
import { createMatch, passTurn, playMove, resolveDrawPhase, startNextRound } from "./match";
import type { MatchState } from "./types";

function makeState(overrides: Partial<MatchState> = {}): MatchState {
  return {
    mode: "single-round",
    targetScore: 100,
    hands: { human: [], ai: [] },
    scores: { human: 0, ai: 0 },
    board: createEmptyBoard(),
    boneyard: [],
    currentTurn: "human",
    roundStarter: "human",
    status: "playing",
    lastRoundResult: null,
    matchWinnerId: null,
    ...overrides,
  };
}

describe("createMatch", () => {
  it("각자 7장씩 분배하고 나머지는 보유고에 둔다", () => {
    const match = createMatch("single-round", 100, "human");
    expect(match.hands.human).toHaveLength(7);
    expect(match.hands.ai).toHaveLength(7);
    expect(match.boneyard).toHaveLength(14);
    expect(match.scores).toEqual({ human: 0, ai: 0 });
    expect(match.status).toBe("playing");
    expect(match.currentTurn).toBe("human");
  });
});

describe("resolveDrawPhase", () => {
  it("이미 낼 수 있으면 상태를 그대로(같은 참조로) 반환한다", () => {
    const state = makeState({
      hands: { human: [{ a: 1, b: 2 }], ai: [] },
      board: { chain: [{ tile: { a: 2, b: 3 }, flipped: false }], leftEnd: 2, rightEnd: 3 },
    });
    expect(resolveDrawPhase(state)).toBe(state);
  });

  it("낼 수 없으면 낼 수 있을 때까지 보유고에서 뽑는다", () => {
    const state = makeState({
      hands: { human: [{ a: 5, b: 5 }], ai: [] },
      board: { chain: [{ tile: { a: 1, b: 2 }, flipped: false }], leftEnd: 1, rightEnd: 2 },
      boneyard: [{ a: 6, b: 6 }, { a: 0, b: 1 }, { a: 3, b: 3 }],
    });
    const result = resolveDrawPhase(state);
    expect(result.hands.human).toEqual([{ a: 5, b: 5 }, { a: 6, b: 6 }, { a: 0, b: 1 }]);
    expect(result.boneyard).toEqual([{ a: 3, b: 3 }]);
  });

  it("보유고가 빌 때까지 뽑아도 낼 수 없으면 손패에 전부 추가하고 멈춘다", () => {
    const state = makeState({
      hands: { human: [{ a: 5, b: 5 }], ai: [] },
      board: { chain: [{ tile: { a: 1, b: 2 }, flipped: false }], leftEnd: 1, rightEnd: 2 },
      boneyard: [{ a: 6, b: 6 }, { a: 3, b: 3 }],
    });
    const result = resolveDrawPhase(state);
    expect(result.hands.human).toEqual([{ a: 5, b: 5 }, { a: 6, b: 6 }, { a: 3, b: 3 }]);
    expect(result.boneyard).toEqual([]);
  });
});

describe("playMove", () => {
  it("마지막 타일을 내면 라운드가 종료되고 상대 핀 합만큼 점수가 오른다", () => {
    const state = makeState({
      hands: { human: [{ a: 1, b: 2 }], ai: [{ a: 0, b: 0 }, { a: 3, b: 4 }] },
      board: { chain: [{ tile: { a: 2, b: 5 }, flipped: false }], leftEnd: 2, rightEnd: 5 },
      currentTurn: "human",
    });
    const result = playMove(state, { tile: { a: 1, b: 2 }, end: "left" });
    expect(result.hands.human).toEqual([]);
    expect(result.status).toBe("round-over");
    expect(result.scores.human).toBe(7);
    expect(result.lastRoundResult).toEqual({ winnerId: "human", reason: "emptied-hand", pointsAwarded: 7 });
  });

  it("목표점수에 도달하면 매치가 종료된다", () => {
    const state = makeState({
      mode: "target-score",
      targetScore: 5,
      hands: { human: [{ a: 1, b: 2 }], ai: [{ a: 3, b: 4 }] },
      board: { chain: [{ tile: { a: 2, b: 5 }, flipped: false }], leftEnd: 2, rightEnd: 5 },
      currentTurn: "human",
    });
    const result = playMove(state, { tile: { a: 1, b: 2 }, end: "left" });
    expect(result.status).toBe("match-over");
    expect(result.matchWinnerId).toBe("human");
  });

  it("아직 손패가 남아있으면 턴을 상대에게 넘긴다", () => {
    const state = makeState({
      hands: { human: [{ a: 1, b: 2 }, { a: 4, b: 4 }], ai: [{ a: 0, b: 0 }] },
      board: { chain: [{ tile: { a: 2, b: 5 }, flipped: false }], leftEnd: 2, rightEnd: 5 },
      currentTurn: "human",
    });
    const result = playMove(state, { tile: { a: 1, b: 2 }, end: "left" });
    expect(result.status).toBe("playing");
    expect(result.currentTurn).toBe("ai");
    expect(result.hands.human).toEqual([{ a: 4, b: 4 }]);
  });
});

describe("passTurn", () => {
  it("보유고가 남아있으면 턴만 넘긴다", () => {
    const state = makeState({ currentTurn: "human", boneyard: [{ a: 6, b: 6 }] });
    const result = passTurn(state);
    expect(result.currentTurn).toBe("ai");
    expect(result.status).toBe("playing");
  });

  it("아무도 못 내고 보유고도 비었으면 핀 합이 낮은 사람이 블록 승리한다", () => {
    const state = makeState({
      hands: { human: [{ a: 0, b: 0 }], ai: [{ a: 1, b: 1 }, { a: 2, b: 2 }] },
      board: { chain: [{ tile: { a: 5, b: 6 }, flipped: false }], leftEnd: 5, rightEnd: 6 },
      boneyard: [],
      currentTurn: "human",
      roundStarter: "human",
    });
    const result = passTurn(state);
    expect(result.status).toBe("round-over");
    expect(result.lastRoundResult).toEqual({ winnerId: "human", reason: "blocked", pointsAwarded: 4 });
    expect(result.scores.human).toBe(4);
  });

  it("핀 합이 같으면 라운드 시작자가 아닌 사람이 이긴다", () => {
    const state = makeState({
      hands: { human: [{ a: 1, b: 1 }], ai: [{ a: 2, b: 0 }] },
      board: { chain: [{ tile: { a: 5, b: 6 }, flipped: false }], leftEnd: 5, rightEnd: 6 },
      boneyard: [],
      currentTurn: "human",
      roundStarter: "human",
    });
    const result = passTurn(state);
    expect(result.lastRoundResult?.winnerId).toBe("ai");
  });
});

describe("startNextRound", () => {
  it("이전 라운드 승자부터 다음 라운드를 시작하고 점수는 유지한다", () => {
    const state = makeState({
      scores: { human: 10, ai: 3 },
      status: "round-over",
      lastRoundResult: { winnerId: "ai", reason: "blocked", pointsAwarded: 3 },
      roundStarter: "human",
    });
    const result = startNextRound(state);
    expect(result.status).toBe("playing");
    expect(result.currentTurn).toBe("ai");
    expect(result.roundStarter).toBe("ai");
    expect(result.scores).toEqual({ human: 10, ai: 3 });
    expect(result.hands.human).toHaveLength(7);
    expect(result.hands.ai).toHaveLength(7);
    expect(result.boneyard).toHaveLength(14);
    expect(result.lastRoundResult).toBeNull();
  });
});
```

- [ ] **Step 2: 테스트 실행해서 실패 확인**

Run: `npx vitest run src/games/domino/engine/match.test.ts`
Expected: FAIL — `Cannot find module './match'`

- [ ] **Step 3: `match.ts` 구현**

`src/games/domino/engine/match.ts`:

```ts
import { createDeck, HAND_SIZE, shuffle } from "./deck";
import { applyMove, canPlay, createEmptyBoard, pipSum } from "./board";
import type { MatchMode, MatchState, Move, PlayerId, RoundResult, Tile } from "./types";

const otherPlayer: Record<PlayerId, PlayerId> = { human: "ai", ai: "human" };

function dealHands(): { human: Tile[]; ai: Tile[]; boneyard: Tile[] } {
  const shuffled = shuffle(createDeck());
  return {
    human: shuffled.slice(0, HAND_SIZE),
    ai: shuffled.slice(HAND_SIZE, HAND_SIZE * 2),
    boneyard: shuffled.slice(HAND_SIZE * 2),
  };
}

export function createMatch(mode: MatchMode, targetScore: number, starter: PlayerId): MatchState {
  const dealt = dealHands();
  return {
    mode,
    targetScore,
    hands: { human: dealt.human, ai: dealt.ai },
    scores: { human: 0, ai: 0 },
    board: createEmptyBoard(),
    boneyard: dealt.boneyard,
    currentTurn: starter,
    roundStarter: starter,
    status: "playing",
    lastRoundResult: null,
    matchWinnerId: null,
  };
}

export function startNextRound(state: MatchState): MatchState {
  const dealt = dealHands();
  const starter = state.lastRoundResult?.winnerId ?? state.roundStarter;
  return {
    ...state,
    hands: { human: dealt.human, ai: dealt.ai },
    board: createEmptyBoard(),
    boneyard: dealt.boneyard,
    currentTurn: starter,
    roundStarter: starter,
    status: "playing",
    lastRoundResult: null,
  };
}

export function resolveDrawPhase(state: MatchState): MatchState {
  if (state.status !== "playing") return state;
  const player = state.currentTurn;
  if (canPlay(state.hands[player], state.board)) return state;

  let hand = state.hands[player];
  let boneyard = state.boneyard;
  while (!canPlay(hand, state.board) && boneyard.length > 0) {
    hand = [...hand, boneyard[0]];
    boneyard = boneyard.slice(1);
  }
  return { ...state, hands: { ...state.hands, [player]: hand }, boneyard };
}

function pipTotal(state: MatchState, player: PlayerId): number {
  return pipSum(state.hands[player]);
}

function finishRound(state: MatchState, winnerId: PlayerId, reason: RoundResult["reason"]): MatchState {
  const loserId = otherPlayer[winnerId];
  const pointsAwarded = pipTotal(state, loserId);
  const scores = { ...state.scores, [winnerId]: state.scores[winnerId] + pointsAwarded };
  const matchOver = state.mode === "single-round" || scores[winnerId] >= state.targetScore;
  return {
    ...state,
    scores,
    status: matchOver ? "match-over" : "round-over",
    lastRoundResult: { winnerId, reason, pointsAwarded },
    matchWinnerId: matchOver ? winnerId : null,
  };
}

export function playMove(state: MatchState, move: Move): MatchState {
  if (state.status !== "playing") return state;
  const player = state.currentTurn;
  const hand = state.hands[player];
  const tileIndex = hand.findIndex((t) => t.a === move.tile.a && t.b === move.tile.b);
  if (tileIndex === -1) return state;

  const newHand = [...hand.slice(0, tileIndex), ...hand.slice(tileIndex + 1)];
  const next: MatchState = {
    ...state,
    board: applyMove(state.board, move),
    hands: { ...state.hands, [player]: newHand },
  };

  if (newHand.length === 0) {
    return finishRound(next, player, "emptied-hand");
  }
  return { ...next, currentTurn: otherPlayer[player] };
}

export function passTurn(state: MatchState): MatchState {
  if (state.status !== "playing") return state;

  if (state.boneyard.length === 0) {
    const humanCan = canPlay(state.hands.human, state.board);
    const aiCan = canPlay(state.hands.ai, state.board);
    if (!humanCan && !aiCan) {
      const humanPips = pipTotal(state, "human");
      const aiPips = pipTotal(state, "ai");
      const winnerId: PlayerId =
        humanPips === aiPips
          ? otherPlayer[state.roundStarter]
          : humanPips < aiPips
            ? "human"
            : "ai";
      return finishRound(state, winnerId, "blocked");
    }
  }

  return { ...state, currentTurn: otherPlayer[state.currentTurn] };
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npx vitest run src/games/domino/engine/match.test.ts`
Expected: PASS (10개 테스트 모두 통과)

- [ ] **Step 5: Commit**

```bash
git add src/games/domino/engine/match.ts src/games/domino/engine/match.test.ts
git commit -m "feat(domino): add match orchestration (deal, draw, play, pass, scoring)"
```

---

### Task 5: AI 로직

**Files:**
- Create: `src/games/domino/engine/ai.ts`
- Test: `src/games/domino/engine/ai.test.ts`

**Interfaces:**
- Consumes: `getValidMoves` from `./board` (Task 3); `BoardState`, `Move`, `Tile` from `./types` (Task 2)
- Produces: `chooseAiMove(hand: Tile[], board: BoardState): Move | null`

- [ ] **Step 1: 실패하는 테스트 작성**

`src/games/domino/engine/ai.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { chooseAiMove } from "./ai";
import { createEmptyBoard, getValidMoves } from "./board";

describe("chooseAiMove", () => {
  it("낼 수 있는 타일이 없으면 null을 반환한다", () => {
    const board = { chain: [{ tile: { a: 1, b: 2 }, flipped: false }], leftEnd: 1, rightEnd: 2 };
    const move = chooseAiMove([{ a: 5, b: 6 }], board);
    expect(move).toBeNull();
  });

  it("낼 수 있는 타일 중 하나를 반환한다", () => {
    const board = { chain: [{ tile: { a: 1, b: 2 }, flipped: false }], leftEnd: 1, rightEnd: 2 };
    const hand = [{ a: 2, b: 3 }];
    const move = chooseAiMove(hand, board);
    expect(move).not.toBeNull();
    expect(getValidMoves(hand, board)).toContainEqual(move);
  });

  it("빈 보드에서는 손패의 아무 타일이나 낼 수 있다", () => {
    const move = chooseAiMove([{ a: 3, b: 3 }], createEmptyBoard());
    expect(move).toEqual({ tile: { a: 3, b: 3 }, end: "right" });
  });
});
```

- [ ] **Step 2: 테스트 실행해서 실패 확인**

Run: `npx vitest run src/games/domino/engine/ai.test.ts`
Expected: FAIL — `Cannot find module './ai'`

- [ ] **Step 3: `ai.ts` 구현**

`src/games/domino/engine/ai.ts`:

```ts
import { getValidMoves } from "./board";
import type { BoardState, Move, Tile } from "./types";

export function chooseAiMove(hand: Tile[], board: BoardState): Move | null {
  const moves = getValidMoves(hand, board);
  if (moves.length === 0) return null;
  const index = Math.floor(Math.random() * moves.length);
  return moves[index];
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npx vitest run src/games/domino/engine/ai.test.ts`
Expected: PASS (3개 테스트 모두 통과)

- [ ] **Step 5: 전체 엔진 테스트 스위트 확인**

Run: `npx vitest run src/games/domino`
Expected: PASS — 4개 테스트 파일, 총 29개 테스트 모두 통과

- [ ] **Step 6: Commit**

```bash
git add src/games/domino/engine/ai.ts src/games/domino/engine/ai.test.ts
git commit -m "feat(domino): add random-valid-move AI"
```

---

### Task 6: 도미노 타일 렌더 컴포넌트

**Files:**
- Create: `src/games/domino/DominoTile.tsx`
- Create: `src/games/domino/DominoTile.css`

**Interfaces:**
- Consumes: `Tile` from `./engine/types` (Task 2)
- Produces: `DominoTile` React 컴포넌트 — `{ tile: Tile; orientation?: "horizontal" | "vertical"; flipped?: boolean; faceDown?: boolean; className?: string }` props

이 컴포넌트는 순수 표현(presentational) 컴포넌트라 분기 로직이 거의 없어 자동 테스트 대신 Task 8에서 `npm run dev`로 실제 렌더링을 눈으로 확인한다.

- [ ] **Step 1: `DominoTile.tsx` 구현**

`src/games/domino/DominoTile.tsx`:

```tsx
import type { Tile } from "./engine/types";
import "./DominoTile.css";

const PIP_LAYOUTS: Record<number, number[]> = {
  0: [],
  1: [4],
  2: [0, 8],
  3: [0, 4, 8],
  4: [0, 2, 6, 8],
  5: [0, 2, 4, 6, 8],
  6: [0, 2, 3, 5, 6, 8],
};

function PipFace({ value }: { value: number }) {
  const active = new Set(PIP_LAYOUTS[value] ?? []);
  return (
    <div className="domino-tile__face">
      {Array.from({ length: 9 }, (_, i) => (
        <span
          key={i}
          className={active.has(i) ? "domino-tile__pip domino-tile__pip--on" : "domino-tile__pip"}
        />
      ))}
    </div>
  );
}

interface DominoTileProps {
  tile: Tile;
  orientation?: "horizontal" | "vertical";
  flipped?: boolean;
  faceDown?: boolean;
  className?: string;
}

export function DominoTile({
  tile,
  orientation = "horizontal",
  flipped = false,
  faceDown = false,
  className,
}: DominoTileProps) {
  const classes = [
    "domino-tile",
    `domino-tile--${orientation}`,
    faceDown ? "domino-tile--face-down" : "",
    className ?? "",
  ]
    .filter(Boolean)
    .join(" ");

  if (faceDown) {
    return <div className={classes} aria-hidden="true" />;
  }

  const [first, second] = flipped ? [tile.b, tile.a] : [tile.a, tile.b];

  return (
    <div className={classes}>
      <PipFace value={first} />
      <span className="domino-tile__divider" />
      <PipFace value={second} />
    </div>
  );
}
```

- [ ] **Step 2: `DominoTile.css` 작성**

`src/games/domino/DominoTile.css`:

```css
.domino-tile {
  display: flex;
  background: #fdfdfb;
  border: 2px solid #1a1a1a;
  border-radius: 6px;
  box-shadow: 0 2px 0 rgba(0, 0, 0, 0.25);
}

.domino-tile--horizontal {
  flex-direction: row;
  width: 64px;
  height: 32px;
}

.domino-tile--vertical {
  flex-direction: column;
  width: 32px;
  height: 64px;
}

.domino-tile--face-down {
  width: 32px;
  height: 64px;
  background: repeating-linear-gradient(45deg, #2c2c40, #2c2c40 4px, #212133 4px, #212133 8px);
}

.domino-tile__face {
  flex: 1;
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  grid-template-rows: repeat(3, 1fr);
  gap: 1px;
  padding: 3px;
}

.domino-tile__pip {
  border-radius: 50%;
}

.domino-tile__pip--on {
  background: #1a1a1a;
}

.domino-tile__divider {
  background: #1a1a1a;
}

.domino-tile--horizontal .domino-tile__divider {
  width: 2px;
}

.domino-tile--vertical .domino-tile__divider {
  height: 2px;
}
```

- [ ] **Step 3: 타입 체크**

Run:
```powershell
$env:PATH = "C:\Program Files (x86)\HncTools\McpServers\Node;" + $env:PATH
npx tsc -b
```
Expected: 에러 없이 종료 (JSX 파일이지만 아직 어디서도 import되지 않으므로 `noUnusedLocals` 등은 문제 없음 — 미사용 export 자체는 오류 대상이 아님)

- [ ] **Step 4: Commit**

```bash
git add src/games/domino/DominoTile.tsx src/games/domino/DominoTile.css
git commit -m "feat(domino): add domino tile presentational component"
```

---

### Task 7: 시작 화면 (DominoMenu)

**Files:**
- Create: `src/games/domino/DominoMenu.tsx`
- Create: `src/games/domino/DominoMenu.css`

**Interfaces:**
- Consumes: `MatchMode` from `./engine/types` (Task 2)
- Produces: `DominoMenu` React 컴포넌트 — `{ onStart: (mode: MatchMode, targetScore: number) => void }` props

- [ ] **Step 1: `DominoMenu.tsx` 구현**

`src/games/domino/DominoMenu.tsx`:

```tsx
import { useState } from "react";
import type { MatchMode } from "./engine/types";
import "./DominoMenu.css";

interface DominoMenuProps {
  onStart: (mode: MatchMode, targetScore: number) => void;
}

const DEFAULT_TARGET_SCORE = 100;

export function DominoMenu({ onStart }: DominoMenuProps) {
  const [mode, setMode] = useState<MatchMode>("target-score");
  const [targetScore, setTargetScore] = useState(DEFAULT_TARGET_SCORE);

  return (
    <div className="domino-menu">
      <div className="domino-menu__panel">
        <p className="domino-menu__eyebrow">☥ MINI GAME ARCADE · DOMINO ☥</p>
        <h1 className="domino-menu__title">도미노</h1>
        <p className="domino-menu__subtitle">
          이집트 카페에서 즐기던 표준 블록 도미노(더블식스), AI와 1:1로 대결하세요
        </p>

        <div className="domino-menu__field">
          <span className="domino-menu__label">종료 방식</span>
          <div className="domino-menu__options">
            <label
              className={
                mode === "single-round"
                  ? "domino-menu__option domino-menu__option--active"
                  : "domino-menu__option"
              }
            >
              <input
                type="radio"
                name="mode"
                value="single-round"
                checked={mode === "single-round"}
                onChange={() => setMode("single-round")}
              />
              단판
            </label>
            <label
              className={
                mode === "target-score"
                  ? "domino-menu__option domino-menu__option--active"
                  : "domino-menu__option"
              }
            >
              <input
                type="radio"
                name="mode"
                value="target-score"
                checked={mode === "target-score"}
                onChange={() => setMode("target-score")}
              />
              목표점수
            </label>
          </div>
        </div>

        {mode === "target-score" && (
          <label className="domino-menu__field">
            <span className="domino-menu__label">목표 점수</span>
            <input
              type="number"
              min={10}
              step={10}
              value={targetScore}
              onChange={(e) => setTargetScore(Math.max(10, Number(e.target.value) || DEFAULT_TARGET_SCORE))}
              className="domino-menu__number"
            />
          </label>
        )}

        <button className="domino-menu__start" onClick={() => onStart(mode, targetScore)}>
          게임 시작 ☥
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: `DominoMenu.css` 작성**

`src/games/domino/DominoMenu.css`:

```css
.domino-menu {
  min-height: 60vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--space-6) var(--space-4);
  background: radial-gradient(circle at 20% 20%, #4a3418 0%, #241a0d 60%, #150f08 100%);
}

.domino-menu__panel {
  width: min(420px, 100%);
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
  padding: var(--space-6);
  background: #f1e3c6;
  color: #3b2a17;
  border: 1px solid #c9a86a;
  border-radius: var(--radius-card);
  box-shadow: var(--shadow-card);
}

.domino-menu__eyebrow {
  margin: 0;
  font-family: var(--font-mono);
  letter-spacing: 0.12em;
  font-size: 0.75rem;
  color: #8a6a2f;
  text-align: center;
}

.domino-menu__title {
  margin: 0;
  text-align: center;
  font-family: var(--font-display);
  font-size: 2.2rem;
  color: #5c3a12;
}

.domino-menu__subtitle {
  margin: 0;
  text-align: center;
  font-size: 0.9rem;
  color: #6b543a;
}

.domino-menu__field {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.domino-menu__label {
  font-weight: 600;
  font-size: 0.85rem;
  color: #5c3a12;
}

.domino-menu__options {
  display: flex;
  gap: var(--space-2);
}

.domino-menu__option {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-1);
  padding: var(--space-2);
  border: 1px solid #c9a86a;
  border-radius: var(--radius-chip);
  cursor: pointer;
  background: #fbf3e2;
}

.domino-menu__option--active {
  background: #c9a86a;
  color: #2c1c08;
}

.domino-menu__number {
  padding: var(--space-2);
  border-radius: 8px;
  border: 1px solid #c9a86a;
  font-family: var(--font-mono);
}

.domino-menu__start {
  margin-top: var(--space-2);
  padding: var(--space-3);
  border: none;
  border-radius: var(--radius-chip);
  background: #8a5a1f;
  color: #f1e3c6;
  font-weight: 700;
  font-size: 1rem;
  cursor: pointer;
}

.domino-menu__start:hover {
  background: #6b4517;
}
```

- [ ] **Step 3: 타입 체크**

Run: `npx tsc -b` (PATH 설정 후)
Expected: 에러 없이 종료

- [ ] **Step 4: Commit**

```bash
git add src/games/domino/DominoMenu.tsx src/games/domino/DominoMenu.css
git commit -m "feat(domino): add pre-game menu with egyptian-themed styling"
```

---

### Task 8: 메인 게임 화면 (Domino.tsx) + 등록

**Files:**
- Create: `src/games/domino/Domino.tsx`
- Create: `src/games/domino/Domino.css`
- Create: `src/games/domino/index.ts`
- Modify: `src/gameRegistry.ts`
- Modify: `src/styles/tokens.css`

**Interfaces:**
- Consumes: `GameShell` from `../../components/GameShell`; `useHighScore` from `../../hooks/useHighScore`; `DominoMenu` (Task 7); `DominoTile` (Task 6); `createMatch`, `playMove`, `passTurn`, `resolveDrawPhase`, `startNextRound` from `./engine/match` (Task 4); `canPlay`, `getValidMoves` from `./engine/board` (Task 3); `chooseAiMove` from `./engine/ai` (Task 5); types from `./engine/types` (Task 2)
- Produces: `Domino` React 컴포넌트 (default 아님, named export), `domino: GameModule` (`index.ts`에서)

- [ ] **Step 1: `Domino.tsx` 구현**

`src/games/domino/Domino.tsx`:

```tsx
import { useCallback, useEffect, useState } from "react";
import { GameShell } from "../../components/GameShell";
import { useHighScore } from "../../hooks/useHighScore";
import { DominoMenu } from "./DominoMenu";
import { DominoTile } from "./DominoTile";
import { canPlay, getValidMoves } from "./engine/board";
import { chooseAiMove } from "./engine/ai";
import { createMatch, passTurn, playMove, resolveDrawPhase, startNextRound } from "./engine/match";
import type { BoardEnd, MatchMode, MatchState, PlayerId, Tile } from "./engine/types";
import "./Domino.css";

const AI_MOVE_DELAY_MS = 500;

export function Domino() {
  const [match, setMatch] = useState<MatchState | null>(null);
  const [pendingTile, setPendingTile] = useState<Tile | null>(null);
  const [highScore, submitScore] = useHighScore("domino");

  const startMatch = useCallback((mode: MatchMode, targetScore: number) => {
    const starter: PlayerId = Math.random() < 0.5 ? "human" : "ai";
    setMatch(createMatch(mode, targetScore, starter));
    setPendingTile(null);
  }, []);

  useEffect(() => {
    if (!match || match.status !== "playing") return;

    const drawn = resolveDrawPhase(match);
    if (drawn !== match) {
      setMatch(drawn);
      return;
    }

    if (!canPlay(match.hands[match.currentTurn], match.board)) {
      setMatch(passTurn(match));
      return;
    }

    if (match.currentTurn === "ai") {
      const timer = setTimeout(() => {
        setMatch((current) => {
          if (!current || current.status !== "playing" || current.currentTurn !== "ai") return current;
          const move = chooseAiMove(current.hands.ai, current.board);
          return move ? playMove(current, move) : current;
        });
      }, AI_MOVE_DELAY_MS);
      return () => clearTimeout(timer);
    }
  }, [match]);

  useEffect(() => {
    if (match?.status === "match-over") {
      submitScore(match.scores.human);
    }
  }, [match?.status, match?.scores.human, submitScore]);

  const handleTileClick = useCallback(
    (tile: Tile) => {
      if (!match || match.status !== "playing" || match.currentTurn !== "human") return;
      const moves = getValidMoves(match.hands.human, match.board).filter(
        (m) => m.tile.a === tile.a && m.tile.b === tile.b
      );
      if (moves.length === 0) return;
      if (moves.length === 1) {
        setMatch(playMove(match, moves[0]));
        return;
      }
      setPendingTile(tile);
    },
    [match]
  );

  const handleChooseEnd = useCallback(
    (end: BoardEnd) => {
      if (!match || !pendingTile) return;
      setMatch(playMove(match, { tile: pendingTile, end }));
      setPendingTile(null);
    },
    [match, pendingTile]
  );

  if (!match) {
    return <DominoMenu onStart={startMatch} />;
  }

  const humanValidTileKeys = new Set(
    match.status === "playing" && match.currentTurn === "human"
      ? getValidMoves(match.hands.human, match.board).map((m) => `${m.tile.a}-${m.tile.b}`)
      : []
  );

  return (
    <GameShell
      title="도미노"
      accentVar="--accent-domino"
      score={match.scores.human}
      highScore={highScore}
      controlsHint="손패에서 타일을 클릭해 보드 양 끝에 맞춰 놓으세요"
    >
      <div className="domino-board">
        <div className="domino-status-bar">
          <span>턴: {match.currentTurn === "human" ? "나" : "AI"}</span>
          <span>
            내 타일 {match.hands.human.length}장 · AI {match.hands.ai.length}장 · 보유고 {match.boneyard.length}장
          </span>
          <span>
            나 {match.scores.human} : {match.scores.ai} AI
          </span>
        </div>

        <div className="domino-ai-hand">
          {match.hands.ai.map((_, i) => (
            <DominoTile key={i} tile={{ a: 0, b: 0 }} faceDown />
          ))}
        </div>

        <div className="domino-chain">
          {match.board.chain.length === 0 && <p className="domino-chain__empty">첫 타일을 놓아보세요</p>}
          {match.board.chain.map((placed, i) => (
            <DominoTile
              key={i}
              tile={placed.tile}
              flipped={placed.flipped}
              orientation={placed.tile.a === placed.tile.b ? "vertical" : "horizontal"}
            />
          ))}
        </div>

        {pendingTile && (
          <div className="domino-end-picker">
            <p>어느 쪽에 놓을까요?</p>
            <button onClick={() => handleChooseEnd("left")}>왼쪽</button>
            <button onClick={() => handleChooseEnd("right")}>오른쪽</button>
            <button onClick={() => setPendingTile(null)}>취소</button>
          </div>
        )}

        <div className="domino-human-hand">
          {match.hands.human.map((tile, i) => (
            <button
              key={i}
              className="domino-human-hand__slot"
              onClick={() => handleTileClick(tile)}
              disabled={match.currentTurn !== "human" || !humanValidTileKeys.has(`${tile.a}-${tile.b}`)}
            >
              <DominoTile tile={tile} />
            </button>
          ))}
        </div>

        {match.status === "round-over" && match.lastRoundResult && (
          <div className="domino-round-end">
            <p>
              {match.lastRoundResult.winnerId === "human" ? "내가" : "AI가"} 이번 라운드 승리! (+
              {match.lastRoundResult.pointsAwarded}점)
            </p>
            <button onClick={() => setMatch(startNextRound(match))}>다음 라운드</button>
          </div>
        )}

        {match.status === "match-over" && (
          <div className="domino-match-end">
            <p>{match.matchWinnerId === "human" ? "내가 매치에서 승리했습니다!" : "AI가 매치에서 승리했습니다."}</p>
            <button onClick={() => setMatch(null)}>메뉴로 돌아가기</button>
          </div>
        )}
      </div>
    </GameShell>
  );
}
```

- [ ] **Step 2: `Domino.css` 작성**

`src/games/domino/Domino.css`:

```css
.domino-board {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
  color: var(--text-primary);
}

.domino-status-bar {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-3);
  justify-content: space-between;
  font-family: var(--font-mono);
  font-size: 0.85rem;
  color: var(--text-muted);
}

.domino-ai-hand {
  display: flex;
  gap: 6px;
  justify-content: center;
}

.domino-chain {
  display: flex;
  align-items: center;
  gap: 4px;
  min-height: 96px;
  padding: var(--space-4);
  overflow-x: auto;
  background: radial-gradient(circle at 50% 50%, #146b45 0%, #0f5c3a 70%);
  border-radius: var(--radius-card);
  border: 4px solid #0a4028;
}

.domino-chain__empty {
  margin: 0 auto;
  color: rgba(255, 255, 255, 0.7);
  font-family: var(--font-mono);
}

.domino-human-hand {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  justify-content: center;
}

.domino-human-hand__slot {
  border: none;
  background: none;
  padding: 0;
  cursor: pointer;
}

.domino-human-hand__slot:disabled {
  cursor: not-allowed;
  opacity: 0.5;
}

.domino-end-picker,
.domino-round-end,
.domino-match-end {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--space-3);
  justify-content: center;
  padding: var(--space-3);
  background: var(--bg-panel-raised);
  border-radius: var(--radius-card);
}

.domino-end-picker button,
.domino-round-end button,
.domino-match-end button {
  padding: var(--space-2) var(--space-4);
  border-radius: var(--radius-chip);
  border: 1px solid var(--border-hairline);
  background: var(--shell-accent, var(--accent-domino));
  color: #101018;
  font-weight: 600;
  cursor: pointer;
}
```

- [ ] **Step 3: `index.ts` 작성**

`src/games/domino/index.ts`:

```ts
import type { GameModule } from "../../types/game";
import { Domino } from "./Domino";

export const domino: GameModule = {
  id: "domino",
  title: "도미노",
  description: "표준 블록 도미노 28피스로 AI와 1:1 대결을 펼쳐보세요",
  icon: "🁻",
  accentVar: "--accent-domino",
  Component: Domino,
  inProgress: true,
};
```

- [ ] **Step 4: `gameRegistry.ts`에 등록**

`src/gameRegistry.ts` 전체를 아래 내용으로 교체한다(기존 import 3개 + 배열 뒤에 domino만 추가):

```ts
import type { GameModule } from "./types/game";
import { game2048 } from "./games/game2048";
import { appleGame } from "./games/appleGame";
import { tetris } from "./games/tetris";
import { domino } from "./games/domino";

export const games: GameModule[] = [game2048, appleGame, tetris, domino];

export function getGameById(id: string): GameModule | undefined {
  return games.find((g) => g.id === id);
}
```

- [ ] **Step 5: `tokens.css`에 색상 변수 추가**

`src/styles/tokens.css`에서 아래 블록:

```css
  --accent-tetris: #4cc9f0;
  --accent-tetris-dim: #1f3a44;
```

바로 다음 줄에 추가한다(기존 두 줄은 그대로 유지):

```css
  --accent-domino: #c9a86a;
  --accent-domino-dim: #4a3418;
```

- [ ] **Step 6: 타입 체크 + 린트**

Run:
```powershell
$env:PATH = "C:\Program Files (x86)\HncTools\McpServers\Node;" + $env:PATH
npx tsc -b
npx oxlint
```
Expected: 둘 다 에러 없이 종료 (경고가 있다면 `react/only-export-components` 정도는 기존 게임들도 갖고 있는 수준이라 허용)

- [ ] **Step 7: 전체 유닛 테스트 재확인**

Run: `npx vitest run`
Expected: PASS — 모든 엔진 테스트 통과 (Task 1~5에서 만든 테스트 전체)

- [ ] **Step 8: 로컬 브라우저에서 수동 플레이 확인**

Run: `npm run dev` (PATH 설정 후), 브라우저에서 `http://localhost:5173/domino` 접속.

확인할 것:
1. 로비(`/`)에 "도미노" 카드가 보이고 클릭하면 `/domino`로 이동한다.
2. 시작 화면에 이집트 톤(샌드스톤 배경 + ☥ 아이콘)과 "단판"/"목표점수" 선택, 목표점수 입력창이 보인다.
3. "게임 시작"을 누르면 초록 보드 + 흰 타일(검은 점) 화면으로 전환되고, 내 손패 7장 · AI 손패(뒷면) 7장 · 보유고 14장이 표시된다.
4. 낼 수 있는 타일만 클릭 가능하고(그 외엔 비활성화), 클릭하면 보드에 놓인다. 양쪽 다 맞는 타일은 "왼쪽/오른쪽" 선택 UI가 뜬다.
5. 내 턴이 끝나면 약 0.5초 후 AI가 자동으로 수를 둔다(또는 뽑거나 패스한다).
6. 한쪽 손패가 비거나 블록 상황이 되면 라운드 종료 화면(승자 + 획득 점수)이 뜨고, "다음 라운드"를 누르면 새 라운드가 시작된다(목표점수 모드).
7. 목표 점수에 도달하면 매치 종료 화면이 뜨고 "메뉴로 돌아가기"로 시작 화면에 복귀한다.
8. GameShell 헤더의 SCORE/BEST가 내 누적 점수와 최고 기록을 보여준다.

이 단계는 자동화된 assertion이 없으므로, 위 8개 항목을 실제로 조작해보고 전부 정상 동작하면 다음 단계로 진행한다.

- [ ] **Step 9: Commit**

```bash
git add src/games/domino/Domino.tsx src/games/domino/Domino.css src/games/domino/index.ts src/gameRegistry.ts src/styles/tokens.css
git commit -m "feat(domino): wire up main game screen and register in gameRegistry"
```

---

## Self-Review 결과 (계획 작성 시 확인 완료)

- **스펙 커버리지**: 설계 문서의 "싱글플레이 1:1" 관련 항목(7피스 고정 분배, 낼 수 없으면 draw-until-playable, 라운드/블록 판정, 단판/목표점수 선택, 점수 누적, GameShell/useHighScore 재사용, 보드/타일 비주얼, 이집트 시작화면)은 Task 2~8에서 모두 다룬다. 2~4인 좌석 선택과 온라인 멀티플레이(Firebase)는 이 계획의 범위 밖으로 명시했다(향후 별도 계획).
- **Placeholder 스캔**: "TODO"/"나중에" 등 자리표시자 없음. 모든 스텝에 실행 가능한 전체 코드 포함.
- **타입 일관성**: `Move`, `MatchState`, `BoardState`, `PlayerId` 등의 필드명/시그니처가 Task 2에서 정의된 그대로 Task 3~8까지 동일하게 사용됨을 재확인했다(`hands`/`scores`는 `Record<PlayerId, Tile[] | number>`, `applyMove`/`getValidMoves`/`canPlay`는 동일 시그니처로 Task 4, 8에서도 그대로 재사용).
