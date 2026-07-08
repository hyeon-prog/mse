import type { BoardEnd, BoardState, Move, Tile } from "./types";

export function createEmptyBoard(): BoardState {
  return { chain: [], leftEnd: null, rightEnd: null };
}

export function getValidMoves(hand: Tile[], board: BoardState): Move[] {
  const { leftEnd, rightEnd } = board;
  if (leftEnd === null || rightEnd === null) {
    return hand.map((tile) => ({ tile, end: "right" as BoardEnd }));
  }
  const moves: Move[] = [];
  for (const tile of hand) {
    if (tile.a === leftEnd || tile.b === leftEnd) {
      moves.push({ tile, end: "left" });
    }
    if (tile.a === rightEnd || tile.b === rightEnd) {
      moves.push({ tile, end: "right" });
    }
  }
  return moves;
}

export function canPlay(hand: Tile[], board: BoardState): boolean {
  return getValidMoves(hand, board).length > 0;
}

function otherValue(tile: Tile, matched: number): number {
  return tile.a === matched ? tile.b : tile.a;
}

export function applyMove(board: BoardState, move: Move): BoardState {
  const { tile } = move;
  const { leftEnd, rightEnd } = board;

  if (leftEnd === null || rightEnd === null) {
    return { chain: [{ tile, flipped: false }], leftEnd: tile.a, rightEnd: tile.b };
  }

  if (move.end === "left") {
    const flipped = tile.a === leftEnd;
    return { chain: [{ tile, flipped }, ...board.chain], leftEnd: otherValue(tile, leftEnd), rightEnd };
  }

  const flipped = tile.b === rightEnd;
  return { chain: [...board.chain, { tile, flipped }], leftEnd, rightEnd: otherValue(tile, rightEnd) };
}

export function pipSum(hand: Tile[]): number {
  return hand.reduce((sum, t) => sum + t.a + t.b, 0);
}
