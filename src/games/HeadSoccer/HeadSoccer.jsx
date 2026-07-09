import { useCallback, useEffect, useRef, useState } from 'react'
import { FIELD_HEIGHT, FIELD_WIDTH, WIN_SCORE, createMatch, render, update } from './headSoccerLogic.js'
import './HeadSoccer.css'

const STREAK_KEY = 'mse-headsoccer-streak'

function keysForP1(mode) {
  if (mode === '2p') return { left: 'KeyA', right: 'KeyD', jump: 'KeyW', kick: 'KeyS' }
  return { left: 'ArrowLeft', right: 'ArrowRight', jump: 'ArrowUp', kick: 'ArrowDown' }
}

const KEYS_P2 = { left: 'ArrowLeft', right: 'ArrowRight', jump: 'ArrowUp', kick: 'ArrowDown' }

const ALL_CONTROL_CODES = [
  'KeyA',
  'KeyD',
  'KeyW',
  'KeyS',
  'ArrowLeft',
  'ArrowRight',
  'ArrowUp',
  'ArrowDown',
  'Space',
]

export default function HeadSoccer() {
  const canvasRef = useRef(null)
  const matchRef = useRef(null)
  const rafRef = useRef(null)
  const lastTsRef = useRef(0)
  const reportedOverRef = useRef(false)
  const streakRef = useRef(0)

  const keysRef = useRef(new Set())
  const touchRef = useRef({
    p1: { left: false, right: false, jump: false, kick: false },
    p2: { left: false, right: false, jump: false, kick: false },
  })

  const [phase, setPhase] = useState('idle')
  const [mode, setMode] = useState('1p')
  const [scoreLeft, setScoreLeft] = useState(0)
  const [scoreRight, setScoreRight] = useState(0)
  const [timeLeft, setTimeLeft] = useState(60)
  const [winner, setWinner] = useState(null)
  const [streak, setStreak] = useState(0)

  const readInput = useCallback((codes, touchState, allowSpaceKick) => {
    const keys = keysRef.current
    return {
      left: keys.has(codes.left) || touchState.left,
      right: keys.has(codes.right) || touchState.right,
      jump: keys.has(codes.jump) || touchState.jump,
      kick: keys.has(codes.kick) || (allowSpaceKick && keys.has('Space')) || touchState.kick,
    }
  }, [])

  const loop = useCallback(
    (ts) => {
      const dtMs = Math.min(50, ts - (lastTsRef.current || ts))
      lastTsRef.current = ts
      const match = matchRef.current
      const ctx = canvasRef.current?.getContext('2d')

      if (match && ctx) {
        if (match.status !== 'over') {
          const p1Input = readInput(keysForP1(match.mode), touchRef.current.p1, match.mode !== '2p')
          match.p1.moveDir = (p1Input.left ? -1 : 0) + (p1Input.right ? 1 : 0)
          match.p1.wantsJump = match.p1.wantsJump || p1Input.jump
          match.p1.wantsKick = match.p1.wantsKick || p1Input.kick

          if (match.mode === '2p') {
            const p2Input = readInput(KEYS_P2, touchRef.current.p2, false)
            match.p2.moveDir = (p2Input.left ? -1 : 0) + (p2Input.right ? 1 : 0)
            match.p2.wantsJump = match.p2.wantsJump || p2Input.jump
            match.p2.wantsKick = match.p2.wantsKick || p2Input.kick
          }

          update(match, dtMs)
          setScoreLeft(match.scoreLeft)
          setScoreRight(match.scoreRight)
          setTimeLeft(Math.ceil(match.timeLeftMs / 1000))
        }

        if (match.status === 'over' && !reportedOverRef.current) {
          reportedOverRef.current = true
          if (match.mode === '1p') {
            streakRef.current = match.winner === 'left' ? streakRef.current + 1 : 0
            localStorage.setItem(STREAK_KEY, String(streakRef.current))
            setStreak(streakRef.current)
          }
          setWinner(match.winner)
          setPhase('over')
        }

        render(ctx, match)
      }
      rafRef.current = requestAnimationFrame(loop)
    },
    [readInput],
  )

  useEffect(() => {
    const canvas = canvasRef.current
    const dpr = window.devicePixelRatio || 1
    canvas.width = FIELD_WIDTH * dpr
    canvas.height = FIELD_HEIGHT * dpr
    canvas.getContext('2d').scale(dpr, dpr)

    const raw = localStorage.getItem(STREAK_KEY)
    streakRef.current = raw ? Number(raw) || 0 : 0
    setStreak(streakRef.current)

    rafRef.current = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(rafRef.current)
  }, [loop])

  useEffect(() => {
    const onKeyDown = (e) => {
      if (ALL_CONTROL_CODES.includes(e.code)) e.preventDefault()
      keysRef.current.add(e.code)
    }
    const onKeyUp = (e) => {
      keysRef.current.delete(e.code)
    }
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
    }
  }, [])

  const startGame = (nextMode) => {
    matchRef.current = createMatch(nextMode)
    lastTsRef.current = 0
    reportedOverRef.current = false
    keysRef.current.clear()
    touchRef.current.p1 = { left: false, right: false, jump: false, kick: false }
    touchRef.current.p2 = { left: false, right: false, jump: false, kick: false }
    setMode(nextMode)
    setScoreLeft(0)
    setScoreRight(0)
    setTimeLeft(60)
    setWinner(null)
    setPhase('playing')
  }

  const bindTouch = (player, control) => ({
    onPointerDown: (e) => {
      e.preventDefault()
      touchRef.current[player][control] = true
    },
    onPointerUp: (e) => {
      e.preventDefault()
      touchRef.current[player][control] = false
    },
    onPointerCancel: () => {
      touchRef.current[player][control] = false
    },
    onPointerLeave: () => {
      touchRef.current[player][control] = false
    },
  })

  const resultText =
    mode === '1p' ? (winner === 'left' ? '승리!' : '패배...') : winner === 'left' ? 'PLAYER 1 승리!' : 'PLAYER 2 승리!'

  return (
    <div className="headsoccer-game">
      <div className="headsoccer-hud">
        <span className="headsoccer-score left">{scoreLeft}</span>
        <span className="headsoccer-time">{phase === 'playing' ? `${timeLeft}s` : '헤드사커'}</span>
        <span className="headsoccer-score right">{scoreRight}</span>
      </div>

      <div className="headsoccer-canvas-wrap">
        <canvas ref={canvasRef} className="headsoccer-canvas" />

        {phase === 'idle' && (
          <div className="headsoccer-overlay">
            <div className="headsoccer-result">
              <h3>헤드사커</h3>
              <p>큰 머리로 헤딩하고, 가까이서 킥 키를 눌러 공을 차서 상대 골대에 넣으세요.</p>
              <p className="headsoccer-controls-hint">
                1인용: ← → 이동, ↑ 점프, ↓/스페이스 킥
                <br />
                2인용: P1 A D 이동, W 점프, S 킥 · P2 ← → 이동, ↑ 점프, ↓ 킥
              </p>
              <p className="headsoccer-best">최다 연승: {streak}</p>
              <div className="headsoccer-mode-buttons">
                <button className="btn btn-primary" onClick={() => startGame('1p')}>
                  1인 플레이 (VS CPU)
                </button>
                <button className="btn btn-secondary" onClick={() => startGame('2p')}>
                  2인 플레이 (같은 키보드)
                </button>
              </div>
            </div>
          </div>
        )}

        {phase === 'over' && (
          <div className="headsoccer-overlay">
            <div className="headsoccer-result">
              <h3>{resultText}</h3>
              <p>
                최종 스코어 {scoreLeft} : {scoreRight}
              </p>
              {mode === '1p' && <p className="headsoccer-best">현재 연승: {streak}</p>}
              <div className="headsoccer-mode-buttons">
                <button className="btn btn-primary" onClick={() => startGame(mode)}>
                  다시하기
                </button>
                <button className="btn btn-secondary" onClick={() => setPhase('idle')}>
                  모드 선택
                </button>
              </div>
            </div>
          </div>
        )}

        {phase === 'playing' && (
          <div className="headsoccer-touch-controls">
            <div className="headsoccer-touch-cluster">
              <button className="headsoccer-touch-btn" {...bindTouch('p1', 'left')}>
                ◁
              </button>
              <button className="headsoccer-touch-btn" {...bindTouch('p1', 'jump')}>
                점프
              </button>
              <button className="headsoccer-touch-btn" {...bindTouch('p1', 'right')}>
                ▷
              </button>
              <button className="headsoccer-touch-btn kick" {...bindTouch('p1', 'kick')}>
                킥
              </button>
            </div>

            {mode === '2p' && (
              <div className="headsoccer-touch-cluster">
                <button className="headsoccer-touch-btn" {...bindTouch('p2', 'left')}>
                  ◁
                </button>
                <button className="headsoccer-touch-btn" {...bindTouch('p2', 'jump')}>
                  점프
                </button>
                <button className="headsoccer-touch-btn" {...bindTouch('p2', 'right')}>
                  ▷
                </button>
                <button className="headsoccer-touch-btn kick" {...bindTouch('p2', 'kick')}>
                  킥
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      <p className="headsoccer-help">먼저 {WIN_SCORE}골을 넣거나, 제한시간 종료 시 더 많은 골을 넣은 쪽이 승리합니다.</p>
    </div>
  )
}
