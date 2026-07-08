import { useEffect, useRef, useState } from 'react'
import { getBestTime, saveBestTimeIfBetter } from '../../utils/minesweeperRecords.js'
import {
  DIFFICULTIES,
  checkWin,
  countFlags,
  createBoard,
  revealAllMines,
  revealCell,
  toggleFlag,
} from './minesweeperLogic.js'
import './Minesweeper.css'

const NUMBER_COLORS = ['', '#1a56db', '#0f766e', '#b91c1c', '#6d28d9', '#9a3412', '#0e7490', '#111827', '#6b7280']

export default function Minesweeper() {
  const [difficulty, setDifficulty] = useState(null)
  const [board, setBoard] = useState(null)
  const [status, setStatus] = useState('select') // select | playing | won | lost
  const [seconds, setSeconds] = useState(0)
  const [bestTime, setBestTime] = useState(null)
  const timerRef = useRef(null)

  useEffect(() => {
    return () => clearInterval(timerRef.current)
  }, [])

  const startDifficulty = (key) => {
    setDifficulty(key)
    setBoard(null)
    setStatus('playing')
    setSeconds(0)
    setBestTime(getBestTime(key))
    clearInterval(timerRef.current)
    timerRef.current = null
  }

  const backToSelect = () => {
    clearInterval(timerRef.current)
    timerRef.current = null
    setStatus('select')
    setBoard(null)
    setDifficulty(null)
  }

  const handleWin = (finalBoard, elapsed) => {
    clearInterval(timerRef.current)
    setBoard(finalBoard)
    setStatus('won')
    setBestTime(saveBestTimeIfBetter(difficulty, elapsed))
  }

  const handleLoss = (finalBoard) => {
    clearInterval(timerRef.current)
    setBoard(revealAllMines(finalBoard))
    setStatus('lost')
  }

  const handleReveal = (r, c) => {
    if (status !== 'playing') return
    const config = DIFFICULTIES[difficulty]

    if (!board) {
      const fresh = createBoard(config.rows, config.cols, config.mines, r, c)
      const revealed = revealCell(fresh, r, c)
      setBoard(revealed)
      setSeconds(0)
      timerRef.current = setInterval(() => setSeconds((s) => s + 1), 1000)
      if (checkWin(revealed)) handleWin(revealed, 0)
      return
    }

    const cell = board[r][c]
    if (cell.revealed || cell.flagged) return

    if (cell.mine) {
      handleLoss(board)
      return
    }

    const next = revealCell(board, r, c)
    setBoard(next)
    if (checkWin(next)) handleWin(next, seconds)
  }

  const handleFlag = (e, r, c) => {
    e.preventDefault()
    if (status !== 'playing' || !board) return
    setBoard(toggleFlag(board, r, c))
  }

  if (status === 'select') {
    return (
      <div className="minesweeper minesweeper-select">
        <p>난이도를 선택하세요.</p>
        <div className="minesweeper-difficulties">
          {Object.entries(DIFFICULTIES).map(([key, config]) => (
            <button key={key} className="btn btn-primary" onClick={() => startDifficulty(key)}>
              {config.label} ({config.rows}×{config.cols}, 지뢰 {config.mines})
              {getBestTime(key) != null ? ` · 최고 ${getBestTime(key)}초` : ''}
            </button>
          ))}
        </div>
      </div>
    )
  }

  const config = DIFFICULTIES[difficulty]
  const flagCount = board ? countFlags(board) : 0

  return (
    <div className="minesweeper">
      <div className="minesweeper-hud">
        <span>💣 {config.mines - flagCount}</span>
        <span>⏱ {seconds}초</span>
        <span>🏆 {bestTime != null ? `${bestTime}초` : '-'}</span>
        <button className="btn btn-secondary" onClick={backToSelect}>
          난이도 변경
        </button>
      </div>

      <div
        className="minesweeper-board"
        style={{ gridTemplateColumns: `repeat(${config.cols}, 28px)` }}
      >
        {Array.from({ length: config.rows }, (_, r) =>
          Array.from({ length: config.cols }, (_, c) => {
            const cell = board?.[r]?.[c]
            const revealed = cell?.revealed
            const flagged = cell?.flagged
            const isMine = cell?.mine
            return (
              <button
                key={`${r}-${c}`}
                className={`ms-cell ${revealed ? 'revealed' : ''} ${isMine && revealed ? 'mine' : ''}`}
                onClick={() => handleReveal(r, c)}
                onContextMenu={(e) => handleFlag(e, r, c)}
                disabled={status !== 'playing' || revealed}
              >
                {revealed && !isMine && cell.adjacent > 0 ? (
                  <span style={{ color: NUMBER_COLORS[cell.adjacent] }}>{cell.adjacent}</span>
                ) : null}
                {revealed && isMine ? '💣' : null}
                {!revealed && flagged ? '🚩' : null}
              </button>
            )
          }),
        )}

        {status === 'won' && (
          <div className="minesweeper-overlay">
            <div className="minesweeper-result">
              <h3>승리!</h3>
              <p>걸린 시간: {seconds}초</p>
              <div className="minesweeper-result-actions">
                <button className="btn btn-primary" onClick={() => startDifficulty(difficulty)}>
                  다시하기
                </button>
                <button className="btn btn-secondary" onClick={backToSelect}>
                  난이도 변경
                </button>
              </div>
            </div>
          </div>
        )}

        {status === 'lost' && (
          <div className="minesweeper-overlay">
            <div className="minesweeper-result">
              <h3>게임 오버</h3>
              <p>지뢰를 밟았습니다.</p>
              <div className="minesweeper-result-actions">
                <button className="btn btn-primary" onClick={() => startDifficulty(difficulty)}>
                  다시하기
                </button>
                <button className="btn btn-secondary" onClick={backToSelect}>
                  난이도 변경
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      <p className="minesweeper-help">좌클릭으로 칸 열기, 우클릭으로 깃발 표시.</p>
    </div>
  )
}
