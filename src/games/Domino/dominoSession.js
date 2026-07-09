// PeerJS(WebRTC) 기반 멀티플레이 세션.
// - 별도 백엔드/계정 불필요: 연결 중개만 PeerJS 공용 무료 서버를 쓰고,
//   게임 데이터는 브라우저끼리 P2P로 직접 주고받는다.
// - 방장 브라우저가 딜러(단일 진실 공급원). 참가자는 자기 손패와 공개 정보만 받는다.
// - 한계: 방장이 창을 닫으면 방이 사라진다.

import { Peer } from 'peerjs'
import {
  applyPlayerMove,
  createHostRoom,
  deriveLobby,
  deriveView,
  joinSeat,
  setSeatConnected,
  startHostMatch,
  startHostNextRound,
} from './dominoHost.js'

const PEER_ID_PREFIX = 'mse-domino-'
const ROOM_CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
const PLAYER_ID_KEY = 'mse:domino:player-id'
const JOIN_TIMEOUT_MS = 15000

// 브라우저마다 고정되는 플레이어 id — 새로고침 후 같은 자리로 복귀할 때 쓴다
export function getMyPlayerId() {
  const existing = localStorage.getItem(PLAYER_ID_KEY)
  if (existing) return existing
  const fresh = `p-${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36)}`
  localStorage.setItem(PLAYER_ID_KEY, fresh)
  return fresh
}

function generateRoomCode() {
  let code = ''
  for (let i = 0; i < 6; i++) {
    code += ROOM_CODE_CHARS[Math.floor(Math.random() * ROOM_CODE_CHARS.length)]
  }
  return code
}

function openPeer(id) {
  return new Promise((resolve, reject) => {
    const peer = id ? new Peer(id) : new Peer()
    const onOpen = () => {
      peer.off('error', onError)
      resolve(peer)
    }
    const onError = (error) => {
      peer.off('open', onOpen)
      peer.destroy()
      reject(error)
    }
    peer.once('open', onOpen)
    peer.once('error', onError)
  })
}

export async function hostRoom(nickname, mode, targetScore, events) {
  const myPlayerId = getMyPlayerId()

  let peer = null
  let roomCode = ''
  for (let attempt = 0; attempt < 5 && !peer; attempt++) {
    roomCode = generateRoomCode()
    try {
      peer = await openPeer(PEER_ID_PREFIX + roomCode)
    } catch (error) {
      if (error?.type !== 'unavailable-id') throw error
    }
  }
  if (!peer) throw new Error('방 코드를 생성하지 못했습니다. 다시 시도해주세요.')

  let room = createHostRoom(roomCode, myPlayerId, nickname, mode, targetScore)
  const connections = new Map()

  function broadcast() {
    if (!room.match) {
      const lobby = deriveLobby(room)
      events.onLobby(lobby)
      for (const [conn, playerId] of connections) {
        if (playerId) conn.send({ t: 'lobby', lobby })
      }
      return
    }
    const hostView = deriveView(room, myPlayerId)
    if (hostView) events.onView(hostView)
    for (const [conn, playerId] of connections) {
      if (!playerId) continue
      const view = deriveView(room, playerId)
      if (view) conn.send({ t: 'view', view })
    }
  }

  peer.on('connection', (conn) => {
    connections.set(conn, null)
    conn.on('data', (msg) => {
      if (msg?.t === 'join') {
        const result = joinSeat(room, msg.playerId, msg.nickname)
        if (!result.ok) {
          conn.send({ t: 'reject', reason: result.reason })
          return
        }
        room = result.room
        connections.set(conn, msg.playerId)
        broadcast()
        return
      }
      if (msg?.t === 'play') {
        const next = applyPlayerMove(room, msg.playerId, msg.move)
        if (next !== room) {
          room = next
          broadcast()
        } else {
          // 무효/중복 착수 — 상태는 그대로 두고 그 사람에게 현재 뷰만 다시 보낸다
          const view = deriveView(room, msg.playerId)
          if (view) conn.send({ t: 'view', view })
        }
      }
    })
    conn.on('close', () => {
      const playerId = connections.get(conn)
      connections.delete(conn)
      if (playerId) {
        room = setSeatConnected(room, playerId, false)
        broadcast()
      }
    })
  })

  peer.on('error', () => {
    events.onError('연결에 문제가 발생했습니다. 새로고침해 다시 시도해주세요.')
  })
  peer.on('disconnected', () => {
    // 중개 서버와 잠시 끊겨도 기존 P2P 연결은 유지된다. 재연결만 시도.
    peer?.reconnect()
  })

  queueMicrotask(broadcast)

  return {
    roomCode,
    myPlayerId,
    isHost: true,
    start: () => {
      const next = startHostMatch(room)
      if (next !== room) {
        room = next
        broadcast()
      }
    },
    nextRound: () => {
      const next = startHostNextRound(room)
      if (next !== room) {
        room = next
        broadcast()
      }
    },
    play: (move) => {
      const next = applyPlayerMove(room, myPlayerId, move)
      if (next !== room) {
        room = next
        broadcast()
      }
    },
    close: () => {
      peer?.destroy()
      events.onClosed()
    },
  }
}

export async function joinRoomByCode(roomCode, nickname, events) {
  const myPlayerId = getMyPlayerId()
  const peer = await openPeer()
  const conn = peer.connect(PEER_ID_PREFIX + roomCode.toUpperCase(), { reliable: true })

  let received = false
  const timeout = setTimeout(() => {
    if (!received) {
      peer.destroy()
      events.onError('방에 연결하지 못했습니다. 방 코드를 확인하거나 잠시 후 다시 시도해주세요.')
    }
  }, JOIN_TIMEOUT_MS)

  conn.on('open', () => {
    conn.send({ t: 'join', playerId: myPlayerId, nickname })
  })

  conn.on('data', (msg) => {
    received = true
    clearTimeout(timeout)
    if (msg?.t === 'reject') {
      peer.destroy()
      events.onError(msg.reason === 'full' ? '방이 가득 찼습니다.' : '이미 시작된 방입니다.')
      return
    }
    if (msg?.t === 'lobby') events.onLobby(msg.lobby)
    if (msg?.t === 'view') events.onView(msg.view)
  })

  conn.on('close', () => {
    clearTimeout(timeout)
    events.onClosed()
  })

  peer.on('error', (error) => {
    clearTimeout(timeout)
    peer.destroy()
    if (error?.type === 'peer-unavailable') {
      events.onError('존재하지 않는 방입니다. 방 코드를 확인해주세요.')
    } else {
      events.onError('연결에 문제가 발생했습니다. 잠시 후 다시 시도해주세요.')
    }
  })

  return {
    roomCode: roomCode.toUpperCase(),
    myPlayerId,
    isHost: false,
    start: () => {},
    nextRound: () => {},
    play: (move) => {
      conn.send({ t: 'play', playerId: myPlayerId, move })
    },
    close: () => {
      peer.destroy()
    },
  }
}
