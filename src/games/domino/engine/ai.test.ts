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
