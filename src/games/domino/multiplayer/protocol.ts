import type { BoardState, MatchMode, Move, PlayerId, RoundResult, Tile } from "../engine/types";

/** 대기실 화면이 그리는 스냅샷 (호스트가 모든 참가자에게 보냄) */
export interface LobbyPlayer {
  playerId: PlayerId;
  nickname: string;
  connected: boolean;
}

export interface LobbySnapshot {
  roomCode: string;
  mode: MatchMode;
  targetScore: number;
  hostPlayerId: PlayerId;
  players: LobbyPlayer[];
}

/**
 * 게임 중 각 참가자에게 보내는 개인화된 뷰.
 * 자기 손패(yourHand)만 실제 타일이 담기고, 다른 사람 손패는 개수만,
 * 보유고는 개수만 공개된다 — 딜러(호스트)만 전체 상태를 안다.
 */
export interface PlayerView {
  mode: MatchMode;
  targetScore: number;
  playerOrder: PlayerId[];
  nicknames: Record<PlayerId, string>;
  hostPlayerId: PlayerId;
  board: BoardState;
  boneyardCount: number;
  handCounts: Record<PlayerId, number>;
  scores: Record<PlayerId, number>;
  currentTurn: PlayerId;
  status: "playing" | "round-over" | "match-over";
  lastRoundResult: RoundResult | null;
  matchWinnerId: PlayerId | null;
  yourHand: Tile[];
}

export type ClientMessage =
  | { t: "join"; playerId: PlayerId; nickname: string }
  | { t: "play"; playerId: PlayerId; move: Move };

export type RejectReason = "full" | "started";

export type HostMessage =
  | { t: "reject"; reason: RejectReason }
  | { t: "lobby"; lobby: LobbySnapshot }
  | { t: "view"; view: PlayerView };
