import { describe, expect, it } from "vitest";
import { applyMove, canPlay, createEmptyBoard, getValidMoves, pipSum } from "./board";

describe("createEmptyBoard", () => {
  it("빈 체인과 null 끝값을 가진다", () => {
    expect(createEmptyBoard()).toEqual({ chain: [], leftEnd: null, rightEnd: null });
  });
});

describe("getValidMoves", () => {
  it("빈 보드에서는 손패의 모든 타일이 유효하다", () => {
    const hand = [{ a: 1, b: 2 }, { a: 3, b: 4 }];
    const moves = getValidMoves(hand, createEmptyBoard());
    expect(moves).toEqual([
      { tile: { a: 1, b: 2 }, end: "right" },
      { tile: { a: 3, b: 4 }, end: "right" },
    ]);
  });

  it("양쪽 끝에 맞는 타일은 두 개의 수로 계산된다", () => {
    const board = { chain: [{ tile: { a: 3, b: 3 }, flipped: false }], leftEnd: 3, rightEnd: 3 };
    const moves = getValidMoves([{ a: 3, b: 5 }], board);
    expect(moves).toEqual([
      { tile: { a: 3, b: 5 }, end: "left" },
      { tile: { a: 3, b: 5 }, end: "right" },
    ]);
  });

  it("어느 끝과도 맞지 않으면 빈 배열을 반환한다", () => {
    const board = { chain: [{ tile: { a: 1, b: 2 }, flipped: false }], leftEnd: 1, rightEnd: 2 };
    expect(getValidMoves([{ a: 5, b: 6 }], board)).toEqual([]);
  });
});

describe("canPlay", () => {
  it("유효한 수가 있으면 true를 반환한다", () => {
    const board = { chain: [{ tile: { a: 1, b: 2 }, flipped: false }], leftEnd: 1, rightEnd: 2 };
    expect(canPlay([{ a: 2, b: 6 }], board)).toBe(true);
  });

  it("유효한 수가 없으면 false를 반환한다", () => {
    const board = { chain: [{ tile: { a: 1, b: 2 }, flipped: false }], leftEnd: 1, rightEnd: 2 };
    expect(canPlay([{ a: 5, b: 6 }], board)).toBe(false);
  });
});

describe("applyMove", () => {
  it("빈 보드에 첫 타일을 놓으면 양 끝이 타일 값으로 설정된다", () => {
    const result = applyMove(createEmptyBoard(), { tile: { a: 2, b: 5 }, end: "right" });
    expect(result).toEqual({ chain: [{ tile: { a: 2, b: 5 }, flipped: false }], leftEnd: 2, rightEnd: 5 });
  });

  it("오른쪽 끝에 이어 붙이면 새 끝값이 갱신된다", () => {
    const board = { chain: [{ tile: { a: 2, b: 5 }, flipped: false }], leftEnd: 2, rightEnd: 5 };
    const result = applyMove(board, { tile: { a: 5, b: 6 }, end: "right" });
    expect(result.rightEnd).toBe(6);
    expect(result.leftEnd).toBe(2);
    expect(result.chain).toHaveLength(2);
    expect(result.chain[1]).toEqual({ tile: { a: 5, b: 6 }, flipped: false });
  });

  it("왼쪽 끝에 이어 붙이면 새 끝값이 갱신된다", () => {
    const board = { chain: [{ tile: { a: 2, b: 5 }, flipped: false }], leftEnd: 2, rightEnd: 5 };
    const result = applyMove(board, { tile: { a: 1, b: 2 }, end: "left" });
    expect(result.leftEnd).toBe(1);
    expect(result.chain[0]).toEqual({ tile: { a: 1, b: 2 }, flipped: false });
  });

  it("매칭 핀이 타일의 첫 번째 값이면 뒤집혀 표시된다", () => {
    const board = { chain: [{ tile: { a: 2, b: 5 }, flipped: false }], leftEnd: 2, rightEnd: 5 };
    const result = applyMove(board, { tile: { a: 2, b: 1 }, end: "left" });
    expect(result.leftEnd).toBe(1);
    expect(result.chain[0]).toEqual({ tile: { a: 2, b: 1 }, flipped: true });
  });
});

describe("pipSum", () => {
  it("손패 핀 합을 계산한다", () => {
    expect(pipSum([{ a: 1, b: 2 }, { a: 3, b: 3 }])).toBe(9);
  });

  it("빈 손패는 0을 반환한다", () => {
    expect(pipSum([])).toBe(0);
  });
});
