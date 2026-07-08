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

  it("이미 보유고가 비어 있고 여전히 낼 수 없으면 같은 참조를 그대로 반환한다", () => {
    const state = makeState({
      hands: { human: [{ a: 5, b: 5 }], ai: [] },
      board: { chain: [{ tile: { a: 1, b: 2 }, flipped: false }], leftEnd: 1, rightEnd: 2 },
      boneyard: [],
    });
    expect(resolveDrawPhase(state)).toBe(state);
  });
});

describe("playMove", () => {
  it("마지막 타일을 내면 라운드가 종료되고 상대 핀 합만큼 점수가 오른다", () => {
    const state = makeState({
      mode: "target-score",
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
      mode: "target-score",
      hands: { human: [{ a: 0, b: 0 }], ai: [{ a: 1, b: 1 }, { a: 2, b: 2 }] },
      board: { chain: [{ tile: { a: 5, b: 6 }, flipped: false }], leftEnd: 5, rightEnd: 6 },
      boneyard: [],
      currentTurn: "human",
      roundStarter: "human",
    });
    const result = passTurn(state);
    expect(result.status).toBe("round-over");
    expect(result.lastRoundResult).toEqual({ winnerId: "human", reason: "blocked", pointsAwarded: 6 });
    expect(result.scores.human).toBe(6);
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
