import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { addScore } from '../../utils/leaderboard.js'
import DominoOnline from './DominoOnline.jsx'
import DominoTile from './DominoTile.jsx'
import DominoTutorial from './DominoTutorial.jsx'
import {
  canPlay,
  chooseAiMove,
  createMatch,
  drawSingleTile,
  getValidMoves,
  passTurn,
  playMove,
  startNextRound,
} from './dominoLogic.js'
import './Domino.css'

const AI_MOVE_DELAY_MS = 500
const DRAW_DELAY_MS = 450
const HUMAN_ID = 'human'
const DEFAULT_TARGET_SCORE = 100

const DIFFICULTY_OPTIONS = [
  { value: 'easy', label: '쉬움' },
  { value: 'medium', label: '보통' },
  { value: 'hard', label: '어려움' },
]

function tileKey(tile) {
  return `${tile.a}-${tile.b}`
}

function captureRects(refMap) {
  const rects = new Map()
  for (const [key, node] of refMap) {
    if (node) rects.set(key, node.getBoundingClientRect())
  }
  return rects
}

function playerLabel(id) {
  if (id === HUMAN_ID) return '나'
  return `AI ${id.split('-')[1]}`
}

function initialRoomCodeFromUrl() {
  return new URLSearchParams(window.location.search).get('room')?.toUpperCase() ?? ''
}

export default function Domino() {
  const [online, setOnline] = useState(() => Boolean(initialRoomCodeFromUrl()))
  const [match, setMatch] = useState(null)
  const [playerCount, setPlayerCount] = useState(4)
  const [difficulty, setDifficulty] = useState('medium')
  const [mode, setMode] = useState('target-score')
  const [targetScore, setTargetScore] = useState(DEFAULT_TARGET_SCORE)
  const [pendingTile, setPendingTile] = useState(null)
  const [playerName, setPlayerName] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [isDrawing, setIsDrawing] = useState(false)
  const [showTutorial, setShowTutorial] = useState(false)
  const [flight, setFlight] = useState(null)
  const handRefs = useRef(new Map())
  const chainRefs = useRef(new Map())
  const pendingRectRef = useRef(null)
  const prevHandRectsRef = useRef(new Map())

  const startMatch = () => {
    const playerOrder = [HUMAN_ID, ...Array.from({ length: playerCount - 1 }, (_, i) => `ai-${i + 1}`)]
    setMatch(createMatch(mode, targetScore, playerOrder))
    setPendingTile(null)
    setPlayerName('')
    setSaveError('')
    setIsDrawing(false)
  }

  const backToSelect = () => {
    setMatch(null)
    setPendingTile(null)
    setIsDrawing(false)
  }

  // 턴 진행: 낼 수 없으면 한 장씩 천천히 뽑고(리액션), 그래도 없으면 패스,
  // AI 턴이면 잠시 후 자동 착수
  useEffect(() => {
    if (!match || match.status !== 'playing') return undefined

    if (!canPlay(match.hands[match.currentTurn], match.board)) {
      if (match.boneyard.length > 0) {
        setIsDrawing(true)
        const timer = setTimeout(() => {
          setMatch((current) => (current && current.status === 'playing' ? drawSingleTile(current) : current))
        }, DRAW_DELAY_MS)
        return () => clearTimeout(timer)
      }
      setIsDrawing(false)
      setMatch(passTurn(match))
      return undefined
    }
    setIsDrawing(false)

    if (match.currentTurn !== HUMAN_ID) {
      const timer = setTimeout(() => {
        setMatch((current) => {
          if (!current || current.status !== 'playing' || current.currentTurn === HUMAN_ID) return current
          const move = chooseAiMove(current.hands[current.currentTurn], current.board, difficulty)
          return move ? playMove(current, move) : current
        })
      }, AI_MOVE_DELAY_MS)
      return () => clearTimeout(timer)
    }
    return undefined
  }, [match, difficulty])

  // 낸 타일이 손패의 실제 좌표에서 체인의 착지 좌표까지 날아가는 것처럼 보이도록
  // (FLIP 기법) 착지 후 시작 위치로 즉시 이동시킨 뒤 제자리로 트랜지션시킨다
  useLayoutEffect(() => {
    if (!flight) return undefined
    const node = chainRefs.current.get(flight.key)
    if (!node || !flight.startRect) {
      setFlight(null)
      return undefined
    }
    const endRect = node.getBoundingClientRect()
    const dx = flight.startRect.left - endRect.left
    const dy = flight.startRect.top - endRect.top
    node.style.transition = 'none'
    node.style.transform = `translate(${dx}px, ${dy}px)`
    node.getBoundingClientRect()
    const raf = requestAnimationFrame(() => {
      node.style.transition = 'transform 300ms cubic-bezier(0.22, 0.9, 0.2, 1)'
      node.style.transform = 'translate(0, 0)'
    })
    const timer = setTimeout(() => {
      node.style.transition = ''
      node.style.transform = ''
      setFlight(null)
    }, 320)
    return () => {
      cancelAnimationFrame(raf)
      clearTimeout(timer)
    }
  }, [flight])

  // 내가 타일을 낸 직후 손패에 남은 타일들이 빈 자리로 부드럽게 붙어오는 것도 같은 방식으로 처리
  useLayoutEffect(() => {
    const prev = prevHandRectsRef.current
    if (prev.size === 0) return
    prevHandRectsRef.current = new Map()
    for (const [key, node] of handRefs.current) {
      const prevRect = prev.get(key)
      if (!prevRect || !node) continue
      const newRect = node.getBoundingClientRect()
      const dx = prevRect.left - newRect.left
      const dy = prevRect.top - newRect.top
      if (Math.abs(dx) < 0.5 && Math.abs(dy) < 0.5) continue
      node.style.transition = 'none'
      node.style.transform = `translate(${dx}px, ${dy}px)`
      node.getBoundingClientRect()
      requestAnimationFrame(() => {
        node.style.transition = 'transform 220ms ease-out'
        node.style.transform = 'translate(0, 0)'
      })
      setTimeout(() => {
        node.style.transition = ''
        node.style.transform = ''
      }, 260)
    }
  }, [match])

  const handleTileClick = useCallback(
    (tile) => {
      if (!match || match.status !== 'playing' || match.currentTurn !== HUMAN_ID) return
      const moves = getValidMoves(match.hands[HUMAN_ID], match.board).filter(
        (m) => m.tile.a === tile.a && m.tile.b === tile.b,
      )
      if (moves.length === 0) return
      const key = tileKey(tile)
      const startRect = handRefs.current.get(key)?.getBoundingClientRect() ?? null
      if (moves.length === 1) {
        prevHandRectsRef.current = captureRects(handRefs.current)
        setMatch(playMove(match, moves[0]))
        setFlight({ key, startRect })
        return
      }
      pendingRectRef.current = startRect
      setPendingTile(tile)
    },
    [match],
  )

  const handleChooseEnd = (end) => {
    if (!match || !pendingTile) return
    const key = tileKey(pendingTile)
    prevHandRectsRef.current = captureRects(handRefs.current)
    setMatch(playMove(match, { tile: pendingTile, end }))
    setFlight({ key, startRect: pendingRectRef.current })
    setPendingTile(null)
  }

  const handleSaveScore = async () => {
    setSaving(true)
    setSaveError('')
    try {
      await addScore('domino', playerName, match.scores[HUMAN_ID])
      backToSelect()
    } catch {
      setSaveError('저장에 실패했습니다. 다시 시도해주세요.')
    } finally {
      setSaving(false)
    }
  }

  if (online) {
    return (
      <DominoOnline
        initialRoomCode={initialRoomCodeFromUrl()}
        onBack={() => {
          setOnline(false)
          window.history.replaceState(null, '', window.location.pathname)
        }}
      />
    )
  }

  if (!match) {
    return (
      <div className="domino domino-select">
        <p>이집트 카페 스타일 블록 도미노(더블식스). AI와 대결하거나 친구와 온라인으로 겨루세요.</p>

        <button className="btn btn-secondary" onClick={() => setShowTutorial(true)}>
          📖 튜토리얼 보기
        </button>

        {showTutorial && <DominoTutorial onClose={() => setShowTutorial(false)} />}

        <div className="domino-option-group">
          <span className="domino-option-label">인원수</span>
          <div className="domino-option-buttons">
            {[2, 3, 4].map((count) => (
              <button
                key={count}
                className={`btn ${playerCount === count ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setPlayerCount(count)}
              >
                {count}명
              </button>
            ))}
          </div>
        </div>

        <div className="domino-option-group">
          <span className="domino-option-label">난이도</span>
          <div className="domino-option-buttons">
            {DIFFICULTY_OPTIONS.map(({ value, label }) => (
              <button
                key={value}
                className={`btn ${difficulty === value ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setDifficulty(value)}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="domino-option-group">
          <span className="domino-option-label">종료 방식</span>
          <div className="domino-option-buttons">
            <button
              className={`btn ${mode === 'single-round' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setMode('single-round')}
            >
              단판
            </button>
            <button
              className={`btn ${mode === 'target-score' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setMode('target-score')}
            >
              목표점수
            </button>
          </div>
        </div>

        {mode === 'target-score' && (
          <div className="domino-option-group">
            <span className="domino-option-label">목표 점수</span>
            <input
              type="number"
              min={10}
              step={10}
              value={targetScore}
              onChange={(e) => setTargetScore(Math.max(10, Number(e.target.value) || DEFAULT_TARGET_SCORE))}
              className="domino-target-input"
            />
          </div>
        )}

        <div className="domino-option-buttons domino-start-btn">
          <button className="btn btn-primary" onClick={startMatch}>
            게임 시작
          </button>
          <button className="btn btn-secondary" onClick={() => setOnline(true)}>
            🌐 온라인 멀티플레이
          </button>
        </div>
      </div>
    )
  }

  const isMyTurn = match.status === 'playing' && match.currentTurn === HUMAN_ID
  const validTileKeys = new Set(
    isMyTurn ? getValidMoves(match.hands[HUMAN_ID], match.board).map((m) => `${m.tile.a}-${m.tile.b}`) : [],
  )
  const opponents = match.playerOrder.filter((id) => id !== HUMAN_ID)

  return (
    <div className="domino">
      <div className="domino-hud">
        <span>
          턴: {playerLabel(match.currentTurn)}
          {isDrawing && <span className="domino-drawing-indicator"> · 카드 가져가는 중...</span>}
        </span>
        <span>보유고 {match.boneyard.length}장</span>
        <button className="btn btn-secondary" onClick={backToSelect}>
          새 게임
        </button>
      </div>

      <div className="domino-opponents">
        {opponents.map((id) => (
          <div key={id} className={`domino-opponent ${match.currentTurn === id ? 'active' : ''}`}>
            <span className="domino-opponent-label">{playerLabel(id)}</span>
            <div className="domino-opponent-hand">
              {match.hands[id].map((_, i) => (
                <DominoTile key={i} tile={{ a: 0, b: 0 }} faceDown />
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="domino-board-wrap">
        <div className="domino-chain">
          {match.board.chain.length === 0 && <p className="domino-chain-empty">첫 타일을 놓아보세요</p>}
          {match.board.chain.map((placed) => {
            const key = tileKey(placed.tile)
            return (
              <div
                key={key}
                className="domino-chain-tile"
                ref={(node) => {
                  if (node) chainRefs.current.set(key, node)
                  else chainRefs.current.delete(key)
                }}
              >
                <DominoTile
                  tile={placed.tile}
                  flipped={placed.flipped}
                  vertical={placed.tile.a === placed.tile.b}
                />
              </div>
            )
          })}
        </div>

        {match.status === 'round-over' && match.lastRoundResult && (
          <div className="domino-overlay">
            <div className="domino-result">
              <h3>{playerLabel(match.lastRoundResult.winnerId)} 라운드 승리!</h3>
              <p>+{match.lastRoundResult.pointsAwarded}점 획득</p>
              <div className="domino-result-actions">
                <button className="btn btn-primary" onClick={() => setMatch(startNextRound(match))}>
                  다음 라운드
                </button>
              </div>
            </div>
          </div>
        )}

        {match.status === 'match-over' && (
          <div className="domino-overlay">
            <div className="domino-result">
              <h3>{playerLabel(match.matchWinnerId ?? HUMAN_ID)} 매치 승리!</h3>
              <p>내 최종 점수: {match.scores[HUMAN_ID]}</p>
              <input
                type="text"
                placeholder="이름을 입력하세요"
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                maxLength={12}
              />
              {saveError && <p className="domino-error">{saveError}</p>}
              <div className="domino-result-actions">
                <button className="btn btn-primary" onClick={handleSaveScore} disabled={saving}>
                  {saving ? '저장 중...' : '기록 저장'}
                </button>
                <button className="btn btn-secondary" onClick={backToSelect}>
                  다시하기
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {pendingTile && (
        <div className="domino-end-picker">
          <span>어느 쪽에 놓을까요?</span>
          <button className="btn btn-primary" onClick={() => handleChooseEnd('left')}>
            왼쪽
          </button>
          <button className="btn btn-primary" onClick={() => handleChooseEnd('right')}>
            오른쪽
          </button>
          <button className="btn btn-secondary" onClick={() => setPendingTile(null)}>
            취소
          </button>
        </div>
      )}

      <div className="domino-hand">
        {match.hands[HUMAN_ID].map((tile) => {
          const key = tileKey(tile)
          return (
            <button
              key={key}
              ref={(node) => {
                if (node) handRefs.current.set(key, node)
                else handRefs.current.delete(key)
              }}
              className="domino-hand-slot"
              onClick={() => handleTileClick(tile)}
              disabled={!isMyTurn || !validTileKeys.has(key)}
            >
              <DominoTile tile={tile} />
            </button>
          )
        })}
      </div>

      <p className="domino-help">손패에서 타일을 클릭해 보드 양 끝에 맞춰 놓으세요. 낼 수 없으면 자동으로 뽑거나 패스합니다.</p>
    </div>
  )
}
