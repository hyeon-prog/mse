import { useEffect, useState } from 'react'
import { addScore } from '../../utils/leaderboard.js'
import {
  LANES,
  advance,
  clampLane,
  createInitialRows,
  isBlocked,
  tickIntervalMs,
} from './bounceBallLogic.js'
import './BounceBall.css'

function initGame() {
  return {
    ballLane: Math.floor(LANES / 2),
    rows: createInitialRows(),
    score: 0,
    status: 'playing',
  }
}

function tick(g) {
  if (g.status !== 'playing') return g
  if (isBlocked(g.rows[0], g.ballLane)) {
    return { ...g, status: 'over' }
  }
  return { ...g, rows: advance(g.rows), score: g.score + 1 }
}

export default function BounceBall() {
  const [game, setGame] = useState(initGame)
  const [playerName, setPlayerName] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')

  useEffect(() => {
    if (game.status !== 'playing') return
    const id = setInterval(() => setGame((prev) => tick(prev)), tickIntervalMs(game.score))
    return () => clearInterval(id)
  }, [game.status, game.score])

  useEffect(() => {
    const onKeyDown = (e) => {
      if (game.status !== 'playing') return
      if (e.key === 'ArrowLeft') {
        e.preventDefault()
        setGame((prev) => ({ ...prev, ballLane: clampLane(prev.ballLane - 1) }))
      } else if (e.key === 'ArrowRight') {
        e.preventDefault()
        setGame((prev) => ({ ...prev, ballLane: clampLane(prev.ballLane + 1) }))
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [game.status])

  const restart = () => {
    setGame(initGame())
    setPlayerName('')
    setSaveError('')
  }

  const handleSaveScore = async () => {
    setSaving(true)
    setSaveError('')
    try {
      await addScore('bounce-ball', playerName, game.score)
      restart()
    } catch {
      setSaveError('저장에 실패했습니다. 다시 시도해주세요.')
    } finally {
      setSaving(false)
    }
  }

  const displayRows = [...game.rows].reverse()

  return (
    <div className="bounce-ball">
      <div className="bounce-ball-hud">
        <span>점수: {game.score}</span>
      </div>

      <div
        className="bounce-ball-board"
        style={{ gridTemplateColumns: `repeat(${LANES}, 32px)` }}
      >
        {displayRows.map((row, r) =>
          Array.from({ length: LANES }, (_, lane) => (
            <div
              key={`row-${r}-${lane}`}
              className={'bb-cell' + (isBlocked(row, lane) ? ' blocked' : '')}
            />
          )),
        )}

        {Array.from({ length: LANES }, (_, lane) => (
          <div key={`ball-${lane}`} className="bb-cell bb-ball-slot">
            {lane === game.ballLane ? <span className="bb-ball" /> : null}
          </div>
        ))}

        {game.status === 'over' && (
          <div className="bounce-ball-overlay">
            <div className="bounce-ball-result">
              <h3>게임 오버</h3>
              <p>점수: {game.score}</p>
              <input
                type="text"
                placeholder="이름을 입력하세요"
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                maxLength={12}
              />
              {saveError && <p className="bounce-ball-error">{saveError}</p>}
              <div className="bounce-ball-result-actions">
                <button className="btn btn-primary" onClick={handleSaveScore} disabled={saving}>
                  {saving ? '저장 중...' : '기록 저장'}
                </button>
                <button className="btn btn-secondary" onClick={restart}>
                  다시하기
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      <p className="bounce-ball-help">← → 로 공을 움직여 장애물을 피하세요.</p>
    </div>
  )
}
