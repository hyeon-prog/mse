import { useEffect, useState } from 'react'
import { addScore } from '../../utils/leaderboard.js'
import {
  COLS,
  ROWS,
  SHAPES,
  clearLines,
  createEmptyBoard,
  hasCollision,
  mergePiece,
  randomType,
  rotateMatrix,
  scoreForLines,
  spawnPiece,
} from './tetrisLogic.js'
import './Tetris.css'

function initGame() {
  return {
    board: createEmptyBoard(),
    piece: spawnPiece(randomType()),
    nextType: randomType(),
    score: 0,
    lines: 0,
    level: 1,
    status: 'playing',
  }
}

function tick(g) {
  if (g.status !== 'playing') return g
  if (!hasCollision(g.board, g.piece, 1, 0)) {
    return { ...g, piece: { ...g.piece, row: g.piece.row + 1 } }
  }

  const merged = mergePiece(g.board, g.piece)
  const { board: clearedBoard, cleared } = clearLines(merged)
  const lines = g.lines + cleared
  const level = Math.floor(lines / 10) + 1
  const score = g.score + scoreForLines(cleared, g.level)
  const nextPiece = spawnPiece(g.nextType)
  const nextType = randomType()

  if (hasCollision(clearedBoard, nextPiece)) {
    return { ...g, board: clearedBoard, score, lines, level, status: 'over' }
  }
  return { ...g, board: clearedBoard, piece: nextPiece, nextType, score, lines, level }
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

  useEffect(() => {
    if (game.status !== 'playing') return
    const speed = Math.max(150, 800 - (game.level - 1) * 70)
    const id = setInterval(() => setGame((prev) => tick(prev)), speed)
    return () => clearInterval(id)
  }, [game.status, game.level])

  useEffect(() => {
    const onKeyDown = (e) => {
      if (game.status === 'idle') return
      if (['ArrowLeft', 'ArrowRight', 'ArrowDown', 'ArrowUp', ' '].includes(e.key)) {
        e.preventDefault()
      }
      if (e.key === 'p' || e.key === 'P') {
        setGame((prev) => ({
          ...prev,
          status: prev.status === 'playing' ? 'paused' : prev.status === 'paused' ? 'playing' : prev.status,
        }))
        return
      }
      if (game.status !== 'playing') return
      if (e.key === 'ArrowLeft') {
        setGame((prev) => (hasCollision(prev.board, prev.piece, 0, -1) ? prev : { ...prev, piece: { ...prev.piece, col: prev.piece.col - 1 } }))
      } else if (e.key === 'ArrowRight') {
        setGame((prev) => (hasCollision(prev.board, prev.piece, 0, 1) ? prev : { ...prev, piece: { ...prev.piece, col: prev.piece.col + 1 } }))
      } else if (e.key === 'ArrowDown') {
        setGame((prev) => tick(prev))
      } else if (e.key === 'ArrowUp') {
        setGame((prev) => {
          const rotated = rotateMatrix(prev.piece.matrix)
          for (const offset of [0, -1, 1, -2, 2]) {
            if (!hasCollision(prev.board, prev.piece, 0, offset, rotated)) {
              return { ...prev, piece: { ...prev.piece, matrix: rotated, col: prev.piece.col + offset } }
            }
          }
          return prev
        })
      } else if (e.key === ' ') {
        setGame((prev) => hardDrop(prev))
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [game.status])

  const restart = () => {
    setGame(initGame())
    setPlayerName('')
  }

  const handleSaveScore = () => {
    addScore('tetris', playerName, game.score)
    restart()
  }

  const displayBoard = mergePiece(game.board, game.piece)
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
                className={'tetris-cell' + (cell ? ' filled' : '')}
                style={{ background: cell || 'transparent' }}
              />
            )),
          )}

          {game.status !== 'playing' && (
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
                  <div className="tetris-result-actions">
                    <button className="btn btn-primary" onClick={handleSaveScore}>
                      기록 저장
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
          <div className="tetris-stat">점수: {game.score}</div>
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
          <p className="tetris-help">
            ← → 이동 · ↑ 회전
            <br />↓ 소프트드롭 · Space 하드드롭
            <br />P 일시정지
          </p>
        </div>
      </div>
    </div>
  )
}
