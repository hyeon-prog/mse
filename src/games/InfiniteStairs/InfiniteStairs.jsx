import { useCallback, useEffect, useRef, useState } from 'react'
import { addScore } from '../../utils/leaderboard.js'
import { sfx } from '../../utils/sound.js'
import { LOGICAL_HEIGHT, LOGICAL_WIDTH, createGame, moveLane, render, update } from './infiniteStairsLogic.js'
import './InfiniteStairs.css'

const BEST_KEY = 'mse-infinite-stairs-best'

export default function InfiniteStairs() {
  const canvasRef = useRef(null)
  const gameRef = useRef(null)
  const rafRef = useRef(null)
  const lastTsRef = useRef(0)
  const bestScoreRef = useRef(0)
  const reportedOverRef = useRef(false)

  const [phase, setPhase] = useState('idle')
  const [finalScore, setFinalScore] = useState(0)
  const [bestScore, setBestScore] = useState(0)
  const [playerName, setPlayerName] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')

  const loop = useCallback((ts) => {
    const dt = Math.min(0.05, (ts - (lastTsRef.current || ts)) / 1000)
    lastTsRef.current = ts
    const game = gameRef.current
    const ctx = canvasRef.current?.getContext('2d')
    if (game && ctx) {
      if (game.status === 'playing') {
        update(game, dt)
      }
      // status can also flip to 'over' from moveLane() (called outside this loop, on
      // keydown/pointerdown), so this check must not be nested inside the block above.
      if (game.status === 'over' && !reportedOverRef.current) {
        reportedOverRef.current = true
        sfx.lose()
        setFinalScore(game.score)
        if (game.score > bestScoreRef.current) {
          bestScoreRef.current = game.score
          localStorage.setItem(BEST_KEY, String(game.score))
          setBestScore(game.score)
        }
        setPhase('over')
      }
      render(ctx, game)
    }
    rafRef.current = requestAnimationFrame(loop)
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    const dpr = window.devicePixelRatio || 1
    canvas.width = LOGICAL_WIDTH * dpr
    canvas.height = LOGICAL_HEIGHT * dpr
    canvas.getContext('2d').scale(dpr, dpr)

    const raw = localStorage.getItem(BEST_KEY)
    const initialBest = raw ? Number(raw) || 0 : 0
    bestScoreRef.current = initialBest
    setBestScore(initialBest)

    gameRef.current = createGame()
    gameRef.current.status = 'idle'
    rafRef.current = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(rafRef.current)
  }, [loop])

  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.repeat) return
      if (e.key === 'ArrowLeft') {
        e.preventDefault()
        moveLane(gameRef.current, -1)
      } else if (e.key === 'ArrowRight') {
        e.preventDefault()
        moveLane(gameRef.current, 1)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  const startGame = () => {
    gameRef.current = createGame()
    lastTsRef.current = 0
    reportedOverRef.current = false
    setPlayerName('')
    setSaveError('')
    setPhase('playing')
  }

  const handleSaveScore = async () => {
    setSaving(true)
    setSaveError('')
    try {
      await addScore('infinite-stairs', playerName, finalScore)
      startGame()
    } catch {
      setSaveError('저장에 실패했습니다. 다시 시도해주세요.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="infinite-stairs">
      <div className="stairs-canvas-wrap">
        <canvas ref={canvasRef} className="stairs-canvas" />

        <div className="stairs-touch-zone left" onPointerDown={() => moveLane(gameRef.current, -1)} />
        <div className="stairs-touch-zone right" onPointerDown={() => moveLane(gameRef.current, 1)} />

        {phase === 'idle' && (
          <div className="infinite-stairs-overlay">
            <div className="infinite-stairs-result">
              <h3>무한의 계단</h3>
              <p>최고 점수: {bestScore}</p>
              <button className="btn btn-primary" onClick={startGame}>
                시작하기
              </button>
            </div>
          </div>
        )}

        {phase === 'over' && (
          <div className="infinite-stairs-overlay">
            <div className="infinite-stairs-result">
              <h3>떨어졌습니다!</h3>
              <p>이번 점수: {finalScore}</p>
              <p>최고 점수: {bestScore}</p>
              <input
                type="text"
                placeholder="이름을 입력하세요"
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                maxLength={12}
              />
              {saveError && <p className="infinite-stairs-error">{saveError}</p>}
              <div className="infinite-stairs-result-actions">
                <button className="btn btn-primary" onClick={handleSaveScore} disabled={saving}>
                  {saving ? '저장 중...' : '기록 저장'}
                </button>
                <button className="btn btn-secondary" onClick={startGame}>
                  다시하기
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      <p className="infinite-stairs-help">
        ← → 키 또는 화면 좌/우 터치로 한 걸음씩 올라가세요. 발판이 없는 곳으로 가면 떨어지고, 너무 오래
        머뭇거리면 아래에서 가시가 올라와 잡힙니다.
      </p>
    </div>
  )
}
