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
