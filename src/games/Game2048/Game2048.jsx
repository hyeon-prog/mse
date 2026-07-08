import { useEffect, useRef, useState } from 'react'
import { addScore } from '../../utils/leaderboard.js'
import { addRandomTile, canMove, createEmptyGrid, move } from './game2048Logic.js'
import './Game2048.css'

const KEY_DIRECTIONS = {
  ArrowLeft: 'left',
  ArrowRight: 'right',
  ArrowUp: 'up',
  ArrowDown: 'down',
}

function diffPositions(before, after) {
  const positions = []
  for (let r = 0; r < before.length; r++) {
    for (let c = 0; c < before[r].length; c++) {
      if (before[r][c] === 0 && after[r][c] !== 0) positions.push(`${r}-${c}`)
    }
  }
  return positions
}

function createInitialBoard() {
  const empty = createEmptyGrid()
  const withOne = addRandomTile(empty)
  const withTwo = addRandomTile(withOne)
  const newTiles = new Set([...diffPositions(empty, withOne), ...diffPositions(withOne, withTwo)])
  return { grid: withTwo, merged: new Set(), newTiles }
}

export default function Game2048() {
  const [board, setBoard] = useState(createInitialBoard)
  const [score, setScore] = useState(0)
  const [status, setStatus] = useState('playing') // playing | over
  const [playerName, setPlayerName] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const touchStart = useRef(null)

  const handleMove = (direction) => {
    if (status !== 'playing') return
    setBoard((prev) => {
      const result = move(prev.grid, direction)
      if (!result.changed) return prev
      const nextGrid = addRandomTile(result.grid)
      const newTiles = new Set(diffPositions(result.grid, nextGrid))
      const merged = new Set(result.mergedCells.map(({ r, c }) => `${r}-${c}`))
      setScore((s) => s + result.gained)
      if (!canMove(nextGrid)) {
        setStatus('over')
      }
      return { grid: nextGrid, merged, newTiles }
    })
  }

  useEffect(() => {
    if (board.merged.size === 0 && board.newTiles.size === 0) return
    const id = setTimeout(() => {
      setBoard((prev) => ({ ...prev, merged: new Set(), newTiles: new Set() }))
    }, 220)
    return () => clearTimeout(id)
  }, [board])

  useEffect(() => {
    const onKeyDown = (e) => {
      const direction = KEY_DIRECTIONS[e.key]
      if (!direction) return
      e.preventDefault()
      handleMove(direction)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  })

  const handleTouchStart = (e) => {
    const t = e.touches[0]
    touchStart.current = { x: t.clientX, y: t.clientY }
  }

  const handleTouchEnd = (e) => {
    if (!touchStart.current) return
    const t = e.changedTouches[0]
    const dx = t.clientX - touchStart.current.x
    const dy = t.clientY - touchStart.current.y
    touchStart.current = null
    if (Math.max(Math.abs(dx), Math.abs(dy)) < 20) return
    if (Math.abs(dx) > Math.abs(dy)) {
      handleMove(dx > 0 ? 'right' : 'left')
    } else {
      handleMove(dy > 0 ? 'down' : 'up')
    }
  }

  const restart = () => {
    setBoard(createInitialBoard())
    setScore(0)
    setStatus('playing')
    setPlayerName('')
  }

  const handleSaveScore = async () => {
    setSaving(true)
    setSaveError('')
    try {
      await addScore('2048', playerName, score)
      restart()
    } catch {
      setSaveError('저장에 실패했습니다. 다시 시도해주세요.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="game2048">
      <div className="game2048-hud">
        <span>
          점수: <span className="game2048-score-value" key={score}>{score}</span>
        </span>
        <button className="btn btn-secondary" onClick={restart}>
          다시 시작
        </button>
      </div>

      <div
        className="game2048-board"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {board.grid.map((row, r) =>
          row.map((val, c) => {
            const key = `${r}-${c}`
            const classNames = ['g2048-tile', `v-${val}`]
            if (board.merged.has(key)) classNames.push('merged')
            if (board.newTiles.has(key)) classNames.push('new-tile')
            return (
              <div key={key} className={classNames.join(' ')}>
                {val !== 0 ? val : ''}
              </div>
            )
          }),
        )}

        {status === 'over' && (
          <div className="game2048-overlay">
            <div className="game2048-result">
              <h3>게임 오버</h3>
              <p>최종 점수: {score}</p>
              <input
                type="text"
                placeholder="이름을 입력하세요"
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                maxLength={12}
              />
              {saveError && <p className="game2048-error">{saveError}</p>}
              <div className="game2048-result-actions">
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

      <p className="game2048-help">방향키(또는 스와이프)로 타일을 이동하세요.</p>
    </div>
  )
}
