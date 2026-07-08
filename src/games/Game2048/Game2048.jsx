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

function initialGrid() {
  return addRandomTile(addRandomTile(createEmptyGrid()))
}

export default function Game2048() {
  const [grid, setGrid] = useState(initialGrid)
  const [score, setScore] = useState(0)
  const [status, setStatus] = useState('playing') // playing | over
  const [playerName, setPlayerName] = useState('')
  const touchStart = useRef(null)

  const handleMove = (direction) => {
    if (status !== 'playing') return
    setGrid((prevGrid) => {
      const result = move(prevGrid, direction)
      if (!result.changed) return prevGrid
      const nextGrid = addRandomTile(result.grid)
      setScore((s) => s + result.gained)
      if (!canMove(nextGrid)) {
        setStatus('over')
      }
      return nextGrid
    })
  }

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
    setGrid(initialGrid())
    setScore(0)
    setStatus('playing')
    setPlayerName('')
  }

  const handleSaveScore = () => {
    addScore('2048', playerName, score)
    restart()
  }

  return (
    <div className="game2048">
      <div className="game2048-hud">
        <span>점수: {score}</span>
        <button className="btn btn-secondary" onClick={restart}>
          다시 시작
        </button>
      </div>

      <div
        className="game2048-board"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {grid.map((row, r) =>
          row.map((val, c) => (
            <div key={`${r}-${c}`} className={`g2048-tile v-${val}`}>
              {val !== 0 ? val : ''}
            </div>
          )),
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
              <div className="game2048-result-actions">
                <button className="btn btn-primary" onClick={handleSaveScore}>
                  기록 저장
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
