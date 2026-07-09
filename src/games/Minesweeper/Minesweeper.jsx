import { useEffect, useRef, useState } from 'react'
import { getBestTime, saveBestTimeIfBetter } from '../../utils/minesweeperRecords.js'
import { sfx } from '../../utils/sound.js'
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
  const [flagMode, setFlagMode] = useState(false)
  const [explodedCell, setExplodedCell] = useState(null)
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
    setExplodedCell(null)
    clearInterval(timerRef.current)
    timerRef.current = null
  }

  const backToSelect = () => {
    clearInterval(timerRef.current)
    timerRef.current = null
    setStatus('select')
    setBoard(null)
    setDifficulty(null)
    setExplodedCell(null)
  }

  const handleWin = (finalBoard, elapsed) => {
    clearInterval(timerRef.current)
    sfx.win()
    setBoard(finalBoard)
    setStatus('won')
    setBestTime(saveBestTimeIfBetter(difficulty, elapsed))
  }

  const handleLoss = (finalBoard, r, c) => {
    clearInterval(timerRef.current)
    sfx.explosion()
    setExplodedCell({ r, c })
    setBoard(revealAllMines(finalBoard))
    setStatus('lost')
  }

  const handleReveal = (r, c) => {
    if (status !== 'playing') return
    const config = DIFFICULTIES[difficulty]

    if (!board) {
      const fresh = createBoard(config.rows, config.cols, config.mines, r, c)
      const revealed = revealCell(fresh, r, c)
      sfx.click()
      setBoard(revealed)
      setSeconds(0)
      timerRef.current = setInterval(() => setSeconds((s) => s + 1), 1000)
      if (checkWin(revealed)) handleWin(revealed, 0)
      return
    }

    const cell = board[r][c]
    if (cell.revealed || cell.flagged) return

    if (cell.mine) {
      handleLoss(board, r, c)
      return
    }

    sfx.click()
    const next = revealCell(board, r, c)
    setBoard(next)
    if (checkWin(next)) handleWin(next, seconds)
  }

  const performFlagToggle = (r, c) => {
    if (status !== 'playing' || !board) return
    if (board[r][c].revealed) return
    sfx.flag()
    setBoard(toggleFlag(board, r, c))
  }

  const handleFlag = (e, r, c) => {
    e.preventDefault()
    performFlagToggle(r, c)
  }

  const handleCellClick = (r, c) => {
    if (!board && flagMode) return
    if (flagMode) performFlagToggle(r, c)
    else handleReveal(r, c)
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

      <button
        className={`btn ms-flagmode-btn ${flagMode ? 'ms-flagmode-active' : 'btn-secondary'}`}
        onClick={() => setFlagMode((f) => !f)}
      >
        🚩 깃발 모드 {flagMode ? 'ON' : 'OFF'}
      </button>

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
            const exploded = explodedCell?.r === r && explodedCell?.c === c
            return (
              <button
                key={`${r}-${c}`}
                className={`ms-cell ${revealed ? 'revealed' : ''} ${isMine && revealed ? 'mine' : ''} ${exploded ? 'exploded' : ''} ${!revealed && flagged ? 'flagged' : ''}`}
                onClick={() => handleCellClick(r, c)}
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

      <p className="minesweeper-help">
        좌클릭으로 칸 열기, 우클릭으로 깃발 표시. 모바일에서는 '깃발 모드'를 켠 뒤 탭하면 깃발을 놓을 수 있어요.
      </p>
    </div>
  )
}
