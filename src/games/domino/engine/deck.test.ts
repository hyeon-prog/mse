import { describe, expect, it } from "vitest";
import { createDeck, shuffle, HAND_SIZE } from "./deck";

describe("createDeck", () => {
  it("28개의 서로 다른 타일을 생성한다", () => {
    const deck = createDeck();
    expect(deck).toHaveLength(28);
    const keys = new Set(deck.map((t) => `${t.a}-${t.b}`));
    expect(keys.size).toBe(28);
  });

  it("0-0부터 6-6까지 모든 조합을 포함한다", () => {
    const deck = createDeck();
    for (let a = 0; a <= 6; a++) {
      for (let b = a; b <= 6; b++) {
        expect(deck.some((t) => t.a === a && t.b === b)).toBe(true);
      }
    }
  });
});

describe("shuffle", () => {
  it("길이와 구성 요소는 그대로 유지한 채 배열을 반환한다", () => {
    const deck = createDeck();
    const shuffled = shuffle(deck);
    expect(shuffled).toHaveLength(deck.length);
    const sortKey = (t: { a: number; b: number }) => `${t.a}-${t.b}`;
    expect([...shuffled].sort((x, y) => (sortKey(x) > sortKey(y) ? 1 : -1))).toEqual(
      [...deck].sort((x, y) => (sortKey(x) > sortKey(y) ? 1 : -1))
    );
  });

  it("원본 배열을 변경하지 않는다", () => {
    const deck = createDeck();
    const original = [...deck];
    shuffle(deck);
    expect(deck).toEqual(original);
  });
});

describe("HAND_SIZE", () => {
  it("7이다", () => {
    expect(HAND_SIZE).toBe(7);
  });
});
