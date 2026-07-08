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

export function pickClosestAfter(order: PlayerId[], starter: PlayerId, candidates: PlayerId[]): PlayerId {
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
  // 뽑을 게 없어서 아무것도 못 뽑았다면 참조를 그대로 유지해야 한다.
  // 그렇지 않으면 호출부(React effect)가 "상태가 바뀌었다"고 오인해 무한 재실행된다.
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
