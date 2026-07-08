import type { PublicMatchState } from "../engine/publicMatch";

export interface RoomPlayer {
  nickname: string;
  seat: number;
}

export interface RoomState {
  hostId: string;
  mode: "single-round" | "target-score";
  targetScore: number;
  players: Record<string, RoomPlayer>;
  public: PublicMatchState | null;
}

export interface LeaderboardEntry {
  nickname: string;
  bestScore: number;
  updatedAt: number;
}
