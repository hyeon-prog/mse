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
