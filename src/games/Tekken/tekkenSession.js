// PeerJS(WebRTC) 기반 1:1 온라인 대전 세션.
// - 방장 브라우저가 딜러(단일 진실 공급원)로 30fps 시뮬레이션을 돌리고 결과 상태를 매 틱 전송한다.
// - 참가자는 자기 입력만 매 틱 전송하고, 화면은 방장이 보내주는 상태를 그대로 그린다.
// - 한계: 방장이 창을 닫으면 방이 사라진다. 참가자 쪽 입력은 왕복 지연만큼 늦게 반영된다.

import { Peer } from 'peerjs'
import { createMatchState, stepMatch } from './tekkenHost.js'
import { TICK_INTERVAL_MS } from './tekkenLogic.js'

const PEER_ID_PREFIX = 'mse-tekken-'
const ROOM_CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
const JOIN_TIMEOUT_MS = 15000

function generateRoomCode() {
  let code = ''
  for (let i = 0; i < 6; i++) {
    code += ROOM_CODE_CHARS[Math.floor(Math.random() * ROOM_CODE_CHARS.length)]
  }
  return code
}

function emptyInput() {
  return { left: false, right: false, block: false, jumpPressed: false, punchPressed: false, kickPressed: false }
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

export async function hostRoom(events) {
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

  let guestConn = null
  let localInput = emptyInput()
  let guestInput = emptyInput()
  let matchState = createMatchState()
  let tickTimer = null

  function broadcastLobby() {
    events.onLobby({ roomCode, connected: Boolean(guestConn) })
  }

  function startTicking() {
    if (tickTimer) return
    tickTimer = setInterval(() => {
      matchState = stepMatch(matchState, { p1: localInput, p2: guestInput })
      localInput = { ...localInput, jumpPressed: false, punchPressed: false, kickPressed: false }
      events.onState(matchState)
      if (guestConn) guestConn.send({ t: 'state', matchState })
    }, TICK_INTERVAL_MS)
  }

  peer.on('connection', (conn) => {
    if (guestConn) {
      conn.on('open', () => conn.send({ t: 'reject', reason: 'full' }))
      return
    }
    guestConn = conn
    conn.on('data', (msg) => {
      if (msg?.t === 'input') guestInput = msg.input
    })
    conn.on('close', () => {
      if (guestConn === conn) {
        guestConn = null
        guestInput = emptyInput()
        broadcastLobby()
      }
    })
    conn.on('open', () => {
      conn.send({ t: 'lobby', lobby: { roomCode, connected: true } })
      broadcastLobby()
      startTicking()
    })
  })

  peer.on('error', () => events.onError('연결에 문제가 발생했습니다. 새로고침해 다시 시도해주세요.'))
  peer.on('disconnected', () => peer?.reconnect())

  queueMicrotask(broadcastLobby)

  return {
    roomCode,
    isHost: true,
    sendInput: (input) => {
      localInput = input
    },
    restart: () => {
      matchState = createMatchState()
    },
    close: () => {
      clearInterval(tickTimer)
      peer?.destroy()
      events.onClosed()
    },
  }
}

export async function joinRoomByCode(roomCode, events) {
  const peer = await openPeer()
  const conn = peer.connect(PEER_ID_PREFIX + roomCode.toUpperCase(), { reliable: false })

  let received = false
  const timeout = setTimeout(() => {
    if (!received) {
      peer.destroy()
      events.onError('방에 연결하지 못했습니다. 방 코드를 확인하거나 잠시 후 다시 시도해주세요.')
    }
  }, JOIN_TIMEOUT_MS)

  conn.on('data', (msg) => {
    if (msg?.t === 'reject') {
      received = true
      clearTimeout(timeout)
      peer.destroy()
      events.onError('방이 가득 찼습니다.')
      return
    }
    if (msg?.t === 'lobby') {
      received = true
      clearTimeout(timeout)
      events.onLobby(msg.lobby)
      return
    }
    if (msg?.t === 'state') events.onState(msg.matchState)
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
    isHost: false,
    sendInput: (input) => {
      conn.send({ t: 'input', input })
    },
    restart: () => {},
    close: () => peer.destroy(),
  }
}
