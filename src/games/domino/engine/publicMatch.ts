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
