# 도미노 엔진 2~4인 일반화 + AI 난이도 — 설계 문서

날짜: 2026-07-08

## 배경 / 목표

현재 도미노는 1:1(나 vs AI 1명) 고정으로 구현되어 있다(`docs/superpowers/plans/2026-07-08-domino-mvp.md`).
이번 설계는 그 위에 두 가지를 추가한다.

1. 엔진을 **2~4인**으로 일반화(나 1명 + AI 1~3명)
2. AI **난이도(쉬움/보통/어려움)** 선택

이 작업은 온라인 멀티플레이 + 랭킹(다음 설계 문서에서 다룸)의 선행 작업이다.
온라인 멀티플레이도 결국 2~4인 엔진을 그대로 재사용하기 때문이다.

## 엔진 변경 (`src/games/domino/engine/`)

### PlayerId를 문자열로 일반화

```ts
export type PlayerId = string;
```

`types.ts`의 `hands`/`scores`는 그대로 `Record<PlayerId, ...>`를 쓰되, 이제 키가 2개 고정이
아니라 `playerOrder`에 담긴 개수만큼 존재한다. `MatchState`에 좌석 순서 필드를 추가한다.

```ts
export interface MatchState {
  mode: MatchMode;
  targetScore: number;
  playerOrder: PlayerId[];       // 신규: 좌석 순서 (턴 순회 기준)
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

`RoundResult.winnerId`도 `PlayerId`(string)로 그대로 유지된다.

사람은 항상 `"human"`, AI는 `"ai-1"`, `"ai-2"`, `"ai-3"`로 명명한다(`match.ts`에
`HUMAN_ID = "human"`, `aiId(n) = \`ai-${n}\`` 헬퍼로 고정).

### 턴 순회

기존 `otherPlayer` 토글(2인 전용)을 순서 배열 기반 순환 함수로 교체한다.

```ts
export function nextPlayer(order: PlayerId[], current: PlayerId): PlayerId {
  const index = order.indexOf(current);
  return order[(index + 1) % order.length];
}
```

2인일 때는 `nextPlayer`가 기존 `otherPlayer`와 동일하게 동작한다(순서 배열이 2개뿐이므로
항상 상대방을 반환).

### 분배

인원수와 무관하게 **각자 무조건 7피스**(기존 규칙 그대로). `playerOrder`를 순회하며 7장씩
배분하고 나머지는 보유고. 4인이면 28장 전부 분배되어 보유고 0장.

### 점수 계산

라운드 승자가 **나머지 전원의 남은 핀 합**을 획득한다(기존 "상대 1명의 핀 합"에서
"나머지 N-1명 전원의 핀 합"으로 일반화). 매치 종료 조건(단판/목표점수)은 기존과 동일.

### 블록 판정 타이브레이크

전원이 낼 수 없고 보유고도 비었을 때, 핀 합이 가장 낮은 사람이 승리한다. 동점자가
여럿이면 **라운드 시작자 다음 순서부터 훑어서 처음 만나는 동점자**가 승리한다(2인일 때는
자동으로 "상대방"이 되어 기존 동작과 완전히 동일).

### 시작자 결정

매 매치 시작 시 `playerOrder` 중 무작위로 한 명을 시작자로 정한다(질문에서 확정한 사항).
라운드가 이어질 때는 기존 규칙대로 "직전 라운드 승자"가 다음 라운드 시작자가 된다.

### 함수 시그니처 변경 요약

```ts
export function createMatch(mode: MatchMode, targetScore: number, playerOrder: PlayerId[]): MatchState;
export function startNextRound(state: MatchState): MatchState;               // 시그니처 동일
export function resolveDrawPhase(state: MatchState): MatchState;             // 시그니처 동일
export function playMove(state: MatchState, move: Move): MatchState;         // 시그니처 동일
export function passTurn(state: MatchState): MatchState;                     // 시그니처 동일
```

`createMatch`만 시그니처가 바뀐다(고정 `starter: PlayerId` 파라미터 제거, 내부에서
`playerOrder` 중 무작위로 시작자를 정함). 나머지 함수는 이미 `MatchState`를 받아
`MatchState`를 반환하는 형태라 N인 여부와 무관하게 그대로 동작한다(내부 구현만
`otherPlayer` → `nextPlayer`로 교체).

## AI 난이도 (`engine/ai.ts`)

```ts
export type AiDifficulty = "easy" | "medium" | "hard";

export function chooseAiMove(hand: Tile[], board: BoardState, difficulty: AiDifficulty): Move | null;
```

- **쉬움**: 기존 그대로 — 낼 수 있는 수 중 무작위 선택.
- **보통**: 낼 수 있는 수 중 **타일 핀 합(a+b)이 가장 큰 것**을 우선 선택(동점이면 무작위).
  큰 패를 먼저 처리해서 블록 종료 시 손해를 줄이려는 실제 사람들의 흔한 전략을 모사.
- **어려움**: 상대 손패를 엿보지 않고(반칙 없이), **공개 정보(자기 손패 + 보드에 이미 나온
  타일)만으로** 숫자별 "이미 소모된 정도"를 추정해서 상대가 이어받기 어려운 쪽으로 수를
  선택한다.
  - 0~6 각 숫자는 28피스 전체에서 정확히 7개 타일에 등장한다(그 숫자의 더블 1개 + 다른
    숫자와의 조합 6개).
  - `remaining(value) = 7 - (자기 손패에 있는 개수) - (보드에 이미 나온 개수)` — 숫자가
    작을수록 "상대나 보유고에 남아있을 가능성이 낮다"는 뜻.
  - 각 후보 수에 대해 그 수를 두었을 때 새로 생기는 보드의 **양쪽 끝 값 두 개**의
    `remaining` 합을 계산하고, 그 합이 가장 작은 수를 선택한다(동점이면 무작위). 즉 상대가
    다음 턴에 이어받기 가장 어려운 상태를 만드는 수를 고른다.

세 난이도 모두 `getValidMoves`로 계산한 유효한 수 안에서만 선택하며, 반칙(빈 수 놓기,
상대 손패 열람)은 하지 않는다.

## UI 변경

### `DominoMenu.tsx`

기존 "종료 방식" 필드 위에 두 필드를 추가한다.

- **인원수**: 2 / 3 / 4명 중 선택(라디오, 기본값 4명 — 가장 활기찬 기본 구성).
  AI 수 = 인원수 - 1.
- **난이도**: 쉬움 / 보통 / 어려움 중 선택(라디오, 기본값 보통). 매치 내 모든 AI에게
  동일하게 적용된다(봇마다 다른 난이도는 이번 범위에서 제외 — YAGNI).

`onStart` 콜백 시그니처가 확장된다.

```ts
onStart: (mode: MatchMode, targetScore: number, playerCount: number, difficulty: AiDifficulty) => void;
```

### `Domino.tsx`

- `startMatch`가 `playerOrder = [HUMAN_ID, ...aiIds(playerCount - 1)]`를 구성해
  `createMatch(mode, targetScore, playerOrder)`를 호출한다.
- AI 턴 자동 진행 effect는 `match.currentTurn`이 `HUMAN_ID`가 아니면 AI로 간주하고
  `chooseAiMove(hand, board, difficulty)`를 호출한다(난이도는 컴포넌트 상태로 보관).
- 상대 손패 영역을 AI 인원수만큼 각각 렌더링하고, 각 클러스터에 라벨("AI 1", "AI 2",
  "AI 3")과 현재 턴 여부 하이라이트를 표시한다.
- 점수판을 인원수만큼 전부 나열하도록 변경한다(기존 "나 X : Y AI" 2인 전용 표시 → 참가자
  전원의 이름 + 점수 리스트).
- 라운드/매치 종료 메시지도 승자 id를 사람이 읽을 수 있는 라벨(`playerLabel(id)`)로
  변환해서 보여준다.

## 테스트

`match.test.ts`를 새 시그니처에 맞게 다시 쓴다. 최소 다음을 포함한다.

- `createMatch`: 2인/3인/4인 각각 손패 7장씩 분배 + 보유고 크기(14/7/0) 검증.
- `nextPlayer`: 3인 이상에서 순환이 올바른지(마지막 사람 다음은 첫 사람으로 돌아옴).
- `playMove`: 라운드 승자가 **나머지 전원**의 핀 합을 받는지(3인 이상 케이스 포함).
- `passTurn`(블록): 3인 이상에서 동점 타이브레이크가 "시작자 다음 순서"로 정확히
  해결되는지.
- 기존 2인 시나리오들이 새 시그니처로도 동일한 결과를 내는지(회귀 확인).
- `chooseAiMove`: 난이도별로 각각 최소 한 개씩 — 보통은 핀 합이 가장 큰 유효 수를
  고르는지, 어려움은 `remaining` 합이 가장 작은 수를 고르는지(고정된 손패/보드 픽스처로
  결정적으로 검증).

## 범위 밖

- 온라인 멀티플레이, 랭킹은 다음 설계 문서에서 다룬다.
- 봇별 개별 난이도 설정은 이번 범위에 넣지 않는다(모든 AI가 매치당 동일 난이도).
- 시작 화면 시각 디자인은 이미 완료된 상태를 그대로 유지하고, 인원수/난이도 필드만
  기존 필드와 같은 스타일로 추가한다.
