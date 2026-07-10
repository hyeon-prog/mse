import { useEffect, useMemo, useRef, useState } from 'react'
import {
  BLACK,
  BOARD_SIZE,
  EMPTY,
  STAR_POINTS,
  WHITE,
  checkWin,
  cloneBoardWithMove,
  createEmptyBoard,
  forbiddenReason,
  isBoardFull,
  isForbiddenMove,
  pickAiMove,
} from './omokLogic.js'
import './Omok.css'

const FORBIDDEN_LABEL = {
  overline: '장목(6개 이상)',
  'double-four': '사사(44)',
  'double-three': '삼삼(33)',
}

const STREAK_KEY = 'mse-omok-streak'
const AI_THINK_MS = 450

const isStarPoint = (r, c) => STAR_POINTS.some(([sr, sc]) => sr === r && sc === c)
const isWinCell = (line, r, c) => line.some(([lr, lc]) => lr === r && lc === c)

export default function Omok() {
  const [mode, setMode] = useState('1p')
  const [phase, setPhase] = useState('idle')
  const [board, setBoard] = useState(createEmptyBoard)
  const [currentPlayer, setCurrentPlayer] = useState(BLACK)
  const [winner, setWinner] = useState(null)
  const [winLine, setWinLine] = useState([])
  const [aiThinking, setAiThinking] = useState(false)
  const [streak, setStreak] = useState(0)
  const [forbiddenNotice, setForbiddenNotice] = useState(null)
  const streakRef = useRef(0)

  useEffect(() => {
    const raw = localStorage.getItem(STREAK_KEY)
    streakRef.current = raw ? Number(raw) || 0 : 0
    setStreak(streakRef.current)
  }, [])

  const finishWithStreak = (didHumanWin) => {
    if (mode !== '1p') return
    streakRef.current = didHumanWin ? streakRef.current + 1 : 0
    localStorage.setItem(STREAK_KEY, String(streakRef.current))
    setStreak(streakRef.current)
  }

  const applyMove = (row, col, player) => {
    setForbiddenNotice(null)
    const nextBoard = cloneBoardWithMove(board, row, col, player)
    setBoard(nextBoard)

    const result = checkWin(nextBoard, row, col, player)
    if (result.win) {
      setWinner(player)
      setWinLine(result.line)
      setPhase('over')
      finishWithStreak(player === BLACK)
      return
    }

    if (isBoardFull(nextBoard)) {
      setWinner('draw')
      setPhase('over')
      finishWithStreak(false)
      return
    }

    setCurrentPlayer(player === BLACK ? WHITE : BLACK)
  }

  useEffect(() => {
    if (phase !== 'playing' || mode !== '1p' || currentPlayer !== WHITE) return
    setAiThinking(true)
    const timer = setTimeout(() => {
      const move = pickAiMove(board, WHITE, BLACK)
      setAiThinking(false)
      if (move) applyMove(move[0], move[1], WHITE)
    }, AI_THINK_MS)
    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, mode, currentPlayer, board])

  const handleCellClick = (r, c) => {
    if (phase !== 'playing' || aiThinking) return
    if (board[r][c] !== EMPTY) return
    if (mode === '1p' && currentPlayer !== BLACK) return

    if (currentPlayer === BLACK && !checkWin(board, r, c, BLACK).win && isForbiddenMove(board, r, c, BLACK)) {
      setForbiddenNotice(forbiddenReason(board, r, c, BLACK))
      return
    }

    setForbiddenNotice(null)
    applyMove(r, c, currentPlayer)
  }

  // 흑 차례일 때만 계산 — 백은 금수 규칙이 없어서 표시할 필요가 없다
  const forbiddenCells = useMemo(() => {
    if (phase !== 'playing' || currentPlayer !== BLACK) return null
    const set = new Set()
    for (let r = 0; r < BOARD_SIZE; r++) {
      for (let c = 0; c < BOARD_SIZE; c++) {
        if (board[r][c] !== EMPTY) continue
        if (checkWin(board, r, c, BLACK).win) continue // 이기는 수는 금수여도 항상 허용
        if (isForbiddenMove(board, r, c, BLACK)) set.add(`${r}-${c}`)
      }
    }
    return set
  }, [board, currentPlayer, phase])

  const startGame = (nextMode) => {
    setMode(nextMode)
    setBoard(createEmptyBoard())
    setCurrentPlayer(BLACK)
    setWinner(null)
    setWinLine([])
    setAiThinking(false)
    setForbiddenNotice(null)
    setPhase('playing')
  }

  const turnLabel =
    mode === '1p'
      ? currentPlayer === BLACK
        ? '내 차례 (흑)'
        : aiThinking
          ? 'CPU 생각 중...'
          : 'CPU 차례 (백)'
      : currentPlayer === BLACK
        ? 'PLAYER 1 차례 (흑)'
        : 'PLAYER 2 차례 (백)'

  const resultText =
    winner === 'draw'
      ? '무승부!'
      : mode === '1p'
        ? winner === BLACK
          ? '승리!'
          : '패배...'
        : winner === BLACK
          ? 'PLAYER 1 (흑) 승리!'
          : 'PLAYER 2 (백) 승리!'

  return (
    <div className="omok-game">
      <div className="omok-hud">
        <span className="omok-turn">{phase === 'playing' ? turnLabel : '오목'}</span>
        <span className="omok-streak">최다 연승: {streak}</span>
      </div>

      <div className="omok-board-wrap">
        <div
          className="omok-board"
          style={{ gridTemplateColumns: `repeat(${BOARD_SIZE}, 1fr)` }}
        >
          {board.map((row, r) =>
            row.map((cell, c) => {
              const isForbidden = Boolean(forbiddenCells?.has(`${r}-${c}`))
              return (
                <button
                  key={`${r}-${c}`}
                  className={'omok-cell' + (isForbidden ? ' forbidden' : '')}
                  onClick={() => handleCellClick(r, c)}
                  disabled={
                    phase !== 'playing' ||
                    cell !== EMPTY ||
                    aiThinking ||
                    (mode === '1p' && currentPlayer !== BLACK)
                  }
                  title={isForbidden ? `${FORBIDDEN_LABEL[forbiddenReason(board, r, c, BLACK)]} 금수` : undefined}
                >
                  {isStarPoint(r, c) && cell === EMPTY && !isForbidden && <span className="omok-star" />}
                  {isForbidden && <span className="omok-forbidden-mark" aria-hidden="true" />}
                  {cell !== EMPTY && (
                    <span
                      className={
                        'omok-stone' +
                        (cell === BLACK ? ' black' : ' white') +
                        (isWinCell(winLine, r, c) ? ' winning' : '')
                      }
                    />
                  )}
                </button>
              )
            }),
          )}
        </div>

        {phase === 'idle' && (
          <div className="omok-overlay">
            <div className="omok-result">
              <h3>오목</h3>
              <p>15x15 판에서 가로/세로/대각선으로 5개를 먼저 이으면 승리합니다.</p>
              <p>
                흑(선공)은 렌주 룰의 금수가 적용됩니다: 33(삼삼)·44(사사)·장목(6개 이상)은 둘 수 없어요. 백은 제한이
                없습니다.
              </p>
              <p className="omok-best">최다 연승: {streak}</p>
              <div className="omok-mode-buttons">
                <button className="btn btn-primary" onClick={() => startGame('1p')}>
                  1인 플레이 (VS CPU)
                </button>
                <button className="btn btn-secondary" onClick={() => startGame('2p')}>
                  2인 플레이 (한 기기로 번갈아)
                </button>
              </div>
            </div>
          </div>
        )}

        {phase === 'over' && (
          <div className="omok-overlay">
            <div className="omok-result">
              <h3>{resultText}</h3>
              {mode === '1p' && <p className="omok-best">현재 연승: {streak}</p>}
              <div className="omok-mode-buttons">
                <button className="btn btn-primary" onClick={() => startGame(mode)}>
                  다시하기
                </button>
                <button className="btn btn-secondary" onClick={() => setPhase('idle')}>
                  모드 선택
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {forbiddenNotice && (
        <p className="omok-forbidden-notice">
          ⚠ {FORBIDDEN_LABEL[forbiddenNotice]} 금수 자리라 둘 수 없습니다.
        </p>
      )}

      <p className="omok-help">
        칸을 눌러 돌을 놓으세요. 흑이 먼저 시작합니다. 흑 차례에는 금수 자리가 옅은 표시로 미리 보입니다.
      </p>
    </div>
  )
}
