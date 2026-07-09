import { useCallback, useEffect, useRef, useState } from 'react'
import { sfx } from '../../utils/sound.js'
import { TICK_INTERVAL_MS, playActionSfx } from './tekkenLogic.js'
import { hostRoom, joinRoomByCode } from './tekkenSession.js'
import { useIsMobile } from '../../utils/useIsMobile.js'
import TekkenView from './TekkenView.jsx'

const ONLINE_KEYS = { left: 'arrowleft', right: 'arrowright', jump: 'arrowup', block: 'arrowdown', punch: 'z', kick: 'x' }

function initialRoomCodeFromUrl() {
  return new URLSearchParams(window.location.search).get('troom')?.toUpperCase() ?? ''
}

export default function TekkenOnline({ onBack }) {
  const initialCode = initialRoomCodeFromUrl()
  const [stage, setStage] = useState('setup') // setup | room
  const [tab, setTab] = useState(initialCode ? 'join' : 'create')
  const [roomCodeInput, setRoomCodeInput] = useState(initialCode)
  const [busy, setBusy] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [lobby, setLobby] = useState(null)
  const [match, setMatch] = useState(null)
  const [copied, setCopied] = useState(false)
  const isMobile = useIsMobile()

  const sessionRef = useRef(null)
  const heldRef = useRef({ left: false, right: false, block: false })
  const pressedRef = useRef({ jump: false, punch: false, kick: false })
  const prevFightRef = useRef(null)

  useEffect(() => {
    if (!match) return
    const prev = prevFightRef.current
    const curr = match.fight
    if (prev) {
      if (prev.p1.action !== curr.p1.action) playActionSfx(sfx, curr.p1.action, curr.p1.attackType)
      if (prev.p2.action !== curr.p2.action) playActionSfx(sfx, curr.p2.action, curr.p2.attackType)
    }
    prevFightRef.current = curr
  }, [match])

  useEffect(() => {
    if (match?.status === 'match-over') sfx.win()
  }, [match?.status])

  const leaveRoom = useCallback(() => {
    sessionRef.current?.close()
    sessionRef.current = null
    setLobby(null)
    setMatch(null)
    setStage('setup')
  }, [])

  useEffect(() => {
    return () => {
      sessionRef.current?.close()
      sessionRef.current = null
    }
  }, [])

  const events = useCallback(
    () => ({
      onLobby: setLobby,
      onState: setMatch,
      onError: (message) => {
        sessionRef.current = null
        setLobby(null)
        setMatch(null)
        setErrorMessage(message)
        setStage('setup')
      },
      onClosed: () => {
        setLobby(null)
        setMatch(null)
        setErrorMessage('방과의 연결이 끊어졌습니다.')
        setStage('setup')
        sessionRef.current = null
      },
    }),
    [],
  )

  const handleCreate = async () => {
    setBusy(true)
    setErrorMessage('')
    try {
      sessionRef.current = await hostRoom(events())
      setStage('room')
    } catch {
      setErrorMessage('방을 만들지 못했습니다. 잠시 후 다시 시도해주세요.')
    } finally {
      setBusy(false)
    }
  }

  const handleJoin = async () => {
    setBusy(true)
    setErrorMessage('')
    try {
      sessionRef.current = await joinRoomByCode(roomCodeInput.trim(), events())
      setStage('room')
    } catch {
      setErrorMessage('방에 참가하지 못했습니다. 잠시 후 다시 시도해주세요.')
    } finally {
      setBusy(false)
    }
  }

  const session = sessionRef.current
  const isHost = session?.isHost ?? false

  // 입력 샘플링: 매 틱 내 쪽 입력을 세션으로 보낸다 (호스트=로컬 반영, 참가자=전송)
  useEffect(() => {
    if (stage !== 'room' || match?.status !== 'playing') return
    const id = setInterval(() => {
      const input = {
        left: heldRef.current.left,
        right: heldRef.current.right,
        block: heldRef.current.block,
        jumpPressed: pressedRef.current.jump,
        punchPressed: pressedRef.current.punch,
        kickPressed: pressedRef.current.kick,
      }
      pressedRef.current = { jump: false, punch: false, kick: false }
      sessionRef.current?.sendInput(input)
    }, TICK_INTERVAL_MS)
    return () => clearInterval(id)
  }, [stage, match?.status])

  useEffect(() => {
    if (stage !== 'room') return
    const onKeyDown = (e) => {
      const key = e.key.toLowerCase()
      if (key === ONLINE_KEYS.left) {
        heldRef.current.left = true
        e.preventDefault()
      } else if (key === ONLINE_KEYS.right) {
        heldRef.current.right = true
        e.preventDefault()
      } else if (key === ONLINE_KEYS.block) {
        heldRef.current.block = true
        e.preventDefault()
      } else if (key === ONLINE_KEYS.jump) {
        pressedRef.current.jump = true
        e.preventDefault()
      } else if (key === ONLINE_KEYS.punch) {
        pressedRef.current.punch = true
      } else if (key === ONLINE_KEYS.kick) {
        pressedRef.current.kick = true
      }
    }
    const onKeyUp = (e) => {
      const key = e.key.toLowerCase()
      if (key === ONLINE_KEYS.left) heldRef.current.left = false
      else if (key === ONLINE_KEYS.right) heldRef.current.right = false
      else if (key === ONLINE_KEYS.block) heldRef.current.block = false
    }
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
    }
  }, [stage])

  const restart = () => sessionRef.current?.restart()

  const holdTouch = (key, value) => () => {
    heldRef.current[key] = value
  }
  const pressTouch = (key) => () => {
    pressedRef.current[key] = true
  }

  // ---- 화면: 방 만들기 / 참가 ----
  if (stage === 'setup') {
    return (
      <div className="tekken tekken-select">
        <p>친구와 온라인 1:1 대전. 방을 만들고 코드를 공유하세요.</p>

        <div className="tekken-option-buttons">
          <button className={`btn ${tab === 'create' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setTab('create')}>
            방 만들기
          </button>
          <button className={`btn ${tab === 'join' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setTab('join')}>
            코드로 참가
          </button>
        </div>

        {tab === 'create' ? (
          <button className="btn btn-primary" onClick={handleCreate} disabled={busy}>
            {busy ? '만드는 중...' : '방 만들기'}
          </button>
        ) : (
          <>
            <div className="tekken-option-group">
              <span className="tekken-option-label">방 코드</span>
              <input
                type="text"
                className="tekken-target-input"
                placeholder="예: AB12CD"
                value={roomCodeInput}
                maxLength={6}
                onChange={(e) => setRoomCodeInput(e.target.value.toUpperCase())}
              />
            </div>
            <button className="btn btn-primary" onClick={handleJoin} disabled={busy || roomCodeInput.trim().length === 0}>
              {busy ? '참가하는 중...' : '참가하기'}
            </button>
          </>
        )}

        {errorMessage && <p className="tekken-error">{errorMessage}</p>}

        <button className="btn btn-secondary" onClick={onBack}>
          ← 뒤로
        </button>
      </div>
    )
  }

  // ---- 화면: 대기실 (아직 상대방이 연결되어 게임이 시작되기 전) ----
  if (!match) {
    const shareUrl = lobby ? `${window.location.origin}${window.location.pathname}?troom=${lobby.roomCode}` : ''
    const copyLink = () => {
      navigator.clipboard.writeText(shareUrl).then(() => {
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      })
    }
    return (
      <div className="tekken tekken-select">
        {!lobby ? (
          <p>연결하는 중...</p>
        ) : (
          <>
            <h3 className="tekken-lobby-code">방 코드: {lobby.roomCode}</h3>
            <div className="tekken-option-buttons tekken-share-row">
              <input readOnly value={shareUrl} className="tekken-target-input tekken-share-link" />
              <button className="btn btn-secondary" onClick={copyLink}>
                {copied ? '복사됨!' : '링크 복사'}
              </button>
            </div>
            <p className="tekken-help">상대방이 참가하기를 기다리는 중...</p>
          </>
        )}
        <button className="btn btn-secondary" onClick={leaveRoom}>
          나가기
        </button>
      </div>
    )
  }

  // ---- 화면: 게임 ----
  const { fight, p1Wins, p2Wins, status, winnerLabel } = match

  const resultOverlay = status === 'match-over' && (
    <div className="tekken-overlay">
      <div className="tekken-result">
        <h3>{winnerLabel} 승리!</h3>
        <p>
          {p1Wins} : {p2Wins}
        </p>
        <div className="tekken-result-actions">
          {isHost ? (
            <button className="btn btn-primary" onClick={restart}>
              다시하기
            </button>
          ) : (
            <p className="tekken-help">호스트가 다시 시작하기를 기다리는 중...</p>
          )}
          <button className="btn btn-secondary" onClick={leaveRoom}>
            나가기
          </button>
        </div>
      </div>
    </div>
  )

  return (
    <div className="tekken">
      <p className="tekken-you-label">
        당신: {isHost ? 'P1 (왼쪽)' : 'P2 (오른쪽)'}
      </p>
      {isHost && !lobby?.connected && <p className="tekken-error">상대방 연결이 끊어졌습니다.</p>}
      <TekkenView fight={fight} p1Wins={p1Wins} p2Wins={p2Wins} resultOverlay={resultOverlay} />

      {isMobile ? (
        <div className="tekken-touch-controls">
          <div className="tekken-touch-move">
            <button
              className="touch-btn"
              onPointerDown={holdTouch('left', true)}
              onPointerUp={holdTouch('left', false)}
              onPointerLeave={holdTouch('left', false)}
              onPointerCancel={holdTouch('left', false)}
            >
              ◀
            </button>
            <button
              className="touch-btn"
              onPointerDown={holdTouch('right', true)}
              onPointerUp={holdTouch('right', false)}
              onPointerLeave={holdTouch('right', false)}
              onPointerCancel={holdTouch('right', false)}
            >
              ▶
            </button>
          </div>
          <div className="tekken-touch-actions">
            <button
              className="touch-btn touch-btn-round"
              onPointerDown={holdTouch('block', true)}
              onPointerUp={holdTouch('block', false)}
              onPointerLeave={holdTouch('block', false)}
              onPointerCancel={holdTouch('block', false)}
            >
              막기
            </button>
            <button className="touch-btn touch-btn-round" onPointerDown={pressTouch('jump')}>
              점프
            </button>
            <button className="touch-btn touch-btn-round touch-btn-accent" onPointerDown={pressTouch('punch')}>
              펀치
            </button>
            <button className="touch-btn touch-btn-round touch-btn-accent" onPointerDown={pressTouch('kick')}>
              킥
            </button>
          </div>
        </div>
      ) : (
        <p className="tekken-help">← → 이동 · ↑ 점프 · ↓ 막기 · Z 펀치 · X 킥</p>
      )}
    </div>
  )
}
