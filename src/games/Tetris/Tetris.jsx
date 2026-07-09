import { useEffect, useRef, useState } from 'react'
import { addScore } from '../../utils/leaderboard.js'
import { sfx } from '../../utils/sound.js'
import { useIsMobile } from '../../utils/useIsMobile.js'
import {
  COLS,
  ROWS,
  SHAPES,
  clearLines,
  createEmptyBoard,
  getFullRows,
  hasCollision,
  mergePiece,
  randomType,
  rotateMatrix,
  scoreForLines,
  spawnPiece,
} from './tetrisLogic.js'
import './Tetris.css'

const CLEAR_FLASH_MS = 260

function initGame() {
  return {
    board: createEmptyBoard(),
    piece: spawnPiece(randomType()),
    nextType: randomType(),
    score: 0,
    lines: 0,
    level: 1,
    status: 'playing',
    clearingRows: [],
  }
}

function spawnNext(g, board) {
  const nextPiece = spawnPiece(g.nextType)
  const nextType = randomType()
  if (hasCollision(board, nextPiece)) {
    return { ...g, board, status: 'over', clearingRows: [] }
  }
  return { ...g, board, piece: nextPiece, nextType, clearingRows: [] }
}

function tick(g) {
  if (g.status !== 'playing') return g
  if (!hasCollision(g.board, g.piece, 1, 0)) {
    return { ...g, piece: { ...g.piece, row: g.piece.row + 1 } }
  }

  const merged = mergePiece(g.board, g.piece)
  const fullRows = getFullRows(merged)
  if (fullRows.length > 0) {
    return { ...g, board: merged, status: 'clearing', clearingRows: fullRows }
  }
  return spawnNext(g, merged)
}

function resolveClear(g) {
  const { board: clearedBoard, cleared } = clearLines(g.board)
  const lines = g.lines + cleared
  const level = Math.floor(lines / 10) + 1
  const score = g.score + scoreForLines(cleared, g.level)
  return spawnNext({ ...g, score, lines, level, status: 'playing' }, clearedBoard)
}

function hardDrop(g) {
  let piece = g.piece
  while (!hasCollision(g.board, piece, 1, 0)) {
    piece = { ...piece, row: piece.row + 1 }
  }
  return tick({ ...g, piece })
}

export default function Tetris() {
  const [game, setGame] = useState(initGame)
  const [playerName, setPlayerName] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const isMobile = useIsMobile()
  const holdRef = useRef(null)

  const moveLeft = () => {
    setGame((prev) =>
      prev.status !== 'playing' || hasCollision(prev.board, prev.piece, 0, -1)
        ? prev
        : { ...prev, piece: { ...prev.piece, col: prev.piece.col - 1 } },
    )
  }

  const moveRight = () => {
    setGame((prev) =>
      prev.status !== 'playing' || hasCollision(prev.board, prev.piece, 0, 1)
        ? prev
        : { ...prev, piece: { ...prev.piece, col: prev.piece.col + 1 } },
    )
  }

  const softDrop = () => {
    setGame((prev) => (prev.status !== 'playing' ? prev : tick(prev)))
  }

  const rotatePiece = () => {
    setGame((prev) => {
      if (prev.status !== 'playing') return prev
      const rotated = rotateMatrix(prev.piece.matrix)
      for (const offset of [0, -1, 1, -2, 2]) {
        if (!hasCollision(prev.board, prev.piece, 0, offset, rotated)) {
          return { ...prev, piece: { ...prev.piece, matrix: rotated, col: prev.piece.col + offset } }
        }
      }
      return prev
    })
  }

  const doHardDrop = () => {
    if (game.status !== 'playing') return
    sfx.drop()
    setGame((prev) => hardDrop(prev))
  }

  const togglePause = () => {
    setGame((prev) => ({
      ...prev,
      status: prev.status === 'playing' ? 'paused' : prev.status === 'paused' ? 'playing' : prev.status,
    }))
  }

  const startHold = (action) => {
    action()
    clearTimeout(holdRef.current)
    holdRef.current = setTimeout(function repeat() {
      action()
      holdRef.current = setTimeout(repeat, 60)
    }, 200)
  }

  const stopHold = () => clearTimeout(holdRef.current)

  useEffect(() => {
    if (game.status !== 'playing') return
    const speed = Math.max(150, 800 - (game.level - 1) * 70)
    const id = setInterval(() => setGame((prev) => tick(prev)), speed)
    return () => clearInterval(id)
  }, [game.status, game.level])

  useEffect(() => {
    if (game.status !== 'clearing') return
    sfx.lineClear()
    const id = setTimeout(() => setGame((prev) => resolveClear(prev)), CLEAR_FLASH_MS)
    return () => clearTimeout(id)
  }, [game.status])

  useEffect(() => {
    if (game.status === 'over') sfx.lose()
  }, [game.status])

  useEffect(() => {
    const onKeyDown = (e) => {
      if (game.status === 'idle') return
      if (['ArrowLeft', 'ArrowRight', 'ArrowDown', 'ArrowUp', ' '].includes(e.key)) {
        e.preventDefault()
      }
      if (e.key === 'p' || e.key === 'P') {
        togglePause()
        return
      }
      if (game.status !== 'playing') return
      if (e.key === 'ArrowLeft') {
        moveLeft()
      } else if (e.key === 'ArrowRight') {
        moveRight()
      } else if (e.key === 'ArrowDown') {
        softDrop()
      } else if (e.key === 'ArrowUp') {
        rotatePiece()
      } else if (e.key === ' ') {
        doHardDrop()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [game.status])

  const restart = () => {
    setGame(initGame())
    setPlayerName('')
  }

  const handleSaveScore = async () => {
    setSaving(true)
    setSaveError('')
    try {
      await addScore('tetris', playerName, game.score)
      restart()
    } catch {
      setSaveError('저장에 실패했습니다. 다시 시도해주세요.')
    } finally {
      setSaving(false)
    }
  }

  const displayBoard = game.status === 'clearing' ? game.board : mergePiece(game.board, game.piece)
  const nextMatrix = SHAPES[game.nextType].matrix
  const nextColor = SHAPES[game.nextType].color

  return (
    <div className="tetris">
      <div className="tetris-main">
        <div className="tetris-board">
          {displayBoard.map((row, r) =>
            row.map((cell, c) => (
              <div
                key={`${r}-${c}`}
                className={
                  'tetris-cell' +
                  (cell ? ' filled' : '') +
                  (game.clearingRows.includes(r) ? ' clearing' : '')
                }
                style={{ background: cell || 'transparent' }}
              />
            )),
          )}

          {(game.status === 'paused' || game.status === 'over') && (
            <div className="tetris-overlay">
              {game.status === 'paused' && <p>일시정지 (P 키로 재개)</p>}
              {game.status === 'over' && (
                <div className="tetris-result">
                  <h3>게임 오버</h3>
                  <p>점수: {game.score}</p>
                  <input
                    type="text"
                    placeholder="이름을 입력하세요"
                    value={playerName}
                    onChange={(e) => setPlayerName(e.target.value)}
                    maxLength={12}
                  />
                  {saveError && <p className="tetris-error">{saveError}</p>}
                  <div className="tetris-result-actions">
                    <button className="btn btn-primary" onClick={handleSaveScore} disabled={saving}>
                      {saving ? '저장 중...' : '기록 저장'}
                    </button>
                    <button className="btn btn-secondary" onClick={restart}>
                      다시하기
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="tetris-side">
          <div className="tetris-stat">
            점수: <span className="tetris-stat-value" key={game.score}>{game.score}</span>
          </div>
          <div className="tetris-stat">라인: {game.lines}</div>
          <div className="tetris-stat">레벨: {game.level}</div>
          <div className="tetris-next">
            <p>다음 블록</p>
            <div
              className="tetris-next-grid"
              style={{ gridTemplateColumns: `repeat(${nextMatrix.length}, 18px)` }}
            >
              {nextMatrix.flatMap((row, r) =>
                row.map((val, c) => (
                  <div
                    key={`${r}-${c}`}
                    className="tetris-next-cell"
                    style={{ background: val ? nextColor : 'transparent' }}
                  />
                )),
              )}
            </div>
          </div>
          <button className="btn btn-secondary" onClick={restart}>
            다시 시작
          </button>
          {!isMobile && (
            <p className="tetris-help">
              ← → 이동 · ↑ 회전
              <br />↓ 소프트드롭 · Space 하드드롭
              <br />P 일시정지
            </p>
          )}
        </div>
      </div>

      {isMobile && (
        <div className="tetris-touch-controls">
          <div className="tetris-touch-dpad">
            <button
              className="touch-btn"
              onPointerDown={() => startHold(moveLeft)}
              onPointerUp={stopHold}
              onPointerLeave={stopHold}
              onPointerCancel={stopHold}
            >
              ◀
            </button>
            <button
              className="touch-btn"
              onPointerDown={() => startHold(moveRight)}
              onPointerUp={stopHold}
              onPointerLeave={stopHold}
              onPointerCancel={stopHold}
            >
              ▶
            </button>
            <button
              className="touch-btn"
              onPointerDown={() => startHold(softDrop)}
              onPointerUp={stopHold}
              onPointerLeave={stopHold}
              onPointerCancel={stopHold}
            >
              ▼
            </button>
          </div>
          <div className="tetris-touch-actions">
            <button className="touch-btn touch-btn-round" onPointerDown={rotatePiece}>
              ⟳
            </button>
            <button className="touch-btn touch-btn-round" onPointerDown={togglePause}>
              ⏸
            </button>
            <button className="touch-btn touch-btn-round touch-btn-accent" onPointerDown={doHardDrop}>
              ⤓
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
