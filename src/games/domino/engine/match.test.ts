import { describe, expect, it } from "vitest";
import { createEmptyBoard } from "./board";
import { createMatch, nextPlayer, passTurn, playMove, resolveDrawPhase, startNextRound } from "./match";
import type { MatchState, PlayerId } from "./types";

function makeState(overrides: Partial<MatchState> = {}): MatchState {
  return {
    mode: "single-round",
    targetScore: 100,
    playerOrder: ["human", "ai"],
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

  it("3인 블록 상황에서 시작자 다음 순서로 동점을 해소한다", () => {
    const state = makeState({
      mode: "target-score",
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
});
