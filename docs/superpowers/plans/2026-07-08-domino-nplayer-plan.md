# 도미노 2~4인 일반화 + AI 난이도 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 도미노 엔진을 2인 고정에서 2~4인(나 1명 + AI 1~3명)으로 일반화하고, AI 난이도(쉬움/보통/어려움)를 추가한다.

**Architecture:** `PlayerId`를 문자열로 일반화하고 `MatchState`에 `playerOrder` 좌석 순서를 추가한다. `otherPlayer` 2인 토글을 `nextPlayer` 순환 함수로 교체하고, 점수/블록 타이브레이크를 N명 기준으로 재계산한다. `resolveDrawPhase`/`playMove`/`passTurn`/`startNextRound`의 외부 시그니처는 그대로 유지해 기존 회귀 테스트가 최대한 그대로 살아남게 한다.

**Tech Stack:** 기존과 동일 (React 19 + TypeScript strict + Vite + vitest).

**참조 문서:** `docs/superpowers/specs/2026-07-08-domino-nplayer-design.md`

## Global Constraints

- Node/PATH: `$env:PATH = "C:\Program Files\nodejs;" + $env:PATH` (64비트 Node, 이제 정상 동작 확인됨 — `npm test`/`npm run dev`/`npm run build` 전부 이 Node로 실행).
- 기존 `resolveDrawPhase`, `playMove`, `passTurn`, `startNextRound`의 함수 시그니처는 바꾸지 않는다(내부 구현만 N명 대응으로 교체). `createMatch`만 시그니처가 바뀐다(`starter: PlayerId` 파라미터 제거 → `playerOrder: PlayerId[]`로 대체, 내부에서 무작위 시작자 선정).
- 기존 `match.test.ts`의 `resolveDrawPhase`/`playMove`/`passTurn`/`startNextRound` 테스트는 **수정하지 않고 그대로 둔다**(2인 회귀 안전망). `createMatch` 테스트만 새 시그니처로 교체하고, 각 describe 블록에 N인(3인 이상) 케이스를 추가한다.
- TypeScript strict, `verbatimModuleSyntax: true` — 타입 전용 import는 `import type`.

---

## File Structure

```
수정:
  src/games/domino/engine/types.ts       # PlayerId → string, MatchState.playerOrder 추가
  src/games/domino/engine/match.ts        # HUMAN_ID/aiId/nextPlayer 추가, N인 일반화
  src/games/domino/engine/match.test.ts    # createMatch 테스트 교체 + N인 케이스 추가
  src/games/domino/engine/ai.ts             # AiDifficulty, medium/hard 휴리스틱 추가
  src/games/domino/engine/ai.test.ts         # medium/hard 테스트 추가
  src/games/domino/DominoMenu.tsx              # 인원수/난이도 필드 추가
  src/games/domino/Domino.tsx                   # N인 렌더링 + 난이도 반영
  src/games/domino/Domino.css                    # 상대방 여러 명 표시용 스타일 추가
```

---

### Task 1: 타입에 `playerOrder` 추가, `PlayerId`를 문자열로 일반화

**Files:**
- Modify: `src/games/domino/engine/types.ts`

**Interfaces:**
- Produces: `PlayerId = string`(기존 `"human" | "ai"`에서 변경), `MatchState.playerOrder: PlayerId[]`(신규 필드)

- [ ] **Step 1: `types.ts` 수정**

`export type PlayerId = "human" | "ai";`를 아래로 교체:

```ts
export type PlayerId = string;
```

`MatchState` 인터페이스에서 `targetScore: number;` 바로 다음 줄에 추가:

```ts
  playerOrder: PlayerId[];
```

- [ ] **Step 2: 타입 체크**

Run:
```powershell
$env:PATH = "C:\Program Files\nodejs;" + $env:PATH
npx tsc -b
```
Expected: `match.ts`에서 `MatchState` 객체 리터럴에 `playerOrder`가 없다는 에러가 여러 건 발생(다음 태스크에서 고침). 이 단계에서는 에러가 나는 게 정상이다.

- [ ] **Step 3: Commit은 Task 2와 함께** (타입만 바꾸면 컴파일이 깨지므로 별도 커밋하지 않고 다음 태스크에 포함)

---

### Task 2: `match.ts`를 N인 기준으로 일반화

**Files:**
- Modify: `src/games/domino/engine/match.ts`

**Interfaces:**
- Consumes: `PlayerId`, `MatchState`, `Move`, `MatchMode`, `RoundResult`, `Tile` from `./types` (Task 1)
- Produces: `HUMAN_ID: PlayerId`, `aiId(n: number): PlayerId`, `nextPlayer(order: PlayerId[], current: PlayerId): PlayerId`, `createMatch(mode: MatchMode, targetScore: number, playerOrder: PlayerId[]): MatchState`(시그니처 변경), 나머지 함수는 시그니처 동일 유지

- [ ] **Step 1: `match.ts` 전체를 아래로 교체**

```ts
import { createDeck, HAND_SIZE, shuffle } from "./deck";
import { applyMove, canPlay, createEmptyBoard, pipSum } from "./board";
import type { MatchMode, MatchState, Move, PlayerId, RoundResult, Tile } from "./types";

export const HUMAN_ID: PlayerId = "human";

export function aiId(n: number): PlayerId {
  return `ai-${n}`;
}

export function nextPlayer(order: PlayerId[], current: PlayerId): PlayerId {
  const index = order.indexOf(current);
  return order[(index + 1) % order.length];
}

function pickClosestAfter(order: PlayerId[], starter: PlayerId, candidates: PlayerId[]): PlayerId {
  const startIndex = order.indexOf(starter);
  for (let offset = 1; offset <= order.length; offset++) {
    const candidate = order[(startIndex + offset) % order.length];
    if (candidates.includes(candidate)) return candidate;
  }
  return candidates[0];
}

function dealHands(playerOrder: PlayerId[]): { hands: Record<PlayerId, Tile[]>; boneyard: Tile[] } {
  const shuffled = shuffle(createDeck());
  const hands: Record<PlayerId, Tile[]> = {};
  let offset = 0;
  for (const player of playerOrder) {
    hands[player] = shuffled.slice(offset, offset + HAND_SIZE);
    offset += HAND_SIZE;
  }
  return { hands, boneyard: shuffled.slice(offset) };
}

export function createMatch(mode: MatchMode, targetScore: number, playerOrder: PlayerId[]): MatchState {
  const dealt = dealHands(playerOrder);
  const scores: Record<PlayerId, number> = {};
  for (const player of playerOrder) scores[player] = 0;
  const starter = playerOrder[Math.floor(Math.random() * playerOrder.length)];
  return {
    mode,
    targetScore,
    playerOrder,
    hands: dealt.hands,
    scores,
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
  const dealt = dealHands(state.playerOrder);
  const starter = state.lastRoundResult?.winnerId ?? state.roundStarter;
  return {
    ...state,
    hands: dealt.hands,
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
  let drewAny = false;
  while (!canPlay(hand, state.board) && boneyard.length > 0) {
    hand = [...hand, boneyard[0]];
    boneyard = boneyard.slice(1);
    drewAny = true;
  }
  if (!drewAny) return state;
  return { ...state, hands: { ...state.hands, [player]: hand }, boneyard };
}

function pipTotal(state: MatchState, player: PlayerId): number {
  return pipSum(state.hands[player]);
}

function finishRound(state: MatchState, winnerId: PlayerId, reason: RoundResult["reason"]): MatchState {
  const pointsAwarded = state.playerOrder
    .filter((id) => id !== winnerId)
    .reduce((sum, id) => sum + pipTotal(state, id), 0);
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
  return { ...next, currentTurn: nextPlayer(state.playerOrder, player) };
}

export function passTurn(state: MatchState): MatchState {
  if (state.status !== "playing") return state;

  if (state.boneyard.length === 0) {
    const anyoneCanPlay = state.playerOrder.some((id) => canPlay(state.hands[id], state.board));
    if (!anyoneCanPlay) {
      const pipTotals = new Map(state.playerOrder.map((id) => [id, pipTotal(state, id)] as const));
      const lowest = Math.min(...pipTotals.values());
      const tied = state.playerOrder.filter((id) => pipTotals.get(id) === lowest);
      const winnerId = tied.length === 1 ? tied[0] : pickClosestAfter(state.playerOrder, state.roundStarter, tied);
      return finishRound(state, winnerId, "blocked");
    }
  }

  return { ...state, currentTurn: nextPlayer(state.playerOrder, state.currentTurn) };
}
```

- [ ] **Step 2: 타입 체크**

Run: `npx tsc -b` (PATH 설정 후)
Expected: `match.test.ts`에서 `createMatch` 호출부(3번째 인자 타입 불일치) 에러 발생 — 다음 태스크에서 고침.

---

### Task 3: `match.test.ts`를 새 시그니처 + N인 케이스로 갱신

**Files:**
- Modify: `src/games/domino/engine/match.test.ts`

**Interfaces:**
- Consumes: `HUMAN_ID`, `aiId`, `nextPlayer`, `createMatch`, `passTurn`, `playMove`, `resolveDrawPhase`, `startNextRound` from `./match` (Task 2)

- [ ] **Step 1: 상단 import와 `makeState`에 `playerOrder` 기본값 추가**

파일 최상단 import를 아래로 교체:

```ts
import { describe, expect, it } from "vitest";
import { createEmptyBoard } from "./board";
import { createMatch, nextPlayer, passTurn, playMove, resolveDrawPhase, startNextRound } from "./match";
import type { MatchState, PlayerId } from "./types";
```

`makeState` 함수의 반환 객체에 `playerOrder: ["human", "ai"],`를 `targetScore: 100,` 바로 다음 줄에 추가한다(기존 필드는 그대로 유지 — `hands`/`scores`가 이미 `{human, ai}` 2개 키이므로 기본값과 일치).

- [ ] **Step 2: `createMatch` describe 블록을 아래로 교체**

기존 `describe("createMatch", () => { it("각자 7장씩...) => {...} });` 블록 전체를 아래로 교체:

```ts
describe("createMatch", () => {
  it("2인: 각자 7장씩 분배하고 나머지 14장은 보유고에 둔다", () => {
    const order: PlayerId[] = ["human", "ai-1"];
    const match = createMatch("single-round", 100, order);
    expect(match.hands.human).toHaveLength(7);
    expect(match.hands["ai-1"]).toHaveLength(7);
    expect(match.boneyard).toHaveLength(14);
    expect(match.scores).toEqual({ human: 0, "ai-1": 0 });
    expect(match.status).toBe("playing");
    expect(order).toContain(match.currentTurn);
    expect(match.playerOrder).toEqual(order);
  });

  it("3인: 각자 7장씩 분배하고 나머지 7장은 보유고에 둔다", () => {
    const order: PlayerId[] = ["human", "ai-1", "ai-2"];
    const match = createMatch("target-score", 100, order);
    for (const id of order) expect(match.hands[id]).toHaveLength(7);
    expect(match.boneyard).toHaveLength(7);
  });

  it("4인: 각자 7장씩 분배하면 28장 전부 나가서 보유고가 비어있다", () => {
    const order: PlayerId[] = ["human", "ai-1", "ai-2", "ai-3"];
    const match = createMatch("target-score", 100, order);
    for (const id of order) expect(match.hands[id]).toHaveLength(7);
    expect(match.boneyard).toHaveLength(0);
  });
});

describe("nextPlayer", () => {
  it("순서상 다음 사람을 반환한다", () => {
    const order = ["human", "ai-1", "ai-2"];
    expect(nextPlayer(order, "human")).toBe("ai-1");
    expect(nextPlayer(order, "ai-1")).toBe("ai-2");
  });

  it("마지막 사람 다음은 처음 사람으로 순환한다", () => {
    const order = ["human", "ai-1", "ai-2"];
    expect(nextPlayer(order, "ai-2")).toBe("human");
  });
});
```

- [ ] **Step 3: `playMove` describe 블록에 3인 케이스 2개 추가**

기존 `describe("playMove", () => { ... });` 블록의 마지막 `it(...)` 다음, 블록을 닫는 `});` **바로 앞**에 아래 두 테스트를 추가한다:

```ts
  it("3인 이상에서는 라운드 승자가 나머지 전원의 핀 합을 받는다", () => {
    const state = makeState({
      mode: "target-score",
      playerOrder: ["human", "ai-1", "ai-2"],
      hands: {
        human: [{ a: 1, b: 2 }],
        "ai-1": [{ a: 0, b: 0 }, { a: 3, b: 4 }],
        "ai-2": [{ a: 5, b: 5 }],
      },
      scores: { human: 0, "ai-1": 0, "ai-2": 0 },
      board: { chain: [{ tile: { a: 2, b: 5 }, flipped: false }], leftEnd: 2, rightEnd: 5 },
      currentTurn: "human",
    });
    const result = playMove(state, { tile: { a: 1, b: 2 }, end: "left" });
    expect(result.status).toBe("round-over");
    expect(result.lastRoundResult).toEqual({ winnerId: "human", reason: "emptied-hand", pointsAwarded: 17 });
    expect(result.scores.human).toBe(17);
  });

  it("손패가 남아있으면 순서상 다음 사람에게 턴이 넘어간다 (3인)", () => {
    const state = makeState({
      playerOrder: ["human", "ai-1", "ai-2"],
      hands: { human: [{ a: 1, b: 2 }, { a: 4, b: 4 }], "ai-1": [], "ai-2": [] },
      board: { chain: [{ tile: { a: 2, b: 5 }, flipped: false }], leftEnd: 2, rightEnd: 5 },
      currentTurn: "human",
    });
    const result = playMove(state, { tile: { a: 1, b: 2 }, end: "left" });
    expect(result.currentTurn).toBe("ai-1");
  });
```

- [ ] **Step 4: `passTurn` describe 블록에 3인 블록 타이브레이크 케이스 추가**

`describe("passTurn", ...)` 블록의 마지막 `it(...)` 다음, 닫는 `});` 바로 앞에 추가:

```ts
  it("3인 블록 상황에서 시작자 다음 순서로 동점을 해소한다", () => {
    const state = makeState({
      playerOrder: ["human", "ai-1", "ai-2"],
      hands: {
        human: [{ a: 0, b: 1 }],
        "ai-1": [{ a: 0, b: 1 }],
        "ai-2": [{ a: 6, b: 6 }],
      },
      scores: { human: 0, "ai-1": 0, "ai-2": 0 },
      board: { chain: [{ tile: { a: 3, b: 4 }, flipped: false }], leftEnd: 3, rightEnd: 4 },
      boneyard: [],
      currentTurn: "human",
      roundStarter: "human",
    });
    const result = passTurn(state);
    expect(result.status).toBe("round-over");
    expect(result.lastRoundResult?.winnerId).toBe("ai-1");
    expect(result.scores["ai-1"]).toBe(13);
  });
```

- [ ] **Step 5: `startNextRound` describe 블록에 3인 케이스 추가**

`describe("startNextRound", ...)` 블록의 `it(...)` 다음, 닫는 `});` 바로 앞에 추가:

```ts
  it("이전 라운드 승자부터 다음 라운드를 시작하고 점수는 유지한다 (3인)", () => {
    const state = makeState({
      playerOrder: ["human", "ai-1", "ai-2"],
      scores: { human: 10, "ai-1": 3, "ai-2": 0 },
      status: "round-over",
      lastRoundResult: { winnerId: "ai-1", reason: "blocked", pointsAwarded: 3 },
      roundStarter: "human",
    });
    const result = startNextRound(state);
    expect(result.status).toBe("playing");
    expect(result.currentTurn).toBe("ai-1");
    expect(result.roundStarter).toBe("ai-1");
    expect(result.scores).toEqual({ human: 10, "ai-1": 3, "ai-2": 0 });
    expect(result.hands.human).toHaveLength(7);
    expect(result.hands["ai-1"]).toHaveLength(7);
    expect(result.hands["ai-2"]).toHaveLength(7);
    expect(result.boneyard).toHaveLength(7);
  });
```

- [ ] **Step 6: 타입 체크 + 전체 테스트 실행**

Run:
```powershell
$env:PATH = "C:\Program Files\nodejs;" + $env:PATH
npx tsc -b
npm test
```
Expected: 둘 다 에러 없이 통과. 기존 2인 테스트(회귀) + 신규 N인 테스트 전부 PASS.

- [ ] **Step 7: Commit**

```bash
git add src/games/domino/engine/types.ts src/games/domino/engine/match.ts src/games/domino/engine/match.test.ts
git commit -m "feat(domino): generalize match engine to 2-4 players"
```

---

### Task 4: AI 난이도(쉬움/보통/어려움) 추가

**Files:**
- Modify: `src/games/domino/engine/ai.ts`
- Modify: `src/games/domino/engine/ai.test.ts`

**Interfaces:**
- Consumes: `getValidMoves`, `applyMove` from `./board`; `BoardState`, `Move`, `Tile` from `./types`
- Produces: `AiDifficulty = "easy" | "medium" | "hard"`, `chooseAiMove(hand: Tile[], board: BoardState, difficulty?: AiDifficulty): Move | null`(난이도 파라미터 추가, 기본값 `"easy"`로 기존 호출부 호환)

- [ ] **Step 1: 실패하는 테스트 추가**

`src/games/domino/engine/ai.test.ts`의 기존 내용 끝에 아래 두 describe 블록을 추가한다:

```ts
describe("chooseAiMove (medium)", () => {
  it("핀 합이 가장 큰 유효 수를 고른다", () => {
    const board = { chain: [{ tile: { a: 1, b: 2 }, flipped: false }], leftEnd: 1, rightEnd: 2 };
    const hand = [{ a: 1, b: 1 }, { a: 2, b: 6 }];
    const move = chooseAiMove(hand, board, "medium");
    expect(move).toEqual({ tile: { a: 2, b: 6 }, end: "right" });
  });
});

describe("chooseAiMove (hard)", () => {
  it("상대가 이어받기 가장 어려운(공개 정보상 희소한) 쪽을 남기는 수를 고른다", () => {
    const board = { chain: [{ tile: { a: 1, b: 2 }, flipped: false }], leftEnd: 1, rightEnd: 2 };
    const hand = [{ a: 1, b: 1 }, { a: 2, b: 5 }];
    const move = chooseAiMove(hand, board, "hard");
    expect(move).toEqual({ tile: { a: 1, b: 1 }, end: "left" });
  });
});
```

- [ ] **Step 2: 테스트 실행해서 실패 확인**

Run: `npx vitest run src/games/domino/engine/ai.test.ts`
Expected: FAIL — `chooseAiMove`가 3번째 인자(난이도)를 무시하고 항상 무작위로 고르므로 두 새 테스트가 간헐적으로(또는 확정적으로, 구현에 따라) 실패한다.

- [ ] **Step 3: `ai.ts`를 아래로 교체**

```ts
import { applyMove, getValidMoves } from "./board";
import type { BoardState, Move, Tile } from "./types";

export type AiDifficulty = "easy" | "medium" | "hard";

const TOTAL_TILES_PER_VALUE = 7;

function pickRandom(moves: Move[]): Move {
  return moves[Math.floor(Math.random() * moves.length)];
}

function tilePipSum(tile: Tile): number {
  return tile.a + tile.b;
}

function pickHighestPipSum(moves: Move[]): Move {
  const maxSum = Math.max(...moves.map((m) => tilePipSum(m.tile)));
  const best = moves.filter((m) => tilePipSum(m.tile) === maxSum);
  return pickRandom(best);
}

function countOccurrences(value: number, tiles: Tile[]): number {
  return tiles.filter((t) => t.a === value || t.b === value).length;
}

function remainingUnseen(value: number, hand: Tile[], board: BoardState): number {
  const boardTiles = board.chain.map((p) => p.tile);
  return TOTAL_TILES_PER_VALUE - countOccurrences(value, hand) - countOccurrences(value, boardTiles);
}

function pickMostBlocking(moves: Move[], hand: Tile[], board: BoardState): Move {
  const scored = moves.map((move) => {
    const resultBoard = applyMove(board, move);
    const remainingHand = hand.filter((t) => !(t.a === move.tile.a && t.b === move.tile.b));
    const leftScore =
      resultBoard.leftEnd === null ? 0 : remainingUnseen(resultBoard.leftEnd, remainingHand, resultBoard);
    const rightScore =
      resultBoard.rightEnd === null ? 0 : remainingUnseen(resultBoard.rightEnd, remainingHand, resultBoard);
    return { move, score: leftScore + rightScore };
  });
  const minScore = Math.min(...scored.map((s) => s.score));
  const best = scored.filter((s) => s.score === minScore).map((s) => s.move);
  return pickRandom(best);
}

export function chooseAiMove(hand: Tile[], board: BoardState, difficulty: AiDifficulty = "easy"): Move | null {
  const moves = getValidMoves(hand, board);
  if (moves.length === 0) return null;
  if (difficulty === "medium") return pickHighestPipSum(moves);
  if (difficulty === "hard") return pickMostBlocking(moves, hand, board);
  return pickRandom(moves);
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npx vitest run src/games/domino/engine/ai.test.ts`
Expected: PASS (기존 3개 + 신규 2개 = 5개 전부)

- [ ] **Step 5: 타입 체크 + 전체 테스트**

Run:
```powershell
npx tsc -b
npm test
```
Expected: 둘 다 통과.

- [ ] **Step 6: Commit**

```bash
git add src/games/domino/engine/ai.ts src/games/domino/engine/ai.test.ts
git commit -m "feat(domino): add medium/hard AI difficulty heuristics"
```

---

### Task 5: 시작 화면에 인원수/난이도 선택 추가

**Files:**
- Modify: `src/games/domino/DominoMenu.tsx`

**Interfaces:**
- Consumes: `AiDifficulty` from `./engine/ai`
- Produces: `DominoMenuProps.onStart: (mode: MatchMode, targetScore: number, playerCount: number, difficulty: AiDifficulty) => void`(시그니처 변경)

- [ ] **Step 1: import와 props 타입 수정**

`DominoMenu.tsx` 상단 import를 아래로 교체:

```tsx
import { useState, type CSSProperties } from "react";
import type { AiDifficulty } from "./engine/ai";
import type { MatchMode } from "./engine/types";
import "./DominoMenu.css";

interface DominoMenuProps {
  onStart: (mode: MatchMode, targetScore: number, playerCount: number, difficulty: AiDifficulty) => void;
}

const DEFAULT_TARGET_SCORE = 100;
const WING_FEATHER_COUNT = 6;
const PLAYER_COUNT_OPTIONS = [2, 3, 4] as const;
const DIFFICULTY_OPTIONS: { value: AiDifficulty; label: string }[] = [
  { value: "easy", label: "쉬움" },
  { value: "medium", label: "보통" },
  { value: "hard", label: "어려움" },
];
```

- [ ] **Step 2: 상태와 필드 추가**

`export function DominoMenu({ onStart }: DominoMenuProps) {` 함수 본문 상단에 상태 2개 추가:

```tsx
  const [mode, setMode] = useState<MatchMode>("target-score");
  const [targetScore, setTargetScore] = useState(DEFAULT_TARGET_SCORE);
  const [playerCount, setPlayerCount] = useState<number>(4);
  const [difficulty, setDifficulty] = useState<AiDifficulty>("medium");
```

`<div className="domino-menu__field">` (종료 방식 필드) **바로 앞**에 인원수 필드를 추가:

```tsx
        <div className="domino-menu__field">
          <span className="domino-menu__label">인원수</span>
          <div className="domino-menu__options">
            {PLAYER_COUNT_OPTIONS.map((count) => (
              <label
                key={count}
                className={
                  playerCount === count
                    ? "domino-menu__option domino-menu__option--active"
                    : "domino-menu__option"
                }
              >
                <input
                  type="radio"
                  name="playerCount"
                  checked={playerCount === count}
                  onChange={() => setPlayerCount(count)}
                />
                {count}명
              </label>
            ))}
          </div>
        </div>

        <div className="domino-menu__field">
          <span className="domino-menu__label">난이도</span>
          <div className="domino-menu__options">
            {DIFFICULTY_OPTIONS.map(({ value, label }) => (
              <label
                key={value}
                className={
                  difficulty === value
                    ? "domino-menu__option domino-menu__option--active"
                    : "domino-menu__option"
                }
              >
                <input
                  type="radio"
                  name="difficulty"
                  checked={difficulty === value}
                  onChange={() => setDifficulty(value)}
                />
                {label}
              </label>
            ))}
          </div>
        </div>
```

- [ ] **Step 3: 시작 버튼 핸들러 수정**

```tsx
        <button className="domino-menu__start" onClick={() => onStart(mode, targetScore, playerCount, difficulty)}>
```

- [ ] **Step 4: 타입 체크**

Run: `npx tsc -b` (PATH 설정 후)
Expected: `Domino.tsx`에서 `onStart={startMatch}` 시그니처 불일치 에러 발생 — 다음 태스크에서 고침.

---

### Task 6: `Domino.tsx`를 N인 렌더링 + 난이도 반영으로 갱신

**Files:**
- Modify: `src/games/domino/Domino.tsx`
- Modify: `src/games/domino/Domino.css`

**Interfaces:**
- Consumes: `HUMAN_ID`, `aiId` from `./engine/match`; `AiDifficulty` from `./engine/ai`

- [ ] **Step 1: `Domino.tsx` 전체를 아래로 교체**

```tsx
import { useCallback, useEffect, useState } from "react";
import { GameShell } from "../../components/GameShell";
import { useHighScore } from "../../hooks/useHighScore";
import { DominoMenu } from "./DominoMenu";
import { DominoTile } from "./DominoTile";
import { canPlay, getValidMoves } from "./engine/board";
import { chooseAiMove, type AiDifficulty } from "./engine/ai";
import { HUMAN_ID, aiId, createMatch, passTurn, playMove, resolveDrawPhase, startNextRound } from "./engine/match";
import type { BoardEnd, MatchMode, MatchState, PlayerId, Tile } from "./engine/types";
import "./Domino.css";

const AI_MOVE_DELAY_MS = 500;

function playerLabel(id: PlayerId): string {
  if (id === HUMAN_ID) return "나";
  const [, n] = id.split("-");
  return `AI ${n}`;
}

export function Domino() {
  const [match, setMatch] = useState<MatchState | null>(null);
  const [difficulty, setDifficulty] = useState<AiDifficulty>("medium");
  const [pendingTile, setPendingTile] = useState<Tile | null>(null);
  const [highScore, submitScore] = useHighScore("domino");

  const startMatch = useCallback(
    (mode: MatchMode, targetScore: number, playerCount: number, chosenDifficulty: AiDifficulty) => {
      const playerOrder: PlayerId[] = [
        HUMAN_ID,
        ...Array.from({ length: playerCount - 1 }, (_, i) => aiId(i + 1)),
      ];
      setDifficulty(chosenDifficulty);
      setMatch(createMatch(mode, targetScore, playerOrder));
      setPendingTile(null);
    },
    []
  );

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

    if (match.currentTurn !== HUMAN_ID) {
      const timer = setTimeout(() => {
        setMatch((current) => {
          if (!current || current.status !== "playing" || current.currentTurn === HUMAN_ID) return current;
          const move = chooseAiMove(current.hands[current.currentTurn], current.board, difficulty);
          return move ? playMove(current, move) : current;
        });
      }, AI_MOVE_DELAY_MS);
      return () => clearTimeout(timer);
    }
  }, [match, difficulty]);

  useEffect(() => {
    if (match?.status === "match-over") {
      submitScore(match.scores[HUMAN_ID]);
    }
  }, [match?.status, match?.scores, submitScore]);

  const handleTileClick = useCallback(
    (tile: Tile) => {
      if (!match || match.status !== "playing" || match.currentTurn !== HUMAN_ID) return;
      const moves = getValidMoves(match.hands[HUMAN_ID], match.board).filter(
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
    match.status === "playing" && match.currentTurn === HUMAN_ID
      ? getValidMoves(match.hands[HUMAN_ID], match.board).map((m) => `${m.tile.a}-${m.tile.b}`)
      : []
  );
  const opponents = match.playerOrder.filter((id) => id !== HUMAN_ID);

  return (
    <GameShell
      title="도미노"
      accentVar="--accent-domino"
      score={match.scores[HUMAN_ID]}
      highScore={highScore}
      controlsHint="손패에서 타일을 클릭해 보드 양 끝에 맞춰 놓으세요"
    >
      <div className="domino-board">
        <div className="domino-status-bar">
          <span>턴: {playerLabel(match.currentTurn)}</span>
          <span>보유고 {match.boneyard.length}장</span>
          <span className="domino-status-bar__scores">
            {match.playerOrder.map((id) => (
              <span key={id}>
                {playerLabel(id)} {match.scores[id]}
              </span>
            ))}
          </span>
        </div>

        <div className="domino-opponents">
          {opponents.map((id) => (
            <div
              key={id}
              className={
                match.currentTurn === id ? "domino-opponent domino-opponent--active" : "domino-opponent"
              }
            >
              <span className="domino-opponent__label">{playerLabel(id)}</span>
              <div className="domino-opponent__hand">
                {match.hands[id].map((_, i) => (
                  <DominoTile key={i} tile={{ a: 0, b: 0 }} faceDown />
                ))}
              </div>
            </div>
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
          {match.hands[HUMAN_ID].map((tile, i) => (
            <button
              key={i}
              className="domino-human-hand__slot"
              onClick={() => handleTileClick(tile)}
              disabled={match.currentTurn !== HUMAN_ID || !humanValidTileKeys.has(`${tile.a}-${tile.b}`)}
            >
              <DominoTile tile={tile} />
            </button>
          ))}
        </div>

        {match.status === "round-over" && match.lastRoundResult && (
          <div className="domino-round-end">
            <p>
              {playerLabel(match.lastRoundResult.winnerId)}가 이번 라운드 승리! (+
              {match.lastRoundResult.pointsAwarded}점)
            </p>
            <button onClick={() => setMatch(startNextRound(match))}>다음 라운드</button>
          </div>
        )}

        {match.status === "match-over" && (
          <div className="domino-match-end">
            <p>{playerLabel(match.matchWinnerId ?? HUMAN_ID)}가 매치에서 승리했습니다!</p>
            <button onClick={() => setMatch(null)}>메뉴로 돌아가기</button>
          </div>
        )}
      </div>
    </GameShell>
  );
}
```

- [ ] **Step 2: `Domino.css`에 상대방 여러 명 표시용 스타일 추가**

`.domino-ai-hand { ... }` 블록 전체를 찾아 아래로 **교체**한다(더 이상 단일 AI 손패가 아니라 여러 명이므로):

```css
.domino-opponents {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-4);
  justify-content: center;
}

.domino-opponent {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: var(--space-2);
  border-radius: var(--radius-card);
}

.domino-opponent--active {
  background: var(--bg-panel-raised);
  box-shadow: inset 0 0 0 1px var(--accent-domino);
}

.domino-opponent__label {
  font-family: var(--font-mono);
  font-size: 0.75rem;
  color: var(--text-muted);
}

.domino-opponent__hand {
  display: flex;
  gap: 4px;
}
```

`.domino-status-bar__scores` 규칙을 `.domino-status-bar` 블록 뒤에 추가:

```css
.domino-status-bar__scores {
  display: flex;
  gap: var(--space-2);
  flex-wrap: wrap;
}
```

- [ ] **Step 3: 타입 체크 + 린트 + 전체 테스트**

Run:
```powershell
$env:PATH = "C:\Program Files\nodejs;" + $env:PATH
npx tsc -b
npx oxlint
npm test
```
Expected: 셋 다 에러 없이 통과.

- [ ] **Step 4: `npm run build`**

Run: `npm run build`
Expected: 정상 빌드 완료.

- [ ] **Step 5: 브라우저 수동 확인**

Run: `npm run dev`, `http://localhost:5173/domino` 접속.

확인할 것:
1. 시작 화면에서 인원수(2/3/4)와 난이도(쉬움/보통/어려움) 선택 가능.
2. 3명, 4명 선택 시 AI 손패가 각각 라벨과 함께 여러 클러스터로 보이고, 현재 턴인 AI가
   하이라이트된다.
3. 4명 선택 시 보유고가 0장으로 표시되고, 아무도 못 내면 즉시 블록 판정이 난다.
4. 난이도를 "어려움"으로 선택하면 AI가 매번 무작위가 아니라 일관되게 상대가 이어받기
   어려운 쪽을 선택하는 경향이 보인다(완벽한 검증은 아니지만 눈으로 체감 확인).
5. 라운드/매치 종료 메시지에 올바른 참가자 라벨(나/AI 1/AI 2/AI 3)이 표시된다.
6. 2인 기본 플레이가 기존과 동일하게 동작한다(회귀 확인).

- [ ] **Step 6: Commit**

```bash
git add src/games/domino/DominoMenu.tsx src/games/domino/Domino.tsx src/games/domino/Domino.css
git commit -m "feat(domino): support 2-4 players and AI difficulty in menu and gameplay UI"
```

---

## Self-Review 결과

- **스펙 커버리지**: 설계 문서(`2026-07-08-domino-nplayer-design.md`)의 모든 항목(PlayerId
  일반화, playerOrder, nextPlayer, N인 분배/점수/블록 타이브레이크, 무작위 시작자, AI
  난이도 3단계, 메뉴/플레이 화면 UI 변경, 테스트 갱신)이 Task 1~6에서 다뤄진다.
- **Placeholder 스캔**: 없음. 모든 스텝에 실행 가능한 전체 코드 포함.
- **타입 일관성**: `PlayerId`, `MatchState.playerOrder`, `HUMAN_ID`, `aiId`, `nextPlayer`,
  `AiDifficulty`의 이름과 시그니처가 Task 2~6에서 정의된 그대로 일관되게 재사용됨을
  확인했다. `createMatch`만 시그니처가 바뀌었고 그 호출부(Task 6의 `startMatch`)도 새
  시그니처에 맞춰 작성했다.
