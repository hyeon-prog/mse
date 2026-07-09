// 온라인 멀티플레이에서 방장(호스트) 브라우저가 딜러 역할을 하기 위한 순수 로직.
// PeerJS 연결/전송은 dominoSession.js가 담당하고, 여기는 상태 계산만 한다.
// 참가자에게는 자기 손패와 공개 정보(다른 사람 손패/보유고는 개수만)만 전달된다.

import { canPlay, createMatch, drawSingleTile, getValidMoves, passTurn, playMove, startNextRound } from './dominoLogic.js'

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

/**
 * 현재 턴 플레이어 기준으로 딱 한 단계만 진행한다: 낼 수 없고 보유고가
 * 있으면 한 장 뽑고, 보유고도 없으면 패스한다. 이미 낼 수 있거나 라운드/
 * 매치가 끝났으면 같은 참조를 그대로 반환한다(더 진행할 게 없다는 신호).
 * dominoSession.js가 이 함수를 delay를 두고 반복 호출해서 "한 장씩 천천히
 * 가져가는" 리액션을 온라인에서도 보여준다.
 */
export function stepMatch(match) {
  if (match.status !== 'playing') return match
  if (canPlay(match.hands[match.currentTurn], match.board)) return match
  if (match.boneyard.length > 0) return drawSingleTile(match)
  return passTurn(match)
}

export function startHostMatch(room) {
  if (room.match || room.seats.length < 2) return room
  const playerOrder = room.seats.map((s) => s.playerId)
  return { ...room, match: createMatch(room.mode, room.targetScore, playerOrder) }
}

export function startHostNextRound(room) {
  if (!room.match || room.match.status !== 'round-over') return room
  return { ...room, match: startNextRound(room.match) }
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
  return { ...room, match: playMove(match, move) }
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
    // 상대 손패는 몰라도 "이 상태에서 한 단계 더 진행할 게 남았는지"는
    // 호스트만 판단할 수 있으므로 여기서 계산해서 내려준다.
    isDrawing: match.status === 'playing' && stepMatch(match) !== match,
    status: match.status,
    lastRoundResult: match.lastRoundResult,
    matchWinnerId: match.matchWinnerId,
    yourHand: match.hands[playerId] ?? [],
  }
}
