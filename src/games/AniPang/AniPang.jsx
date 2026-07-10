import { useEffect, useRef, useState } from 'react'
import { addScore } from '../../utils/leaderboard.js'
import { sfx } from '../../utils/sound.js'
import {
  COLS,
  GAME_DURATION,
  ROWS,
  clearMatches,
  collapse,
  createBoard,
  findMatches,
  isAdjacent,
  swapCells,
  wouldMatch,
} from './anipangLogic.js'
import './AniPang.css'

const POP_DURATION = 280
const SLIDE_DURATION = 160
const DRAG_THRESHOLD = 14

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
  const [popping, setPopping] = useState([])
  const [sliding, setSliding] = useState({})
  const [animating, setAnimating] = useState(false)
  const [playerName, setPlayerName] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const dragRef = useRef(null)
  const gameRef = useRef(game)
  gameRef.current = game

  useEffect(() => {
    if (game.status !== 'playing') return
    const id = setInterval(() => {
      setGame((prev) => (prev.timeLeft <= 1 ? { ...prev, timeLeft: 0 } : { ...prev, timeLeft: prev.timeLeft - 1 }))
    }, 1000)
    return () => clearInterval(id)
  }, [game.status])

  useEffect(() => {
    if (game.status === 'playing' && game.timeLeft === 0) {
      sfx.lose()
      setGame((prev) => ({ ...prev, status: 'over' }))
    }
  }, [game.timeLeft, game.status])

  const runCascade = (board, combo) => {
    const matched = findMatches(board)
    if (matched.size === 0) {
      setAnimating(false)
      return
    }
    sfx.combo(combo + 1)
    setPopping(Array.from(matched))
    setTimeout(() => {
      const scoreGain = matched.size * 10 * (combo + 1)
      const collapsed = collapse(clearMatches(board, matched))
      setPopping([])
      setGame((prev) => ({ ...prev, board: collapsed, score: prev.score + scoreGain }))
      runCascade(collapsed, combo + 1)
    }, POP_DURATION)
  }

  const attemptSwap = (r1, c1, r2, c2) => {
    if (!isAdjacent({ r: r1, c: c1 }, { r: r2, c: c2 })) return
    const board = gameRef.current.board
    if (!wouldMatch(board, r1, c1, r2, c2)) {
      sfx.invalid()
      setShaking([`${r1}-${c1}`, `${r2}-${c2}`])
      setTimeout(() => setShaking([]), 220)
      return
    }

    setAnimating(true)
    const dr = r2 - r1
    const dc = c2 - c1
    // 실제로 자리를 맞바꾸기 전에, 두 칸을 각자 상대 위치까지 슬라이드시켜 보여준다.
    setSliding({
      [`${r1}-${c1}`]: { tx: dc, ty: dr },
      [`${r2}-${c2}`]: { tx: -dc, ty: -dr },
    })
    setTimeout(() => {
      setSliding({})
      const swapped = swapCells(board, r1, c1, r2, c2)
      setGame((prev) => ({ ...prev, board: swapped }))
      runCascade(swapped, 0)
    }, SLIDE_DURATION)
  }

  const handleTap = (r, c) => {
    if (gameRef.current.status !== 'playing' || animating) return

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

    attemptSwap(selected.r, selected.c, r, c)
    setSelected(null)
  }

  const handlePointerDown = (e, r, c) => {
    if (gameRef.current.status !== 'playing' || animating) return
    if (e.pointerType === 'mouse' && e.button !== 0) return
    e.currentTarget.setPointerCapture?.(e.pointerId)
    dragRef.current = { r, c, x: e.clientX, y: e.clientY, dragged: false }
  }

  const handlePointerMove = (e) => {
    const drag = dragRef.current
    if (!drag || drag.dragged) return
    const dx = e.clientX - drag.x
    const dy = e.clientY - drag.y
    if (Math.max(Math.abs(dx), Math.abs(dy)) < DRAG_THRESHOLD) return

    let nr = drag.r
    let nc = drag.c
    if (Math.abs(dx) > Math.abs(dy)) nc += dx > 0 ? 1 : -1
    else nr += dy > 0 ? 1 : -1

    drag.dragged = true
    if (nr < 0 || nr >= ROWS || nc < 0 || nc >= COLS) return
    setSelected(null)
    attemptSwap(drag.r, drag.c, nr, nc)
  }

  const handlePointerUp = (e, r, c) => {
    const drag = dragRef.current
    dragRef.current = null
    if (!drag || drag.dragged) return
    handleTap(r, c)
  }

  const restart = () => {
    setGame(initGame())
    setSelected(null)
    setPopping([])
    setSliding({})
    setAnimating(false)
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

      <div className="anipang-board">
        {game.board.map((row, r) =>
          row.map((type, c) => {
            const key = `${r}-${c}`
            const isPopping = popping.includes(key)
            const slide = sliding[key]
            return (
              <button
                key={key}
                className={
                  'ap-cell' +
                  (selected?.r === r && selected?.c === c ? ' selected' : '') +
                  (shaking.includes(key) ? ' shaking' : '') +
                  (isPopping ? ' popping' : '') +
                  (slide ? ' sliding' : '')
                }
                style={slide ? { transform: `translate(${slide.tx * 100}%, ${slide.ty * 100}%)` } : undefined}
                onPointerDown={(e) => handlePointerDown(e, r, c)}
                onPointerMove={handlePointerMove}
                onPointerUp={(e) => handlePointerUp(e, r, c)}
                disabled={game.status !== 'playing' || animating}
              >
                {type}
                {isPopping && (
                  <span className="ap-burst">
                    {Array.from({ length: 6 }, (_, i) => (
                      <span key={i} className="ap-spark" style={{ '--i': i }} />
                    ))}
                  </span>
                )}
              </button>
            )
          }),
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
