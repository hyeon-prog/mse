import { applyMove, getValidMoves } from "./board";
import type { BoardState, Move, Tile } from "./types";

export type AiDifficulty = "easy" | "medium" | "hard";

const TOTAL_TILES_PER_VALUE = 7;

function pickRandom(moves: Move[]): Move {
  return moves[Math.floor(Math.random() * moves.length)];
}

function tilePipSum(tile: Tile): number {
  return tile.a + tile.b;
}

function pickHighestPipSum(moves: Move[]): Move {
  const maxSum = Math.max(...moves.map((m) => tilePipSum(m.tile)));
  const best = moves.filter((m) => tilePipSum(m.tile) === maxSum);
  return pickRandom(best);
}

function countOccurrences(value: number, tiles: Tile[]): number {
  return tiles.filter((t) => t.a === value || t.b === value).length;
}

function remainingUnseen(value: number, hand: Tile[], board: BoardState): number {
  const boardTiles = board.chain.map((p) => p.tile);
  return TOTAL_TILES_PER_VALUE - countOccurrences(value, hand) - countOccurrences(value, boardTiles);
}

function pickMostBlocking(moves: Move[], hand: Tile[], board: BoardState): Move {
  const scored = moves.map((move) => {
    const resultBoard = applyMove(board, move);
    const remainingHand = hand.filter((t) => !(t.a === move.tile.a && t.b === move.tile.b));
    const leftScore =
      resultBoard.leftEnd === null ? 0 : remainingUnseen(resultBoard.leftEnd, remainingHand, resultBoard);
    const rightScore =
      resultBoard.rightEnd === null ? 0 : remainingUnseen(resultBoard.rightEnd, remainingHand, resultBoard);
    return { move, score: leftScore + rightScore };
  });
  const minScore = Math.min(...scored.map((s) => s.score));
  const best = scored.filter((s) => s.score === minScore).map((s) => s.move);
  return pickRandom(best);
}

export function chooseAiMove(hand: Tile[], board: BoardState, difficulty: AiDifficulty = "easy"): Move | null {
  const moves = getValidMoves(hand, board);
  if (moves.length === 0) return null;
  if (difficulty === "medium") return pickHighestPipSum(moves);
  if (difficulty === "hard") return pickMostBlocking(moves, hand, board);
  return pickRandom(moves);
}
