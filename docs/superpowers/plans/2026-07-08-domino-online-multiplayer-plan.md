# 도미노 온라인 멀티플레이 + 랭킹 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 도미노에 온라인 멀티플레이(최대 4인, Firebase Realtime Database)와 온라인 매치 기준 글로벌 랭킹을 추가한다. 시작 손패는 완전 비공개, 보유고는 기존 합의된 캐주얼 타협 유지.

**Architecture:** 상태를 **공개**(보드/보유고/손패개수/핀합계/점수/턴 — 참가자 전원 읽기 가능)와 **비공개**(실제 손패 — 본인만 읽기 가능)로 분리한다. 공개 상태 전용 순수 함수(`engine/publicMatch.ts`)를 새로 만들어 기존 로컬 엔진과 별개로 유닛 테스트한다. Firebase 쪽 코드(`multiplayer/`)는 이 순수 함수들을 호출해 트랜잭션으로 쓰기만 담당 — 실제 게임 판정 로직은 전부 프레임워크/백엔드 독립적인 순수 함수에 있다.

**Tech Stack:** 기존 스택 + `firebase`(Realtime Database, Anonymous Auth) npm 패키지.

**참조 문서:** `docs/superpowers/specs/2026-07-08-domino-online-multiplayer-design.md`

## Global Constraints

- Node: `$env:PATH = "C:\Program Files\nodejs;" + $env:PATH` (64비트 Node, 이제 이걸로 `npm test`/`npm run dev`/`npm run build` 전부 정상 동작).
- TypeScript strict, `verbatimModuleSyntax: true`, `any`/`@ts-ignore` 금지.
- **이 작업자는 실제 Firebase 프로젝트를 만들 수 없다.** `multiplayer/` 아래 코드는 `tsc -b`/`oxlint`로 타입/구문만 검증하고, 실제 방 생성→참가→플레이 종단간 테스트는 사용자가 Firebase 프로젝트 설정 후 직접 확인해야 한다. 반면 `engine/publicMatch.ts`는 Firebase와 무관한 순수 함수라 전부 `vitest`로 검증한다.
- **설계 문서 대비 스키마 소소한 정리**: 설계 문서 초안의 `rooms/{roomId}/status` 필드는 이번 계획에서 제거하고, `rooms/{roomId}/public`이 `null`이면 "대기실", 아니면 `public.status`(`playing`/`round-over`/`match-over`)가 진행 상태를 그대로 나타내도록 단순화한다(같은 정보를 두 곳에 중복 저장하지 않기 위함). 아래 보안 규칙과 코드는 이 단순화된 스키마 기준으로 작성한다.
- 다른 게임 폴더(`game2048`, `appleGame`, `tetris`), `App.tsx`, `GameShell.tsx`, `useHighScore.ts`는 수정하지 않는다.

---

## File Structure

```
신규:
  src/games/domino/engine/publicMatch.ts
  src/games/domino/engine/publicMatch.test.ts
  src/games/domino/multiplayer/firebase.ts
  src/games/domino/multiplayer/types.ts
  src/games/domino/multiplayer/room.ts
  src/games/domino/DominoErrorBoundary.tsx
  src/games/domino/DominoOnlineSetup.tsx
  src/games/domino/DominoOnlineSetup.css
  src/games/domino/DominoLobby.tsx
  src/games/domino/DominoLobby.css
  src/games/domino/DominoLeaderboard.tsx
  src/games/domino/DominoLeaderboard.css
  src/games/domino/DominoLocalGame.tsx      # 기존 Domino.tsx의 로컬 플레이 부분을 그대로 이전
  src/games/domino/DominoOnlineGame.tsx
  src/vite-env.d.ts
  database.rules.json
  .env.example

수정:
  src/games/domino/Domino.tsx                # 화면 상태머신으로 축소 (라우팅만 담당)
  src/games/domino/index.ts                   # Component를 DominoErrorBoundary로 감싸기
  package.json                                  # firebase 의존성 추가
  .gitignore                                     # .env 제외 확인/추가
  README.md                                       # Firebase 설정 안내 절 추가
```

---

### Task 1: `pickClosestAfter`를 `match.ts`에서 export

**Files:**
- Modify: `src/games/domino/engine/match.ts`

**Interfaces:**
- Produces: `pickClosestAfter(order: PlayerId[], starter: PlayerId, candidates: PlayerId[]): PlayerId`(기존 비공개 함수를 export로 변경 — 시그니처/로직 변경 없음)

- [ ] **Step 1: `function pickClosestAfter`를 `export function pickClosestAfter`로 변경**

`match.ts`에서 다음 줄:
```ts
function pickClosestAfter(order: PlayerId[], starter: PlayerId, candidates: PlayerId[]): PlayerId {
```
을 아래로 교체:
```ts
export function pickClosestAfter(order: PlayerId[], starter: PlayerId, candidates: PlayerId[]): PlayerId {
```

- [ ] **Step 2: 타입 체크 + 기존 테스트 확인**

Run:
```powershell
$env:PATH = "C:\Program Files\nodejs;" + $env:PATH
npx tsc -b
npm test
```
Expected: 둘 다 그대로 통과(순수 export 추가라 동작 변화 없음).

- [ ] **Step 3: Commit**

```bash
git add src/games/domino/engine/match.ts
git commit -m "refactor(domino): export pickClosestAfter for reuse in public match state"
```

---

### Task 2: 공개 상태 전용 순수 엔진 (`engine/publicMatch.ts`)

**Files:**
- Create: `src/games/domino/engine/publicMatch.ts`
- Create: `src/games/domino/engine/publicMatch.test.ts`

**Interfaces:**
- Consumes: `applyMove` from `./board`; `nextPlayer`, `pickClosestAfter` from `./match`; `BoardState`, `MatchMode`, `Move`, `PlayerId`, `RoundResult`, `Tile` from `./types`
- Produces: `PublicMatchState` 타입, `createPublicMatch`, `startNextPublicRound`, `applyPublicPlay`, `applyPublicDrawMany`, `applyPublicPass`

- [ ] **Step 1: 실패하는 테스트 작성**

`src/games/domino/engine/publicMatch.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import {
  applyPublicDrawMany,
  applyPublicPass,
  applyPublicPlay,
  createPublicMatch,
  startNextPublicRound,
} from "./publicMatch";

const ORDER = ["p1", "p2", "p3"];

function makeHands() {
  return {
    p1: [{ a: 1, b: 2 }],
    p2: [{ a: 0, b: 0 }, { a: 3, b: 4 }],
    p3: [{ a: 5, b: 5 }],
  };
}

describe("createPublicMatch", () => {
  it("손패 개수와 핀 합만 공개 상태로 만든다(실제 타일은 없음)", () => {
    const state = createPublicMatch("target-score", 100, ORDER, makeHands(), [{ a: 6, b: 6 }], "p1");
    expect(state.handCounts).toEqual({ p1: 1, p2: 2, p3: 1 });
    expect(state.pipSums).toEqual({ p1: 3, p2: 7, p3: 10 });
    expect(state.scores).toEqual({ p1: 0, p2: 0, p3: 0 });
    expect(state.currentTurn).toBe("p1");
    expect(state.status).toBe("playing");
    expect(state.passStreak).toBe(0);
  });
});

describe("applyPublicPlay", () => {
  it("마지막 타일을 내면 라운드가 끝나고 나머지 전원의 핀 합을 받는다", () => {
    const state = createPublicMatch("target-score", 100, ORDER, makeHands(), [], "p1");
    const boarded = {
      ...state,
      board: { chain: [{ tile: { a: 2, b: 5 }, flipped: false }], leftEnd: 2, rightEnd: 5 },
    };
    const result = applyPublicPlay(boarded, { tile: { a: 1, b: 2 }, end: "left" });
    expect(result.handCounts.p1).toBe(0);
    expect(result.pipSums.p1).toBe(0);
    expect(result.status).toBe("round-over");
    expect(result.lastRoundResult).toEqual({ winnerId: "p1", reason: "emptied-hand", pointsAwarded: 17 });
  });

  it("손패가 남으면 다음 사람에게 턴이 넘어가고 passStreak가 0으로 초기화된다", () => {
    const hands = { p1: [{ a: 1, b: 2 }, { a: 4, b: 4 }], p2: [{ a: 0, b: 0 }], p3: [{ a: 5, b: 5 }] };
    const state = createPublicMatch("target-score", 100, ORDER, hands, [], "p1");
    const boarded = {
      ...state,
      board: { chain: [{ tile: { a: 2, b: 5 }, flipped: false }], leftEnd: 2, rightEnd: 5 },
      passStreak: 2,
    };
    const result = applyPublicPlay(boarded, { tile: { a: 1, b: 2 }, end: "left" });
    expect(result.currentTurn).toBe("p2");
    expect(result.handCounts.p1).toBe(1);
    expect(result.passStreak).toBe(0);
  });
});

describe("applyPublicDrawMany", () => {
  it("보유고에서 뽑은 만큼 손패 개수/핀 합이 늘고 보유고가 줄어든다", () => {
    const state = createPublicMatch(
      "target-score",
      100,
      ORDER,
      makeHands(),
      [{ a: 6, b: 6 }, { a: 0, b: 1 }],
      "p1"
    );
    const result = applyPublicDrawMany(state, [{ a: 6, b: 6 }, { a: 0, b: 1 }]);
    expect(result.handCounts.p1).toBe(3);
    expect(result.pipSums.p1).toBe(16);
    expect(result.boneyard).toEqual([]);
  });
});

describe("applyPublicPass", () => {
  it("보유고가 남아있으면 턴만 넘기고 passStreak를 늘린다", () => {
    const state = createPublicMatch("target-score", 100, ORDER, makeHands(), [{ a: 6, b: 6 }], "p1");
    const result = applyPublicPass(state);
    expect(result.currentTurn).toBe("p2");
    expect(result.passStreak).toBe(1);
    expect(result.status).toBe("playing");
  });

  it("보유고가 비고 전원(3인)이 연속으로 패스하면 블록 판정한다", () => {
    const state = createPublicMatch("target-score", 100, ORDER, makeHands(), [], "p1");
    const afterFirst = applyPublicPass(state);
    const afterSecond = applyPublicPass(afterFirst);
    const afterThird = applyPublicPass(afterSecond);
    expect(afterThird.status).toBe("round-over");
    expect(afterThird.lastRoundResult?.winnerId).toBe("p1");
    expect(afterThird.lastRoundResult?.reason).toBe("blocked");
  });
});

describe("startNextPublicRound", () => {
  it("점수는 유지한 채 손패/보드/턴을 재설정한다", () => {
    const state = createPublicMatch("target-score", 100, ORDER, makeHands(), [], "p1");
    const withScore = {
      ...state,
      scores: { p1: 10, p2: 3, p3: 0 },
      status: "round-over" as const,
      lastRoundResult: { winnerId: "p2", reason: "blocked" as const, pointsAwarded: 3 },
    };
    const newHands = { p1: [{ a: 1, b: 1 }], p2: [{ a: 2, b: 2 }], p3: [{ a: 3, b: 3 }] };
    const result = startNextPublicRound(withScore, newHands, [{ a: 6, b: 6 }]);
    expect(result.status).toBe("playing");
    expect(result.currentTurn).toBe("p2");
    expect(result.scores).toEqual({ p1: 10, p2: 3, p3: 0 });
    expect(result.handCounts).toEqual({ p1: 1, p2: 1, p3: 1 });
    expect(result.passStreak).toBe(0);
  });
});
```

- [ ] **Step 2: 테스트 실행해서 실패 확인**

Run: `npx vitest run src/games/domino/engine/publicMatch.test.ts`
Expected: FAIL — `Cannot find module './publicMatch'`

- [ ] **Step 3: `publicMatch.ts` 구현**

`src/games/domino/engine/publicMatch.ts`:

```ts
import { applyMove } from "./board";
import { nextPlayer, pickClosestAfter } from "./match";
import type { BoardState, MatchMode, Move, PlayerId, RoundResult, Tile } from "./types";

export interface PublicMatchState {
  mode: MatchMode;
  targetScore: number;
  playerOrder: PlayerId[];
  board: BoardState;
  boneyard: Tile[];
  handCounts: Record<PlayerId, number>;
  pipSums: Record<PlayerId, number>;
  scores: Record<PlayerId, number>;
  currentTurn: PlayerId;
  roundStarter: PlayerId;
  passStreak: number;
  status: "playing" | "round-over" | "match-over";
  lastRoundResult: RoundResult | null;
  matchWinnerId: PlayerId | null;
}

function tilePipSum(tile: Tile): number {
  return tile.a + tile.b;
}

function handsToCounts(hands: Record<PlayerId, Tile[]>, playerOrder: PlayerId[]): Record<PlayerId, number> {
  const counts: Record<PlayerId, number> = {};
  for (const id of playerOrder) counts[id] = hands[id].length;
  return counts;
}

function handsToPipSums(hands: Record<PlayerId, Tile[]>, playerOrder: PlayerId[]): Record<PlayerId, number> {
  const sums: Record<PlayerId, number> = {};
  for (const id of playerOrder) sums[id] = hands[id].reduce((sum, t) => sum + tilePipSum(t), 0);
  return sums;
}

function emptyBoard(): BoardState {
  return { chain: [], leftEnd: null, rightEnd: null };
}

export function createPublicMatch(
  mode: MatchMode,
  targetScore: number,
  playerOrder: PlayerId[],
  hands: Record<PlayerId, Tile[]>,
  boneyard: Tile[],
  starter: PlayerId
): PublicMatchState {
  const scores: Record<PlayerId, number> = {};
  for (const id of playerOrder) scores[id] = 0;
  return {
    mode,
    targetScore,
    playerOrder,
    board: emptyBoard(),
    boneyard,
    handCounts: handsToCounts(hands, playerOrder),
    pipSums: handsToPipSums(hands, playerOrder),
    scores,
    currentTurn: starter,
    roundStarter: starter,
    passStreak: 0,
    status: "playing",
    lastRoundResult: null,
    matchWinnerId: null,
  };
}

export function startNextPublicRound(
  state: PublicMatchState,
  hands: Record<PlayerId, Tile[]>,
  boneyard: Tile[]
): PublicMatchState {
  const starter = state.lastRoundResult?.winnerId ?? state.roundStarter;
  return {
    ...state,
    board: emptyBoard(),
    boneyard,
    handCounts: handsToCounts(hands, state.playerOrder),
    pipSums: handsToPipSums(hands, state.playerOrder),
    currentTurn: starter,
    roundStarter: starter,
    passStreak: 0,
    status: "playing",
    lastRoundResult: null,
  };
}

function finishPublicRound(
  state: PublicMatchState,
  winnerId: PlayerId,
  reason: RoundResult["reason"]
): PublicMatchState {
  const pointsAwarded = state.playerOrder
    .filter((id) => id !== winnerId)
    .reduce((sum, id) => sum + state.pipSums[id], 0);
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

export function applyPublicPlay(state: PublicMatchState, move: Move): PublicMatchState {
  if (state.status !== "playing") return state;
  const player = state.currentTurn;
  const newHandCount = state.handCounts[player] - 1;
  const next: PublicMatchState = {
    ...state,
    board: applyMove(state.board, move),
    handCounts: { ...state.handCounts, [player]: newHandCount },
    pipSums: { ...state.pipSums, [player]: state.pipSums[player] - tilePipSum(move.tile) },
    passStreak: 0,
  };
  if (newHandCount === 0) return finishPublicRound(next, player, "emptied-hand");
  return { ...next, currentTurn: nextPlayer(state.playerOrder, player) };
}

export function applyPublicDrawMany(state: PublicMatchState, drawnTiles: Tile[]): PublicMatchState {
  if (state.status !== "playing" || drawnTiles.length === 0) return state;
  const player = state.currentTurn;
  const addedPips = drawnTiles.reduce((sum, t) => sum + tilePipSum(t), 0);
  return {
    ...state,
    boneyard: state.boneyard.slice(drawnTiles.length),
    handCounts: { ...state.handCounts, [player]: state.handCounts[player] + drawnTiles.length },
    pipSums: { ...state.pipSums, [player]: state.pipSums[player] + addedPips },
  };
}

export function applyPublicPass(state: PublicMatchState): PublicMatchState {
  if (state.status !== "playing") return state;
  const passStreak = state.passStreak + 1;
  if (state.boneyard.length === 0 && passStreak >= state.playerOrder.length) {
    const lowest = Math.min(...state.playerOrder.map((id) => state.pipSums[id]));
    const tied = state.playerOrder.filter((id) => state.pipSums[id] === lowest);
    const winnerId = tied.length === 1 ? tied[0] : pickClosestAfter(state.playerOrder, state.roundStarter, tied);
    return finishPublicRound({ ...state, passStreak }, winnerId, "blocked");
  }
  return { ...state, passStreak, currentTurn: nextPlayer(state.playerOrder, state.currentTurn) };
}
```

- [ ] **Step 4: 테스트 통과 확인 + 전체 스위트 확인**

Run:
```powershell
npx vitest run src/games/domino/engine/publicMatch.test.ts
npm test
```
Expected: 새 파일 8개 테스트 PASS, 전체 스위트도 그대로 PASS.

- [ ] **Step 5: 타입 체크**

Run: `npx tsc -b`
Expected: 에러 없음.

- [ ] **Step 6: Commit**

```bash
git add src/games/domino/engine/publicMatch.ts src/games/domino/engine/publicMatch.test.ts
git commit -m "feat(domino): add hand-private public match state engine for online play"
```

---

### Task 3: Firebase 패키지 + 환경 설정

**Files:**
- Modify: `package.json`
- Create: `src/vite-env.d.ts`
- Create: `.env.example`
- Modify: `.gitignore`
- Create: `src/games/domino/multiplayer/firebase.ts`

**Interfaces:**
- Produces: `ensureSignedIn(): Promise<string>`, `getFirebaseDb(): Database`, `getFirebaseAuth(): Auth`

- [ ] **Step 1: `firebase` 패키지 설치**

Run:
```powershell
$env:PATH = "C:\Program Files\nodejs;" + $env:PATH
npm install firebase
```
Expected: `package.json`의 `dependencies`에 `firebase`가 추가됨.

- [ ] **Step 2: `.gitignore`에 `.env` 추가**

`.gitignore` 파일의 `*.local` 줄 바로 다음에 추가:
```
.env
```

- [ ] **Step 3: `.env.example` 작성**

`.env.example`:
```
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_DATABASE_URL=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_APP_ID=
```

- [ ] **Step 4: `src/vite-env.d.ts` 작성 (커스텀 env 변수 타입 선언)**

```ts
/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_FIREBASE_API_KEY: string;
  readonly VITE_FIREBASE_AUTH_DOMAIN: string;
  readonly VITE_FIREBASE_DATABASE_URL: string;
  readonly VITE_FIREBASE_PROJECT_ID: string;
  readonly VITE_FIREBASE_APP_ID: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
```

- [ ] **Step 5: `multiplayer/firebase.ts` 작성**

`src/games/domino/multiplayer/firebase.ts`:

```ts
import { initializeApp, type FirebaseApp } from "firebase/app";
import { getAuth, onAuthStateChanged, signInAnonymously, type Auth } from "firebase/auth";
import { getDatabase, type Database } from "firebase/database";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

let app: FirebaseApp | undefined;
let authInstance: Auth | undefined;
let dbInstance: Database | undefined;

function getFirebaseApp(): FirebaseApp {
  if (!app) app = initializeApp(firebaseConfig);
  return app;
}

export function getFirebaseAuth(): Auth {
  if (!authInstance) authInstance = getAuth(getFirebaseApp());
  return authInstance;
}

export function getFirebaseDb(): Database {
  if (!dbInstance) dbInstance = getDatabase(getFirebaseApp());
  return dbInstance;
}

export function ensureSignedIn(): Promise<string> {
  const auth = getFirebaseAuth();
  if (auth.currentUser) return Promise.resolve(auth.currentUser.uid);

  return new Promise((resolve, reject) => {
    const unsubscribe = onAuthStateChanged(
      auth,
      (user) => {
        if (user) {
          unsubscribe();
          resolve(user.uid);
        }
      },
      (error) => {
        unsubscribe();
        reject(error);
      }
    );
    signInAnonymously(auth).catch((error: unknown) => {
      unsubscribe();
      reject(error);
    });
  });
}
```

- [ ] **Step 6: 타입 체크**

Run: `npx tsc -b`
Expected: 에러 없음. (`.env`가 아직 없어도 `import.meta.env.VITE_FIREBASE_*`는 타입 선언만으로 컴파일 통과 — 실행 시에만 값이 `undefined`가 되어 Firebase 초기화가 실패하지만, 이건 실제 Firebase 프로젝트 연결 단계에서 해결할 일이다.)

- [ ] **Step 7: Commit**

```bash
git add package.json package-lock.json .gitignore .env.example src/vite-env.d.ts src/games/domino/multiplayer/firebase.ts
git commit -m "chore(domino): add firebase dependency and env configuration"
```

---

### Task 4: Firebase 보안 규칙 (`database.rules.json`)

**Files:**
- Create: `database.rules.json` (레포 루트)

- [ ] **Step 1: 파일 작성**

`database.rules.json`:

```json
{
  "rules": {
    "rooms": {
      "$roomId": {
        ".read": "auth != null",
        "hostId": {
          ".write": "auth != null && !data.exists()"
        },
        "mode": {
          ".write": "auth != null && !data.exists()"
        },
        "targetScore": {
          ".write": "auth != null && !data.exists()"
        },
        "players": {
          "$uid": {
            ".write": "auth != null && auth.uid === $uid"
          }
        },
        "public": {
          ".write": "auth != null && (auth.uid === root.child('rooms/' + $roomId + '/hostId').val() || auth.uid === data.child('currentTurn').val())"
        },
        "hands": {
          "$uid": {
            ".read": "auth != null && auth.uid === $uid",
            ".write": "auth != null && (auth.uid === $uid || (auth.uid === root.child('rooms/' + $roomId + '/hostId').val() && !root.child('rooms/' + $roomId + '/public').exists()))"
          }
        }
      }
    },
    "leaderboard": {
      "domino": {
        "$uid": {
          ".read": true,
          ".write": "auth != null && auth.uid === $uid"
        }
      }
    }
  }
}
```

이 규칙은 설계 문서(`database.rules.json` 초안)의 `status === 'waiting'` 조건을
`!root.child('.../public').exists()`로 바꿔 이번 계획의 단순화된 스키마(별도
status 필드 없음)에 맞췄다.

**검증 필요**: Firebase 프로젝트가 없어 Rules 시뮬레이터로 확인하지 못했다.
사용자가 Firebase 콘솔에서 이 파일을 게시한 뒤, 아래를 시뮬레이터로 반드시
확인해야 한다: (1) 호스트가 `players`에 없는 다른 uid의 손패를 대기 중에 쓸 수
있는지, (2) 대기 종료(`public` 생성) 후에는 호스트도 손패를 못 쓰는지, (3) 자기
턴이 아닌 사람이 `public`을 못 쓰는지.

- [ ] **Step 2: Commit**

```bash
git add database.rules.json
git commit -m "feat(domino): add firebase realtime database security rules"
```

---

### Task 5: `multiplayer/types.ts` + `multiplayer/room.ts`

**Files:**
- Create: `src/games/domino/multiplayer/types.ts`
- Create: `src/games/domino/multiplayer/room.ts`

**Interfaces:**
- Consumes: `ensureSignedIn`, `getFirebaseDb` from `./firebase` (Task 3); `createPublicMatch`, `startNextPublicRound`, `applyPublicPlay`, `applyPublicDrawMany`, `applyPublicPass`, `PublicMatchState` from `../engine/publicMatch` (Task 2); `createDeck`, `shuffle` from `../engine/deck`; `PlayerId`, `Move`, `MatchMode`, `Tile` from `../engine/types`
- Produces: `RoomPlayer`, `RoomState`, `LeaderboardEntry` 타입; `RoomError` 클래스; `createRoom`, `joinRoom`, `subscribeRoom`, `subscribeOwnHand`, `startGame`, `sendPlay`, `sendPass`, `sendDraw`, `appendOwnHand`, `removeOwnTile`, `startNextRoundOnline`, `submitLeaderboardScore`, `subscribeLeaderboard`

- [ ] **Step 1: `multiplayer/types.ts` 작성**

```ts
import type { PublicMatchState } from "../engine/publicMatch";

export interface RoomPlayer {
  nickname: string;
  seat: number;
}

export interface RoomState {
  hostId: string;
  mode: "single-round" | "target-score";
  targetScore: number;
  players: Record<string, RoomPlayer>;
  public: PublicMatchState | null;
}

export interface LeaderboardEntry {
  nickname: string;
  bestScore: number;
  updatedAt: number;
}
```

- [ ] **Step 2: `multiplayer/room.ts` 작성**

```ts
import {
  get,
  limitToLast,
  onValue,
  orderByChild,
  query,
  ref,
  runTransaction,
  set,
  update,
} from "firebase/database";
import { ensureSignedIn, getFirebaseDb } from "./firebase";
import { createDeck, shuffle } from "../engine/deck";
import {
  applyPublicDrawMany,
  applyPublicPass,
  applyPublicPlay,
  createPublicMatch,
  startNextPublicRound,
  type PublicMatchState,
} from "../engine/publicMatch";
import type { MatchMode, Move, PlayerId, Tile } from "../engine/types";
import type { LeaderboardEntry, RoomPlayer, RoomState } from "./types";

const ROOM_CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const MAX_PLAYERS = 4;
const HAND_SIZE = 7;

export class RoomError extends Error {
  code: "not-found" | "full" | "already-started";

  constructor(code: "not-found" | "full" | "already-started", message: string) {
    super(message);
    this.code = code;
  }
}

function generateRoomCode(): string {
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += ROOM_CODE_CHARS[Math.floor(Math.random() * ROOM_CODE_CHARS.length)];
  }
  return code;
}

function seatedPlayerOrder(players: Record<string, RoomPlayer>): PlayerId[] {
  return Object.entries(players)
    .sort((a, b) => a[1].seat - b[1].seat)
    .map(([uid]) => uid);
}

function dealFreshHands(playerOrder: PlayerId[]): { hands: Record<PlayerId, Tile[]>; boneyard: Tile[] } {
  const shuffled = shuffle(createDeck());
  const hands: Record<PlayerId, Tile[]> = {};
  let offset = 0;
  for (const id of playerOrder) {
    hands[id] = shuffled.slice(offset, offset + HAND_SIZE);
    offset += HAND_SIZE;
  }
  return { hands, boneyard: shuffled.slice(offset) };
}

export async function createRoom(nickname: string, mode: MatchMode, targetScore: number): Promise<string> {
  const uid = await ensureSignedIn();
  const db = getFirebaseDb();

  for (let attempt = 0; attempt < 5; attempt++) {
    const roomId = generateRoomCode();
    const roomRef = ref(db, `rooms/${roomId}`);
    const existing = await get(roomRef);
    if (existing.exists()) continue;

    const room: RoomState = {
      hostId: uid,
      mode,
      targetScore,
      players: { [uid]: { nickname, seat: 0 } },
      public: null,
    };
    await set(roomRef, room);
    return roomId;
  }
  throw new Error("방 코드를 생성하지 못했습니다. 다시 시도해주세요.");
}

export async function joinRoom(roomId: string, nickname: string): Promise<void> {
  const uid = await ensureSignedIn();
  const db = getFirebaseDb();
  const roomSnapshot = await get(ref(db, `rooms/${roomId}`));
  if (!roomSnapshot.exists()) throw new RoomError("not-found", "존재하지 않는 방입니다.");

  const room = roomSnapshot.val() as RoomState;
  if (room.public) throw new RoomError("already-started", "이미 시작된 방입니다.");
  if (room.players[uid]) return;

  const result = await runTransaction(
    ref(db, `rooms/${roomId}/players`),
    (players: Record<string, RoomPlayer> | null) => {
      const current = players ?? {};
      if (current[uid]) return current;
      const takenSeats = new Set(Object.values(current).map((p) => p.seat));
      if (takenSeats.size >= MAX_PLAYERS) return undefined;
      let seat = 0;
      while (takenSeats.has(seat)) seat++;
      return { ...current, [uid]: { nickname, seat } };
    }
  );

  if (!result.committed) throw new RoomError("full", "방이 가득 찼습니다.");
}

export function subscribeRoom(roomId: string, onChange: (room: RoomState | null) => void): () => void {
  const db = getFirebaseDb();
  return onValue(ref(db, `rooms/${roomId}`), (snapshot) => {
    onChange(snapshot.exists() ? (snapshot.val() as RoomState) : null);
  });
}

export function subscribeOwnHand(roomId: string, uid: string, onChange: (hand: Tile[]) => void): () => void {
  const db = getFirebaseDb();
  return onValue(ref(db, `rooms/${roomId}/hands/${uid}`), (snapshot) => {
    onChange((snapshot.val() as Tile[] | null) ?? []);
  });
}

export async function startGame(roomId: string): Promise<void> {
  const db = getFirebaseDb();
  const snapshot = await get(ref(db, `rooms/${roomId}`));
  if (!snapshot.exists()) return;
  const room = snapshot.val() as RoomState;
  const playerOrder = seatedPlayerOrder(room.players);
  const { hands, boneyard } = dealFreshHands(playerOrder);
  const starter = playerOrder[Math.floor(Math.random() * playerOrder.length)];
  const publicState = createPublicMatch(room.mode, room.targetScore, playerOrder, hands, boneyard, starter);

  const updates: Record<string, unknown> = { [`rooms/${roomId}/public`]: publicState };
  for (const id of playerOrder) {
    updates[`rooms/${roomId}/hands/${id}`] = hands[id];
  }
  await update(ref(db), updates);
}

export async function startNextRoundOnline(roomId: string): Promise<void> {
  const db = getFirebaseDb();
  const snapshot = await get(ref(db, `rooms/${roomId}`));
  if (!snapshot.exists()) return;
  const room = snapshot.val() as RoomState;
  if (!room.public) return;
  const playerOrder = room.public.playerOrder;
  const { hands, boneyard } = dealFreshHands(playerOrder);
  const publicState = startNextPublicRound(room.public, hands, boneyard);

  const updates: Record<string, unknown> = { [`rooms/${roomId}/public`]: publicState };
  for (const id of playerOrder) {
    updates[`rooms/${roomId}/hands/${id}`] = hands[id];
  }
  await update(ref(db), updates);
}

async function sendPublicUpdate(
  roomId: string,
  uid: string,
  updater: (state: PublicMatchState) => PublicMatchState | undefined
): Promise<boolean> {
  const db = getFirebaseDb();
  const result = await runTransaction(ref(db, `rooms/${roomId}/public`), (current: PublicMatchState | null) => {
    if (!current || current.currentTurn !== uid) return undefined;
    return updater(current);
  });
  return result.committed;
}

export function sendPlay(roomId: string, uid: string, move: Move): Promise<boolean> {
  return sendPublicUpdate(roomId, uid, (state) => applyPublicPlay(state, move));
}

export function sendDraw(roomId: string, uid: string, drawnTiles: Tile[]): Promise<boolean> {
  return sendPublicUpdate(roomId, uid, (state) => applyPublicDrawMany(state, drawnTiles));
}

export function sendPass(roomId: string, uid: string): Promise<boolean> {
  return sendPublicUpdate(roomId, uid, (state) => applyPublicPass(state));
}

export async function appendOwnHand(roomId: string, uid: string, drawnTiles: Tile[]): Promise<void> {
  if (drawnTiles.length === 0) return;
  const db = getFirebaseDb();
  const handRef = ref(db, `rooms/${roomId}/hands/${uid}`);
  const snapshot = await get(handRef);
  const currentHand = (snapshot.val() as Tile[] | null) ?? [];
  await set(handRef, [...currentHand, ...drawnTiles]);
}

export async function removeOwnTile(roomId: string, uid: string, tile: Tile): Promise<void> {
  const db = getFirebaseDb();
  const handRef = ref(db, `rooms/${roomId}/hands/${uid}`);
  const snapshot = await get(handRef);
  const currentHand = (snapshot.val() as Tile[] | null) ?? [];
  const index = currentHand.findIndex((t) => t.a === tile.a && t.b === tile.b);
  if (index === -1) return;
  await set(handRef, [...currentHand.slice(0, index), ...currentHand.slice(index + 1)]);
}

export async function submitLeaderboardScore(uid: string, nickname: string, score: number): Promise<void> {
  const db = getFirebaseDb();
  const entryRef = ref(db, `leaderboard/domino/${uid}`);
  const snapshot = await get(entryRef);
  const existing = snapshot.val() as LeaderboardEntry | null;
  if (existing && existing.bestScore >= score) return;
  await set(entryRef, { nickname, bestScore: score, updatedAt: Date.now() });
}

export function subscribeLeaderboard(
  onChange: (entries: (LeaderboardEntry & { uid: string })[]) => void
): () => void {
  const db = getFirebaseDb();
  const leaderboardQuery = query(ref(db, "leaderboard/domino"), orderByChild("bestScore"), limitToLast(20));
  return onValue(leaderboardQuery, (snapshot) => {
    const entries: (LeaderboardEntry & { uid: string })[] = [];
    snapshot.forEach((child) => {
      entries.push({ uid: child.key as string, ...(child.val() as LeaderboardEntry) });
      return false;
    });
    entries.reverse();
    onChange(entries);
  });
}
```

- [ ] **Step 3: 타입 체크 + 린트**

Run:
```powershell
$env:PATH = "C:\Program Files\nodejs;" + $env:PATH
npx tsc -b
npx oxlint src/games/domino
```
Expected: 둘 다 에러 없이 통과. (이 파일은 Firebase 프로젝트 없이는 런타임 테스트 불가 — 타입/구문 검증까지만.)

- [ ] **Step 4: Commit**

```bash
git add src/games/domino/multiplayer/types.ts src/games/domino/multiplayer/room.ts
git commit -m "feat(domino): add firebase room orchestration layer"
```

---

### Task 6: 에러 바운더리

**Files:**
- Create: `src/games/domino/DominoErrorBoundary.tsx`

- [ ] **Step 1: 구현**

```tsx
import { Component, type ReactNode } from "react";

interface DominoErrorBoundaryProps {
  children: ReactNode;
}

interface DominoErrorBoundaryState {
  hasError: boolean;
}

export class DominoErrorBoundary extends Component<DominoErrorBoundaryProps, DominoErrorBoundaryState> {
  state: DominoErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): DominoErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: unknown): void {
    console.error("도미노 화면에서 오류가 발생했습니다:", error);
  }

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div className="domino-menu">
          <div className="domino-menu__panel">
            <p className="domino-menu__title" style={{ fontSize: "1.4rem" }}>
              문제가 발생했습니다
            </p>
            <p className="domino-menu__subtitle">페이지를 새로고침해 다시 시도해주세요.</p>
            <button className="domino-menu__start" onClick={() => window.location.reload()}>
              새로고침
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
```

이 컴포넌트는 `DominoMenu.css`의 기존 클래스를 재사용하므로 별도 CSS 파일이
필요 없다(사용하는 쪽에서 이미 `DominoMenu.css`나 `Domino.css`가 로드되어 있음).

- [ ] **Step 2: 타입 체크**

Run: `npx tsc -b`
Expected: 에러 없음.

- [ ] **Step 3: Commit**

```bash
git add src/games/domino/DominoErrorBoundary.tsx
git commit -m "feat(domino): add error boundary for the domino game screen"
```

---

### Task 7: 온라인 참가 화면 (`DominoOnlineSetup`)

**Files:**
- Create: `src/games/domino/DominoOnlineSetup.tsx`
- Create: `src/games/domino/DominoOnlineSetup.css`

**Interfaces:**
- Consumes: `MatchMode` from `./engine/types`
- Produces: `DominoOnlineSetup` 컴포넌트 — `{ initialRoomCode: string; busy: boolean; errorMessage: string | null; onCreateRoom: (nickname: string, mode: MatchMode, targetScore: number) => void; onJoinRoom: (nickname: string, roomCode: string) => void; onBack: () => void }`

- [ ] **Step 1: 구현**

```tsx
import { useState } from "react";
import type { MatchMode } from "./engine/types";
import "./DominoOnlineSetup.css";

interface DominoOnlineSetupProps {
  initialRoomCode: string;
  busy: boolean;
  errorMessage: string | null;
  onCreateRoom: (nickname: string, mode: MatchMode, targetScore: number) => void;
  onJoinRoom: (nickname: string, roomCode: string) => void;
  onBack: () => void;
}

const DEFAULT_TARGET_SCORE = 100;

export function DominoOnlineSetup({
  initialRoomCode,
  busy,
  errorMessage,
  onCreateRoom,
  onJoinRoom,
  onBack,
}: DominoOnlineSetupProps) {
  const [tab, setTab] = useState<"create" | "join">(initialRoomCode ? "join" : "create");
  const [nickname, setNickname] = useState("");
  const [roomCode, setRoomCode] = useState(initialRoomCode);
  const [mode, setMode] = useState<MatchMode>("target-score");
  const [targetScore, setTargetScore] = useState(DEFAULT_TARGET_SCORE);

  const trimmedNickname = nickname.trim() || "익명";

  return (
    <div className="domino-menu">
      <div className="domino-menu__panel">
        <p className="domino-menu__eyebrow">☥ ONLINE MULTIPLAYER ☥</p>
        <h1 className="domino-menu__title" style={{ fontSize: "1.8rem" }}>
          온라인 멀티플레이
        </h1>

        <label className="domino-menu__field">
          <span className="domino-menu__label">닉네임</span>
          <input
            className="domino-menu__number"
            value={nickname}
            maxLength={12}
            onChange={(e) => setNickname(e.target.value)}
            placeholder="닉네임을 입력하세요"
          />
        </label>

        <div className="domino-menu__options">
          <button
            className={tab === "create" ? "domino-menu__option domino-menu__option--active" : "domino-menu__option"}
            onClick={() => setTab("create")}
            type="button"
          >
            방 만들기
          </button>
          <button
            className={tab === "join" ? "domino-menu__option domino-menu__option--active" : "domino-menu__option"}
            onClick={() => setTab("join")}
            type="button"
          >
            코드로 참가
          </button>
        </div>

        {tab === "create" ? (
          <>
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
            <button
              className="domino-menu__start"
              disabled={busy}
              onClick={() => onCreateRoom(trimmedNickname, mode, targetScore)}
            >
              방 만들기
            </button>
          </>
        ) : (
          <>
            <label className="domino-menu__field">
              <span className="domino-menu__label">방 코드</span>
              <input
                className="domino-menu__number"
                value={roomCode}
                maxLength={6}
                onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                placeholder="예: AB12CD"
              />
            </label>
            <button
              className="domino-menu__start"
              disabled={busy || roomCode.trim().length === 0}
              onClick={() => onJoinRoom(trimmedNickname, roomCode.trim())}
            >
              참가하기
            </button>
          </>
        )}

        {errorMessage && <p className="domino-online-setup__error">{errorMessage}</p>}

        <button className="domino-menu__option" style={{ width: "100%" }} onClick={onBack} type="button">
          ← 뒤로
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: `DominoOnlineSetup.css` 작성**

```css
.domino-online-setup__error {
  margin: 0;
  padding: var(--space-2);
  border-radius: 8px;
  background: rgba(180, 40, 40, 0.12);
  color: #8a2020;
  font-size: 0.85rem;
  text-align: center;
}
```

- [ ] **Step 3: 타입 체크**

Run: `npx tsc -b`
Expected: 에러 없음.

- [ ] **Step 4: Commit**

```bash
git add src/games/domino/DominoOnlineSetup.tsx src/games/domino/DominoOnlineSetup.css
git commit -m "feat(domino): add online setup screen (nickname, create/join room)"
```

---

### Task 8: 대기실 (`DominoLobby`)

**Files:**
- Create: `src/games/domino/DominoLobby.tsx`
- Create: `src/games/domino/DominoLobby.css`

**Interfaces:**
- Consumes: `RoomState` from `./multiplayer/types`
- Produces: `DominoLobby` 컴포넌트 — `{ room: RoomState; roomId: string; myUid: string; onStart: () => void; starting: boolean; onLeave: () => void }`

- [ ] **Step 1: 구현**

```tsx
import { useState } from "react";
import type { RoomState } from "./multiplayer/types";
import "./DominoLobby.css";

interface DominoLobbyProps {
  room: RoomState;
  roomId: string;
  myUid: string;
  onStart: () => void;
  starting: boolean;
  onLeave: () => void;
}

export function DominoLobby({ room, roomId, myUid, onStart, starting, onLeave }: DominoLobbyProps) {
  const [copied, setCopied] = useState(false);
  const isHost = room.hostId === myUid;
  const players = Object.entries(room.players).sort((a, b) => a[1].seat - b[1].seat);
  const shareUrl = `${window.location.origin}${window.location.pathname}?room=${roomId}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(shareUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="domino-lobby">
      <h2 className="domino-lobby__code">방 코드: {roomId}</h2>
      <div className="domino-lobby__share">
        <input readOnly value={shareUrl} className="domino-lobby__link" />
        <button onClick={handleCopy}>{copied ? "복사됨!" : "링크 복사"}</button>
      </div>

      <ul className="domino-lobby__players">
        {players.map(([uid, player]) => (
          <li key={uid}>
            {player.nickname} {uid === room.hostId && <span className="domino-lobby__host-tag">방장</span>}
          </li>
        ))}
      </ul>

      {isHost ? (
        <button className="domino-lobby__start" disabled={players.length < 2 || starting} onClick={onStart}>
          {starting ? "시작하는 중..." : `게임 시작 (${players.length}/4명)`}
        </button>
      ) : (
        <p className="domino-lobby__waiting">호스트가 게임을 시작하기를 기다리는 중...</p>
      )}

      <button className="domino-lobby__leave" onClick={onLeave}>
        나가기
      </button>
    </div>
  );
}
```

- [ ] **Step 2: `DominoLobby.css` 작성**

```css
.domino-lobby {
  max-width: 420px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
  padding: var(--space-6) var(--space-4);
  color: var(--text-primary);
}

.domino-lobby__code {
  text-align: center;
  font-family: var(--font-mono);
  letter-spacing: 0.1em;
}

.domino-lobby__share {
  display: flex;
  gap: var(--space-2);
}

.domino-lobby__link {
  flex: 1;
  padding: var(--space-2);
  border-radius: 8px;
  border: 1px solid var(--border-hairline);
  background: var(--bg-panel);
  color: var(--text-muted);
  font-family: var(--font-mono);
  font-size: 0.8rem;
}

.domino-lobby__players {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.domino-lobby__players li {
  padding: var(--space-2);
  background: var(--bg-panel-raised);
  border-radius: 8px;
}

.domino-lobby__host-tag {
  color: var(--accent-domino);
  font-size: 0.75rem;
  margin-left: var(--space-2);
}

.domino-lobby__start,
.domino-lobby__leave {
  padding: var(--space-3);
  border-radius: var(--radius-chip);
  border: 1px solid var(--border-hairline);
  cursor: pointer;
}

.domino-lobby__start {
  background: var(--accent-domino);
  color: #101018;
  font-weight: 600;
}

.domino-lobby__start:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.domino-lobby__leave {
  background: transparent;
  color: var(--text-muted);
}

.domino-lobby__waiting {
  text-align: center;
  color: var(--text-muted);
  font-family: var(--font-mono);
  font-size: 0.85rem;
}
```

- [ ] **Step 3: 타입 체크**

Run: `npx tsc -b`
Expected: 에러 없음.

- [ ] **Step 4: Commit**

```bash
git add src/games/domino/DominoLobby.tsx src/games/domino/DominoLobby.css
git commit -m "feat(domino): add multiplayer lobby screen"
```

---

### Task 9: 랭킹 화면 (`DominoLeaderboard`)

**Files:**
- Create: `src/games/domino/DominoLeaderboard.tsx`
- Create: `src/games/domino/DominoLeaderboard.css`

**Interfaces:**
- Consumes: `subscribeLeaderboard` from `./multiplayer/room`
- Produces: `DominoLeaderboard` 컴포넌트 — `{ onBack: () => void }`

- [ ] **Step 1: 구현**

```tsx
import { useEffect, useState } from "react";
import { subscribeLeaderboard } from "./multiplayer/room";
import type { LeaderboardEntry } from "./multiplayer/types";
import "./DominoLeaderboard.css";

type Entry = LeaderboardEntry & { uid: string };

export function DominoLeaderboard({ onBack }: { onBack: () => void }) {
  const [entries, setEntries] = useState<Entry[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    try {
      return subscribeLeaderboard(setEntries);
    } catch {
      setError("랭킹을 불러오지 못했습니다.");
      return undefined;
    }
  }, []);

  return (
    <div className="domino-leaderboard">
      <h2>온라인 랭킹</h2>
      {error && <p className="domino-leaderboard__error">{error}</p>}
      {!error && entries === null && <p className="domino-leaderboard__loading">불러오는 중...</p>}
      {!error && entries !== null && entries.length === 0 && (
        <p className="domino-leaderboard__empty">아직 기록이 없습니다. 온라인 매치를 플레이해보세요!</p>
      )}
      {entries && entries.length > 0 && (
        <ol className="domino-leaderboard__list">
          {entries.map((entry, i) => (
            <li key={entry.uid}>
              <span className="domino-leaderboard__rank">{i + 1}</span>
              <span className="domino-leaderboard__name">{entry.nickname}</span>
              <span className="domino-leaderboard__score">{entry.bestScore}</span>
            </li>
          ))}
        </ol>
      )}
      <button className="domino-lobby__leave" onClick={onBack}>
        ← 뒤로
      </button>
    </div>
  );
}
```

- [ ] **Step 2: `DominoLeaderboard.css` 작성**

```css
.domino-leaderboard {
  max-width: 420px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  padding: var(--space-6) var(--space-4);
  color: var(--text-primary);
}

.domino-leaderboard__list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}

.domino-leaderboard__list li {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-2);
  background: var(--bg-panel-raised);
  border-radius: 8px;
  font-family: var(--font-mono);
}

.domino-leaderboard__rank {
  width: 24px;
  color: var(--accent-domino);
  font-weight: 700;
}

.domino-leaderboard__name {
  flex: 1;
}

.domino-leaderboard__error,
.domino-leaderboard__loading,
.domino-leaderboard__empty {
  color: var(--text-muted);
  text-align: center;
}
```

- [ ] **Step 3: 타입 체크**

Run: `npx tsc -b`
Expected: 에러 없음.

- [ ] **Step 4: Commit**

```bash
git add src/games/domino/DominoLeaderboard.tsx src/games/domino/DominoLeaderboard.css
git commit -m "feat(domino): add online leaderboard screen"
```

---

### Task 10: 로컬 플레이 화면을 `DominoLocalGame.tsx`로 분리

**Files:**
- Create: `src/games/domino/DominoLocalGame.tsx`
- Modify: `src/games/domino/Domino.tsx` (다음 태스크에서 라우팅 셸로 축소되므로, 이번엔 로컬 플레이 로직을 그대로 새 파일로 옮기기만 한다)

**Interfaces:**
- Produces: `DominoLocalGame` 컴포넌트 — `{ onExit: () => void }` props (현재 `Domino.tsx`가 하던 것과 동일한 동작, `onExit`만 추가되어 매치 종료 후 "메뉴로 돌아가기"가 상위 라우터로 신호를 보낸다)

- [ ] **Step 1: 현재 `Domino.tsx` 내용을 `DominoLocalGame.tsx`로 복사하고 이름/시그니처만 조정**

`src/games/domino/DominoLocalGame.tsx` (현재 `Domino.tsx`와 동일하되 함수명과
"메뉴로 돌아가기" 동작만 변경):

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

export function DominoLocalGame({ onExit }: { onExit: () => void }) {
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
            <button
              onClick={() => {
                setMatch(null);
                onExit();
              }}
            >
              메뉴로 돌아가기
            </button>
          </div>
        )}
      </div>
    </GameShell>
  );
}
```

- [ ] **Step 2: 타입 체크**

Run: `npx tsc -b`
Expected: `Domino.tsx`가 아직 옛날 내용 그대로라 중복 export 관련 에러는 없다(별개
파일이라 서로 충돌하지 않음). 새 파일 자체는 에러 없이 컴파일된다.

- [ ] **Step 3: Commit**

```bash
git add src/games/domino/DominoLocalGame.tsx
git commit -m "refactor(domino): extract local vs-AI gameplay into DominoLocalGame"
```

---

### Task 11: 온라인 플레이 화면 (`DominoOnlineGame`)

**Files:**
- Create: `src/games/domino/DominoOnlineGame.tsx`

**Interfaces:**
- Consumes: `RoomState` from `./multiplayer/types`; `subscribeOwnHand`, `sendPlay`, `sendDraw`, `sendPass`, `appendOwnHand`, `removeOwnTile`, `startNextRoundOnline`, `submitLeaderboardScore` from `./multiplayer/room`; `canPlay`, `getValidMoves` from `./engine/board`
- Produces: `DominoOnlineGame` 컴포넌트 — `{ room: RoomState; roomId: string; myUid: string; myNickname: string; onExit: () => void }`

- [ ] **Step 1: 구현**

```tsx
import { useCallback, useEffect, useState } from "react";
import { GameShell } from "../../components/GameShell";
import { DominoTile } from "./DominoTile";
import { canPlay, getValidMoves } from "./engine/board";
import type { BoardEnd, Tile } from "./engine/types";
import {
  appendOwnHand,
  removeOwnTile,
  sendDraw,
  sendPass,
  sendPlay,
  startNextRoundOnline,
  submitLeaderboardScore,
  subscribeOwnHand,
} from "./multiplayer/room";
import type { RoomState } from "./multiplayer/types";
import "./Domino.css";

interface DominoOnlineGameProps {
  room: RoomState;
  roomId: string;
  myUid: string;
  myNickname: string;
  onExit: () => void;
}

function playerLabel(room: RoomState, uid: string): string {
  return room.players[uid]?.nickname ?? "???";
}

export function DominoOnlineGame({ room, roomId, myUid, myNickname, onExit }: DominoOnlineGameProps) {
  const [myHand, setMyHand] = useState<Tile[]>([]);
  const [pendingTile, setPendingTile] = useState<Tile | null>(null);
  const [startingNextRound, setStartingNextRound] = useState(false);
  const pub = room.public;

  useEffect(() => subscribeOwnHand(roomId, myUid, setMyHand), [roomId, myUid]);

  // 내 턴이고 낼 수 없으면 자동으로 뽑거나 패스한다
  useEffect(() => {
    if (!pub || pub.status !== "playing" || pub.currentTurn !== myUid) return;
    if (canPlay(myHand, pub.board)) return;

    if (pub.boneyard.length > 0) {
      let hand = myHand;
      let boneyard = pub.boneyard;
      const drawn: Tile[] = [];
      while (!canPlay(hand, pub.board) && boneyard.length > 0) {
        const tile = boneyard[0];
        drawn.push(tile);
        hand = [...hand, tile];
        boneyard = boneyard.slice(1);
      }
      appendOwnHand(roomId, myUid, drawn).then(() => sendDraw(roomId, myUid, drawn));
    } else {
      sendPass(roomId, myUid);
    }
  }, [pub, myHand, myUid, roomId]);

  useEffect(() => {
    if (pub?.status === "match-over" && pub.matchWinnerId === myUid) {
      submitLeaderboardScore(myUid, myNickname, pub.scores[myUid]);
    }
  }, [pub?.status, pub?.matchWinnerId, myUid, myNickname, pub?.scores]);

  const handleTileClick = useCallback(
    (tile: Tile) => {
      if (!pub || pub.status !== "playing" || pub.currentTurn !== myUid) return;
      const moves = getValidMoves(myHand, pub.board).filter((m) => m.tile.a === tile.a && m.tile.b === tile.b);
      if (moves.length === 0) return;
      if (moves.length === 1) {
        removeOwnTile(roomId, myUid, tile).then(() => sendPlay(roomId, myUid, moves[0]));
        return;
      }
      setPendingTile(tile);
    },
    [pub, myHand, myUid, roomId]
  );

  const handleChooseEnd = useCallback(
    (end: BoardEnd) => {
      if (!pendingTile) return;
      const move = { tile: pendingTile, end };
      removeOwnTile(roomId, myUid, pendingTile).then(() => sendPlay(roomId, myUid, move));
      setPendingTile(null);
    },
    [pendingTile, roomId, myUid]
  );

  const handleNextRound = useCallback(() => {
    setStartingNextRound(true);
    startNextRoundOnline(roomId).finally(() => setStartingNextRound(false));
  }, [roomId]);

  if (!pub) {
    return <p className="domino-status-bar">게임을 준비하는 중...</p>;
  }

  const isMyTurn = pub.status === "playing" && pub.currentTurn === myUid;
  const myValidTileKeys = new Set(
    isMyTurn ? getValidMoves(myHand, pub.board).map((m) => `${m.tile.a}-${m.tile.b}`) : []
  );
  const opponents = pub.playerOrder.filter((id) => id !== myUid);
  const isHost = room.hostId === myUid;

  return (
    <GameShell
      title="도미노 (온라인)"
      accentVar="--accent-domino"
      score={pub.scores[myUid] ?? 0}
      highScore={0}
      controlsHint="손패에서 타일을 클릭해 보드 양 끝에 맞춰 놓으세요"
    >
      <div className="domino-board">
        <div className="domino-status-bar">
          <span>턴: {playerLabel(room, pub.currentTurn)}</span>
          <span>보유고 {pub.boneyard.length}장</span>
          <span className="domino-status-bar__scores">
            {pub.playerOrder.map((id) => (
              <span key={id}>
                {playerLabel(room, id)} {pub.scores[id]}
              </span>
            ))}
          </span>
        </div>

        <div className="domino-opponents">
          {opponents.map((id) => (
            <div
              key={id}
              className={pub.currentTurn === id ? "domino-opponent domino-opponent--active" : "domino-opponent"}
            >
              <span className="domino-opponent__label">{playerLabel(room, id)}</span>
              <div className="domino-opponent__hand">
                {Array.from({ length: pub.handCounts[id] ?? 0 }, (_, i) => (
                  <DominoTile key={i} tile={{ a: 0, b: 0 }} faceDown />
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="domino-chain">
          {pub.board.chain.length === 0 && <p className="domino-chain__empty">첫 타일을 놓아보세요</p>}
          {pub.board.chain.map((placed, i) => (
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
          {myHand.map((tile, i) => (
            <button
              key={i}
              className="domino-human-hand__slot"
              onClick={() => handleTileClick(tile)}
              disabled={!isMyTurn || !myValidTileKeys.has(`${tile.a}-${tile.b}`)}
            >
              <DominoTile tile={tile} />
            </button>
          ))}
        </div>

        {pub.status === "round-over" && pub.lastRoundResult && (
          <div className="domino-round-end">
            <p>
              {playerLabel(room, pub.lastRoundResult.winnerId)}가 이번 라운드 승리! (+
              {pub.lastRoundResult.pointsAwarded}점)
            </p>
            {isHost ? (
              <button onClick={handleNextRound} disabled={startingNextRound}>
                {startingNextRound ? "준비하는 중..." : "다음 라운드"}
              </button>
            ) : (
              <p className="domino-lobby__waiting">호스트가 다음 라운드를 준비하는 중...</p>
            )}
          </div>
        )}

        {pub.status === "match-over" && (
          <div className="domino-match-end">
            <p>{playerLabel(room, pub.matchWinnerId ?? myUid)}가 매치에서 승리했습니다!</p>
            <button onClick={onExit}>메뉴로 돌아가기</button>
          </div>
        )}
      </div>
    </GameShell>
  );
}
```

- [ ] **Step 2: 타입 체크**

Run: `npx tsc -b`
Expected: 에러 없음.

- [ ] **Step 3: Commit**

```bash
git add src/games/domino/DominoOnlineGame.tsx
git commit -m "feat(domino): add online gameplay screen"
```

---

### Task 12: `Domino.tsx`를 라우팅 셸로 재작성 + `index.ts` 에러 바운더리 적용

**Files:**
- Modify: `src/games/domino/Domino.tsx`
- Modify: `src/games/domino/index.ts`

**Interfaces:**
- Consumes: 지금까지 만든 모든 컴포넌트/`multiplayer/room.ts` 함수

- [ ] **Step 1: `Domino.tsx` 전체를 아래로 교체**

```tsx
import { useCallback, useEffect, useState } from "react";
import { DominoLeaderboard } from "./DominoLeaderboard";
import { DominoLobby } from "./DominoLobby";
import { DominoLocalGame } from "./DominoLocalGame";
import { DominoOnlineGame } from "./DominoOnlineGame";
import { DominoOnlineSetup } from "./DominoOnlineSetup";
import { ensureSignedIn } from "./multiplayer/firebase";
import { createRoom, joinRoom, RoomError, startGame, subscribeRoom } from "./multiplayer/room";
import type { RoomState } from "./multiplayer/types";
import type { MatchMode } from "./engine/types";
import "./DominoMenu.css";

type Screen = "home" | "single" | "online-setup" | "online-room" | "leaderboard";

function initialRoomCodeFromUrl(): string {
  return new URLSearchParams(window.location.search).get("room")?.toUpperCase() ?? "";
}

export function Domino() {
  const [screen, setScreen] = useState<Screen>(() => (initialRoomCodeFromUrl() ? "online-setup" : "home"));
  const [busy, setBusy] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [roomId, setRoomId] = useState<string | null>(null);
  const [nickname, setNickname] = useState("");
  const [room, setRoom] = useState<RoomState | null>(null);
  const [myUid, setMyUid] = useState<string | null>(null);

  useEffect(() => {
    if (!roomId) return;
    return subscribeRoom(roomId, setRoom);
  }, [roomId]);

  const goHome = useCallback(() => {
    setScreen("home");
    setRoomId(null);
    setRoom(null);
    setErrorMessage(null);
    window.history.replaceState(null, "", window.location.pathname);
  }, []);

  const handleCreateRoom = useCallback(async (nick: string, mode: MatchMode, targetScore: number) => {
    setBusy(true);
    setErrorMessage(null);
    try {
      const uid = await ensureSignedIn();
      const newRoomId = await createRoom(nick, mode, targetScore);
      setMyUid(uid);
      setNickname(nick);
      setRoomId(newRoomId);
      setScreen("online-room");
    } catch {
      setErrorMessage("방을 만들지 못했습니다. 잠시 후 다시 시도해주세요.");
    } finally {
      setBusy(false);
    }
  }, []);

  const handleJoinRoom = useCallback(async (nick: string, code: string) => {
    setBusy(true);
    setErrorMessage(null);
    try {
      const uid = await ensureSignedIn();
      await joinRoom(code, nick);
      setMyUid(uid);
      setNickname(nick);
      setRoomId(code);
      setScreen("online-room");
    } catch (error) {
      if (error instanceof RoomError) {
        setErrorMessage(error.message);
      } else {
        setErrorMessage("방에 참가하지 못했습니다. 잠시 후 다시 시도해주세요.");
      }
    } finally {
      setBusy(false);
    }
  }, []);

  if (screen === "home") {
    return (
      <div className="domino-menu">
        <div className="domino-menu__panel">
          <span className="domino-menu__corner domino-menu__corner--left" aria-hidden="true">
            ☥
          </span>
          <span className="domino-menu__corner domino-menu__corner--right" aria-hidden="true">
            ☥
          </span>
          <p className="domino-menu__eyebrow">MINI GAME ARCADE · DOMINO</p>
          <h1 className="domino-menu__title">도미노</h1>
          <div className="domino-menu__rule" aria-hidden="true" />
          <p className="domino-menu__subtitle">
            이집트 카페에서 즐기던 표준 블록 도미노(더블식스)
          </p>
          <button className="domino-menu__start" onClick={() => setScreen("single")}>
            싱글 플레이 (vs AI)
          </button>
          <button className="domino-menu__start" onClick={() => setScreen("online-setup")}>
            온라인 멀티플레이
          </button>
          <button className="domino-menu__option" style={{ width: "100%" }} onClick={() => setScreen("leaderboard")}>
            랭킹 보기
          </button>
        </div>
      </div>
    );
  }

  if (screen === "single") {
    return <DominoLocalGame onExit={goHome} />;
  }

  if (screen === "leaderboard") {
    return <DominoLeaderboard onBack={goHome} />;
  }

  if (screen === "online-setup") {
    return (
      <DominoOnlineSetup
        initialRoomCode={initialRoomCodeFromUrl()}
        busy={busy}
        errorMessage={errorMessage}
        onCreateRoom={handleCreateRoom}
        onJoinRoom={handleJoinRoom}
        onBack={goHome}
      />
    );
  }

  // screen === "online-room"
  if (!roomId || !room || !myUid) {
    return <p className="domino-status-bar">연결하는 중...</p>;
  }

  if (!room.public) {
    return (
      <DominoLobby
        room={room}
        roomId={roomId}
        myUid={myUid}
        starting={busy}
        onLeave={goHome}
        onStart={async () => {
          setBusy(true);
          await startGame(roomId);
          setBusy(false);
        }}
      />
    );
  }

  return (
    <DominoOnlineGame room={room} roomId={roomId} myUid={myUid} myNickname={nickname} onExit={goHome} />
  );
}
```

- [ ] **Step 2: `index.ts`를 에러 바운더리로 감싸도록 수정**

`src/games/domino/index.ts` 전체를 아래로 교체:

```ts
import type { GameModule } from "../../types/game";
import { Domino } from "./Domino";
import { DominoErrorBoundary } from "./DominoErrorBoundary";

function DominoWithBoundary() {
  return (
    <DominoErrorBoundary>
      <Domino />
    </DominoErrorBoundary>
  );
}

export const domino: GameModule = {
  id: "domino",
  title: "도미노",
  description: "표준 블록 도미노 28피스로 AI와 겨루거나 온라인으로 친구와 대결하세요",
  icon: "🁻",
  accentVar: "--accent-domino",
  Component: DominoWithBoundary,
  inProgress: true,
};
```

이 파일은 JSX를 포함하므로 확장자를 `.ts`에서 `.tsx`로 바꿔야 한다: `index.ts`를
삭제하고 `index.tsx`로 새로 만든다(내용은 위와 동일).

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
Expected: 정상 빌드(`.env`가 비어 있어도 빌드 자체는 통과 — Firebase 초기화 실패는
런타임에만 나타남).

- [ ] **Step 5: 브라우저에서 회귀 확인 (싱글플레이)**

Run: `npm run dev`, `http://localhost:5173/domino` 접속.

확인할 것(전부 이전 단계에서 이미 동작하던 것들의 회귀 확인):
1. 홈 화면에 "싱글 플레이 (vs AI)" / "온라인 멀티플레이" / "랭킹 보기" 세 버튼이 보인다.
2. "싱글 플레이" 클릭 → 기존 인원수/난이도/종료방식 설정 화면 → 게임 진행이 이전과
   동일하게 동작한다(회귀 없음).
3. "랭킹 보기" 클릭 → Firebase 연결 실패로 에러 상태가 뜨는 게 정상이다(아직 `.env`
   설정 전이므로). 흰 화면 없이 에러 메시지가 보이면 방어적 UI가 동작하는 것이다.
4. "온라인 멀티플레이" 클릭 → 닉네임/방 만들기·참가 화면이 뜬다. 실제 방 생성은
   Firebase 프로젝트 연결 전이라 실패하지만, 에러 메시지가 화면에 뜨고 앱이
   죽지 않아야 한다(방어적 UI 확인).

- [ ] **Step 6: Commit**

```bash
git add src/games/domino/Domino.tsx src/games/domino/index.tsx
git rm src/games/domino/index.ts
git commit -m "feat(domino): wire up home/single/online/leaderboard routing with error boundary"
```

---

### Task 13: README에 Firebase 설정 안내 추가

**Files:**
- Modify: `README.md`

- [ ] **Step 1: "빠른 시작" 절 다음에 새 절 추가**

```markdown
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

**주의**: `database.rules.json`은 이 프로젝트에서 실제 Firebase 프로젝트 없이
설계된 규칙입니다. 게시 후 Firebase 콘솔의 Rules 시뮬레이터로 직접 검증해보세요.
```

- [ ] **Step 2: Commit**

```bash
git add README.md
git commit -m "docs(domino): add firebase setup instructions for online multiplayer"
```

---

## Self-Review 결과

- **스펙 커버리지**: 설계 문서의 손패 프라이버시(시작 손패 비공개/보유고 타협),
  트랜잭션 기반 동시성, 재접속(구독 기반이라 자동 해결), 방어적 UI, 랭킹, 에러
  바운더리가 Task 2~13에서 전부 다뤄진다.
- **Placeholder 스캔**: 없음.
- **타입 일관성**: `PublicMatchState`, `RoomState`, `RoomPlayer`, `LeaderboardEntry`
  필드명이 `publicMatch.ts` → `room.ts` → `DominoLobby`/`DominoOnlineGame`까지
  동일하게 재사용됨을 확인했다.
- **알려진 한계(설계 문서에 이미 명시)**: 보유고 뽑기는 완전히 숨기지 못함(캐주얼
  타협), 손패 갱신과 공개 상태 갱신이 별도 쓰기라 극히 드물게 네트워크 단절 시
  둘 사이에 불일치가 생길 수 있음(새로고침하면 Firebase 최신 상태로 복구됨),
  보안 규칙은 실제 프로젝트에서 검증 필요.
