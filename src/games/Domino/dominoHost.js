// 온라인 멀티플레이에서 방장(호스트) 브라우저가 딜러 역할을 하기 위한 순수 로직.
// PeerJS 연결/전송은 dominoSession.js가 담당하고, 여기는 상태 계산만 한다.
// 참가자에게는 자기 손패와 공개 정보(다른 사람 손패/보유고는 개수만)만 전달된다.

import { canPlay, createMatch, getValidMoves, passTurn, playMove, resolveDrawPhase, startNextRound } from './dominoLogic.js'

export const MAX_PLAYERS = 4

export function createHostRoom(roomCode, hostPlayerId, hostNickname, mode, targetScore) {
  return {
    roomCode,
    mode,
    targetScore,
    hostPlayerId,
    seats: [{ playerId: hostPlayerId, nickname: hostNickname, connected: true }],
    match: null,
  }
}

export function joinSeat(room, playerId, nickname) {
  const existing = room.seats.find((s) => s.playerId === playerId)
  if (existing) {
    // 재접속: 같은 playerId면 게임 중이어도 자기 자리로 복귀
    const seats = room.seats.map((s) => (s.playerId === playerId ? { ...s, nickname, connected: true } : s))
    return { ok: true, room: { ...room, seats } }
  }
  if (room.match) return { ok: false, reason: 'started' }
  if (room.seats.length >= MAX_PLAYERS) return { ok: false, reason: 'full' }
  return { ok: true, room: { ...room, seats: [...room.seats, { playerId, nickname, connected: true }] } }
}

export function setSeatConnected(room, playerId, connected) {
  const seats = room.seats.map((s) => (s.playerId === playerId ? { ...s, connected } : s))
  return { ...room, seats }
}

// 현재 턴 플레이어가 낼 수 있을 때까지 자동으로 뽑기/패스를 진행 (싱글플레이 effect와 동일 규칙)
export function advanceMatch(match) {
  let current = match
  for (let guard = 0; guard < 200; guard++) {
    if (current.status !== 'playing') return current
    const drawn = resolveDrawPhase(current)
    if (drawn !== current) {
      current = drawn
      continue
    }
    if (!canPlay(current.hands[current.currentTurn], current.board)) {
      current = passTurn(current)
      continue
    }
    return current
  }
  return current
}

export function startHostMatch(room) {
  if (room.match || room.seats.length < 2) return room
  const playerOrder = room.seats.map((s) => s.playerId)
  return { ...room, match: advanceMatch(createMatch(room.mode, room.targetScore, playerOrder)) }
}

export function startHostNextRound(room) {
  if (!room.match || room.match.status !== 'round-over') return room
  return { ...room, match: advanceMatch(startNextRound(room.match)) }
}

// 유효하지 않은 착수(내 턴 아님, 규칙 위반, 늦게 도착한 중복)는
// 같은 참조의 room을 그대로 반환해 무시된다(멱등 처리).
export function applyPlayerMove(room, playerId, move) {
  const match = room.match
  if (!match || match.status !== 'playing' || match.currentTurn !== playerId) return room
  const valid = getValidMoves(match.hands[playerId], match.board).some(
    (m) => m.tile.a === move.tile.a && m.tile.b === move.tile.b && m.end === move.end,
  )
  if (!valid) return room
  return { ...room, match: advanceMatch(playMove(match, move)) }
}

export function deriveLobby(room) {
  return {
    roomCode: room.roomCode,
    mode: room.mode,
    targetScore: room.targetScore,
    hostPlayerId: room.hostPlayerId,
    players: room.seats.map((s) => ({ playerId: s.playerId, nickname: s.nickname, connected: s.connected })),
  }
}

export function deriveView(room, playerId) {
  const match = room.match
  if (!match) return null
  const nicknames = {}
  for (const seat of room.seats) nicknames[seat.playerId] = seat.nickname
  const handCounts = {}
  for (const id of match.playerOrder) handCounts[id] = match.hands[id].length
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
  }
}
