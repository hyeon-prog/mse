import { getValidMoves } from "./board";
import type { BoardState, Move, Tile } from "./types";

export function chooseAiMove(hand: Tile[], board: BoardState): Move | null {
  const moves = getValidMoves(hand, board);
  if (moves.length === 0) return null;
  const index = Math.floor(Math.random() * moves.length);
  return moves[index];
}
