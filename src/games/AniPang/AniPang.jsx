import { useEffect, useState } from 'react'
import { addScore } from '../../utils/leaderboard.js'
import {
  COLS,
  GAME_DURATION,
  createBoard,
  isAdjacent,
  resolveCascades,
  swapCells,
  wouldMatch,
} from './anipangLogic.js'
import './AniPang.css'

function initGame() {
  return {
    board: createBoard(),
    score: 0,
    timeLeft: GAME_DURATION,
    status: 'playing',
  }
}

export default function AniPang() {
  const [game, setGame] = useState(initGame)
  const [selected, setSelected] = useState(null)
  const [shaking, setShaking] = useState([])
  const [playerName, setPlayerName] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')

  useEffect(() => {
    if (game.status !== 'playing') return
    const id = setInterval(() => {
      setGame((prev) => (prev.timeLeft <= 1 ? { ...prev, timeLeft: 0 } : { ...prev, timeLeft: prev.timeLeft - 1 }))
    }, 1000)
    return () => clearInterval(id)
  }, [game.status])

  useEffect(() => {
    if (game.status === 'playing' && game.timeLeft === 0) {
      setGame((prev) => ({ ...prev, status: 'over' }))
    }
  }, [game.timeLeft, game.status])

  const handleCellClick = (r, c) => {
    if (game.status !== 'playing') return

    if (!selected) {
      setSelected({ r, c })
      return
    }

    if (selected.r === r && selected.c === c) {
      setSelected(null)
      return
    }

    if (!isAdjacent(selected, { r, c })) {
      setSelected({ r, c })
      return
    }

    if (wouldMatch(game.board, selected.r, selected.c, r, c)) {
      const swapped = swapCells(game.board, selected.r, selected.c, r, c)
      const { board: resolved, score: gained } = resolveCascades(swapped)
      setGame((prev) => ({ ...prev, board: resolved, score: prev.score + gained }))
    } else {
      const keys = [`${selected.r}-${selected.c}`, `${r}-${c}`]
      setShaking(keys)
      setTimeout(() => setShaking([]), 220)
    }
    setSelected(null)
  }

  const restart = () => {
    setGame(initGame())
    setSelected(null)
    setPlayerName('')
    setSaveError('')
  }

  const handleSaveScore = async () => {
    setSaving(true)
    setSaveError('')
    try {
      await addScore('anipang', playerName, game.score)
      restart()
    } catch {
      setSaveError('저장에 실패했습니다. 다시 시도해주세요.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="anipang">
      <div className="anipang-hud">
        <span>
          점수: <span className="anipang-score-value" key={game.score}>{game.score}</span>
        </span>
        <span>⏱ {game.timeLeft}초</span>
      </div>

      <div
        className="anipang-board"
        style={{ gridTemplateColumns: `repeat(${COLS}, 36px)` }}
      >
        {game.board.map((row, r) =>
          row.map((type, c) => (
            <button
              key={`${r}-${c}`}
              className={
                'ap-cell' +
                (selected?.r === r && selected?.c === c ? ' selected' : '') +
                (shaking.includes(`${r}-${c}`) ? ' shaking' : '')
              }
              onClick={() => handleCellClick(r, c)}
              disabled={game.status !== 'playing'}
            >
              {type}
            </button>
          )),
        )}

        {game.status === 'over' && (
          <div className="anipang-overlay">
            <div className="anipang-result">
              <h3>시간 종료!</h3>
              <p>점수: {game.score}</p>
              <input
                type="text"
                placeholder="이름을 입력하세요"
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                maxLength={12}
              />
              {saveError && <p className="anipang-error">{saveError}</p>}
              <div className="anipang-result-actions">
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

      <p className="anipang-help">인접한 칸을 클릭해 맞바꾸고 3개 이상 맞춰보세요. 제한시간 {GAME_DURATION}초!</p>
    </div>
  )
}
