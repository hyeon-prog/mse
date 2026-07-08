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
