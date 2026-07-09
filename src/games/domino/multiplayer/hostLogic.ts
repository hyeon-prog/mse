import { canPlay, getValidMoves } from "../engine/board";
import { createMatch, passTurn, playMove, resolveDrawPhase, startNextRound } from "../engine/match";
import type { MatchMode, MatchState, Move, PlayerId } from "../engine/types";
import type { LobbySnapshot, PlayerView, RejectReason } from "./protocol";

/**
 * 호스트(방장) 브라우저가 딜러 역할을 하기 위한 순수 로직.
 * PeerJS 연결/전송은 session.ts가 담당하고, 여기는 상태 계산만 한다
 * — 그래서 전부 vitest로 검증할 수 있다.
 */

export const MAX_PLAYERS = 4;

export interface Seat {
  playerId: PlayerId;
  nickname: string;
  connected: boolean;
}

export interface HostRoom {
  roomCode: string;
  mode: MatchMode;
  targetScore: number;
  hostPlayerId: PlayerId;
  seats: Seat[];
  match: MatchState | null;
}

export function createHostRoom(
  roomCode: string,
  hostPlayerId: PlayerId,
  hostNickname: string,
  mode: MatchMode,
  targetScore: number
): HostRoom {
  return {
    roomCode,
    mode,
    targetScore,
    hostPlayerId,
    seats: [{ playerId: hostPlayerId, nickname: hostNickname, connected: true }],
    match: null,
  };
}

export type JoinResult = { ok: true; room: HostRoom } | { ok: false; reason: RejectReason };

export function joinSeat(room: HostRoom, playerId: PlayerId, nickname: string): JoinResult {
  const existing = room.seats.find((s) => s.playerId === playerId);
  if (existing) {
    // 재접속: 같은 playerId면 게임 중이어도 자리로 복귀시킨다
    const seats = room.seats.map((s) =>
      s.playerId === playerId ? { ...s, nickname, connected: true } : s
    );
    return { ok: true, room: { ...room, seats } };
  }
  if (room.match) return { ok: false, reason: "started" };
  if (room.seats.length >= MAX_PLAYERS) return { ok: false, reason: "full" };
  return { ok: true, room: { ...room, seats: [...room.seats, { playerId, nickname, connected: true }] } };
}

export function setSeatConnected(room: HostRoom, playerId: PlayerId, connected: boolean): HostRoom {
  const seats = room.seats.map((s) => (s.playerId === playerId ? { ...s, connected } : s));
  return { ...room, seats };
}

/**
 * 현재 턴 플레이어가 낼 수 있을 때까지 자동으로 뽑기/패스를 진행한다.
 * (로컬 vs AI 화면의 turn-progression effect와 동일한 규칙을 호스트가 대행)
 */
export function advanceMatch(match: MatchState): MatchState {
  let current = match;
  for (let guard = 0; guard < 200; guard++) {
    if (current.status !== "playing") return current;
    const drawn = resolveDrawPhase(current);
    if (drawn !== current) {
      current = drawn;
      continue;
    }
    if (!canPlay(current.hands[current.currentTurn], current.board)) {
      current = passTurn(current);
      continue;
    }
    return current;
  }
  return current;
}

export function startHostMatch(room: HostRoom): HostRoom {
  if (room.match || room.seats.length < 2) return room;
  const playerOrder = room.seats.map((s) => s.playerId);
  const match = advanceMatch(createMatch(room.mode, room.targetScore, playerOrder));
  return { ...room, match };
}

export function startHostNextRound(room: HostRoom): HostRoom {
  if (!room.match || room.match.status !== "round-over") return room;
  return { ...room, match: advanceMatch(startNextRound(room.match)) };
}

/**
 * 착수 적용. 유효하지 않으면(내 턴 아님, 규칙 위반, 중복 도착 등)
 * 같은 참조의 room을 그대로 반환한다 — 호출부는 참조 비교로 무시 여부를 안다.
 */
export function applyPlayerMove(room: HostRoom, playerId: PlayerId, move: Move): HostRoom {
  const match = room.match;
  if (!match || match.status !== "playing" || match.currentTurn !== playerId) return room;
  const valid = getValidMoves(match.hands[playerId], match.board).some(
    (m) => m.tile.a === move.tile.a && m.tile.b === move.tile.b && m.end === move.end
  );
  if (!valid) return room;
  return { ...room, match: advanceMatch(playMove(match, move)) };
}

export function deriveLobby(room: HostRoom): LobbySnapshot {
  return {
    roomCode: room.roomCode,
    mode: room.mode,
    targetScore: room.targetScore,
    hostPlayerId: room.hostPlayerId,
    players: room.seats.map((s) => ({ playerId: s.playerId, nickname: s.nickname, connected: s.connected })),
  };
}

export function deriveView(room: HostRoom, playerId: PlayerId): PlayerView | null {
  const match = room.match;
  if (!match) return null;
  const nicknames: Record<PlayerId, string> = {};
  for (const seat of room.seats) nicknames[seat.playerId] = seat.nickname;
  const handCounts: Record<PlayerId, number> = {};
  for (const id of match.playerOrder) handCounts[id] = match.hands[id].length;
  return {
    mode: match.mode,
    targetScore: match.targetScore,
    playerOrder: match.playerOrder,
    nicknames,
    hostPlayerId: room.hostPlayerId,
    board: match.board,
    boneyardCount: match.boneyard.length,
    handCounts,
    scores: match.scores,
    currentTurn: match.currentTurn,
    status: match.status,
    lastRoundResult: match.lastRoundResult,
    matchWinnerId: match.matchWinnerId,
    yourHand: match.hands[playerId] ?? [],
  };
}
