export interface Tile {
  a: number;
  b: number;
}

export interface PlacedTile {
  tile: Tile;
  /** true면 체인에 이어질 때 손패 표시 순서(a,b)가 뒤집혀서(b,a) 그려진다 */
  flipped: boolean;
}

export type BoardEnd = "left" | "right";

export interface BoardState {
  chain: PlacedTile[];
  leftEnd: number | null;
  rightEnd: number | null;
}

export interface Move {
  tile: Tile;
  end: BoardEnd;
}

export type PlayerId = string;

export type MatchMode = "single-round" | "target-score";

export interface RoundResult {
  winnerId: PlayerId;
  reason: "emptied-hand" | "blocked";
  pointsAwarded: number;
}

export interface MatchState {
  mode: MatchMode;
  targetScore: number;
  playerOrder: PlayerId[];
  hands: Record<PlayerId, Tile[]>;
  scores: Record<PlayerId, number>;
  board: BoardState;
  boneyard: Tile[];
  currentTurn: PlayerId;
  roundStarter: PlayerId;
  status: "playing" | "round-over" | "match-over";
  lastRoundResult: RoundResult | null;
  matchWinnerId: PlayerId | null;
}
