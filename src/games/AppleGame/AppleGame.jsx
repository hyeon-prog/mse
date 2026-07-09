import { useCallback, useEffect, useRef, useState } from 'react'
import { addScore } from '../../utils/leaderboard.js'
import { sfx } from '../../utils/sound.js'
import './AppleGame.css'

const ROWS = 10
const COLS = 17
const GAME_TIME = 120

function createBoard() {
  return Array.from({ length: ROWS * COLS }, () => ({
    value: Math.floor(Math.random() * 9) + 1,
    removed: false,
    popping: false,
  }))
}

function indexOf(row, col) {
  return row * COLS + col
}

export default function AppleGame() {
  const [board, setBoard] = useState(createBoard)
  const [score, setScore] = useState(0)
  const [timeLeft, setTimeLeft] = useState(GAME_TIME)
  const [status, setStatus] = useState('idle') // idle | playing | over
  const [selection, setSelection] = useState(null) // {r1,c1,r2,c2}
  const [invalidCells, setInvalidCells] = useState([])
  const [playerName, setPlayerName] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const draggingRef = useRef(false)
  const gridRef = useRef(null)

  useEffect(() => {
    if (status !== 'playing') return
    if (timeLeft <= 0) {
      sfx.lose()
      setStatus('over')
      return
    }
    const timer = setTimeout(() => setTimeLeft((t) => t - 1), 1000)
    return () => clearTimeout(timer)
  }, [status, timeLeft])

  const startGame = () => {
    setBoard(createBoard())
    setScore(0)
    setTimeLeft(GAME_TIME)
    setStatus('playing')
    setSelection(null)
  }

  const cellFromPoint = useCallback((x, y) => {
    const el = document.elementFromPoint(x, y)
    if (!el || !el.dataset || el.dataset.row === undefined) return null
    return { row: Number(el.dataset.row), col: Number(el.dataset.col) }
  }, [])

  const handlePointerDown = (row, col) => (e) => {
    if (status !== 'playing') return
    e.preventDefault()
    draggingRef.current = true
    setSelection({ r1: row, c1: col, r2: row, c2: col })
  }

  const handlePointerMove = (e) => {
    if (!draggingRef.current) return
    const cell = cellFromPoint(e.clientX, e.clientY)
    if (!cell) return
    setSelection((sel) => (sel ? { ...sel, r2: cell.row, c2: cell.col } : sel))
  }

  const handlePointerUp = () => {
    if (!draggingRef.current) return
    draggingRef.current = false
    const sel = selection
    setSelection(null)
    if (!sel) return

    const minR = Math.min(sel.r1, sel.r2)
    const maxR = Math.max(sel.r1, sel.r2)
    const minC = Math.min(sel.c1, sel.c2)
    const maxC = Math.max(sel.c1, sel.c2)

    let sum = 0
    let count = 0
    const indices = []
    for (let r = minR; r <= maxR; r++) {
      for (let c = minC; c <= maxC; c++) {
        const idx = indexOf(r, c)
        const cellData = board[idx]
        if (!cellData.removed) {
          sum += cellData.value
          count += 1
          indices.push(idx)
        }
      }
    }

    if (sum === 10 && count > 0) {
      sfx.pop()
      setBoard((prev) => {
        const next = [...prev]
        indices.forEach((idx) => {
          next[idx] = { ...next[idx], popping: true }
        })
        return next
      })
      setScore((s) => s + count)
      setTimeout(() => {
        setBoard((prev) => {
          const next = [...prev]
          indices.forEach((idx) => {
            next[idx] = { ...next[idx], removed: true, popping: false }
          })
          return next
        })
      }, 180)
    } else if (count > 0) {
      sfx.invalid()
      setInvalidCells(indices)
      setTimeout(() => setInvalidCells([]), 220)
    }
  }

  useEffect(() => {
    window.addEventListener('pointermove', handlePointerMove)
    window.addEventListener('pointerup', handlePointerUp)
    return () => {
      window.removeEventListener('pointermove', handlePointerMove)
      window.removeEventListener('pointerup', handlePointerUp)
    }
  })

  const isSelected = (row, col) => {
    if (!selection) return false
    const minR = Math.min(selection.r1, selection.r2)
    const maxR = Math.max(selection.r1, selection.r2)
    const minC = Math.min(selection.c1, selection.c2)
    const maxC = Math.max(selection.c1, selection.c2)
    return row >= minR && row <= maxR && col >= minC && col <= maxC
  }

  const handleSaveScore = async () => {
    setSaving(true)
    setSaveError('')
    try {
      await addScore('apple-game', playerName, score)
      setStatus('idle')
    } catch {
      setSaveError('저장에 실패했습니다. 다시 시도해주세요.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="apple-game">
      <div className="apple-game-hud">
        <span>
          점수: <span className="apple-game-score-value" key={score}>{score}</span>
        </span>
        <span className={timeLeft <= 10 ? 'apple-game-time-low' : ''}>남은 시간: {timeLeft}s</span>
      </div>

      <div className="apple-game-grid" ref={gridRef}>
        {Array.from({ length: ROWS }).map((_, row) => (
          <div className="apple-game-row" key={row}>
            {Array.from({ length: COLS }).map((_, col) => {
              const idx = indexOf(row, col)
              const cellData = board[idx]
              if (cellData.removed) {
                return <div className="apple-cell removed" key={col} />
              }
              const classNames = ['apple-cell']
              if (isSelected(row, col)) classNames.push('selected')
              if (cellData.popping) classNames.push('popping')
              if (invalidCells.includes(idx)) classNames.push('invalid')
              return (
                <div
                  key={col}
                  data-row={row}
                  data-col={col}
                  className={classNames.join(' ')}
                  onPointerDown={handlePointerDown(row, col)}
                >
                  {cellData.value}
                </div>
              )
            })}
          </div>
        ))}

        {status !== 'playing' && (
          <div className="apple-game-overlay">
            {status === 'idle' && (
              <button className="btn btn-primary" onClick={startGame}>
                시작하기
              </button>
            )}
            {status === 'over' && (
              <div className="apple-game-result">
                <h3>게임 종료!</h3>
                <p>최종 점수: {score}</p>
                <input
                  type="text"
                  placeholder="이름을 입력하세요"
                  value={playerName}
                  onChange={(e) => setPlayerName(e.target.value)}
                  maxLength={12}
                />
                {saveError && <p className="apple-game-error">{saveError}</p>}
                <div className="apple-game-result-actions">
                  <button className="btn btn-primary" onClick={handleSaveScore} disabled={saving}>
                    {saving ? '저장 중...' : '기록 저장'}
                  </button>
                  <button className="btn btn-secondary" onClick={startGame}>
                    다시하기
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <p className="apple-game-help">드래그해서 합이 10이 되는 사과들을 선택하세요.</p>
    </div>
  )
}
