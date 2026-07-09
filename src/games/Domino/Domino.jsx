import { useCallback, useEffect, useState } from 'react'
import { addScore } from '../../utils/leaderboard.js'
import {
  canPlay,
  chooseAiMove,
  createMatch,
  getValidMoves,
  passTurn,
  playMove,
  resolveDrawPhase,
  startNextRound,
} from './dominoLogic.js'
import './Domino.css'

const AI_MOVE_DELAY_MS = 500
const HUMAN_ID = 'human'
const DEFAULT_TARGET_SCORE = 100

const PIP_LAYOUTS = {
  0: [],
  1: [4],
  2: [0, 8],
  3: [0, 4, 8],
  4: [0, 2, 6, 8],
  5: [0, 2, 4, 6, 8],
  6: [0, 2, 3, 5, 6, 8],
}

const DIFFICULTY_OPTIONS = [
  { value: 'easy', label: '쉬움' },
  { value: 'medium', label: '보통' },
  { value: 'hard', label: '어려움' },
]

function playerLabel(id) {
  if (id === HUMAN_ID) return '나'
  return `AI ${id.split('-')[1]}`
}

function PipFace({ value }) {
  const active = new Set(PIP_LAYOUTS[value] ?? [])
  return (
    <div className="domino-tile-face">
      {Array.from({ length: 9 }, (_, i) => (
        <span key={i} className={active.has(i) ? 'domino-pip on' : 'domino-pip'} />
      ))}
    </div>
  )
}

function DominoTile({ tile, flipped = false, vertical = false, faceDown = false }) {
  const classNames = ['domino-tile', vertical ? 'vertical' : 'horizontal', faceDown ? 'face-down' : '']
  if (faceDown) {
    return <div className={classNames.join(' ')} aria-hidden="true" />
  }
  const [first, second] = flipped ? [tile.b, tile.a] : [tile.a, tile.b]
  return (
    <div className={classNames.join(' ')}>
      <PipFace value={first} />
      <span className="domino-tile-divider" />
      <PipFace value={second} />
    </div>
  )
}

export default function Domino() {
  const [match, setMatch] = useState(null)
  const [playerCount, setPlayerCount] = useState(4)
  const [difficulty, setDifficulty] = useState('medium')
  const [mode, setMode] = useState('target-score')
  const [targetScore, setTargetScore] = useState(DEFAULT_TARGET_SCORE)
  const [pendingTile, setPendingTile] = useState(null)
  const [playerName, setPlayerName] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')

  const startMatch = () => {
    const playerOrder = [HUMAN_ID, ...Array.from({ length: playerCount - 1 }, (_, i) => `ai-${i + 1}`)]
    setMatch(createMatch(mode, targetScore, playerOrder))
    setPendingTile(null)
    setPlayerName('')
    setSaveError('')
  }

  const backToSelect = () => {
    setMatch(null)
    setPendingTile(null)
  }

  // 턴 진행: 낼 수 없으면 자동 뽑기/패스, AI 턴이면 잠시 후 자동 착수
  useEffect(() => {
    if (!match || match.status !== 'playing') return undefined

    const drawn = resolveDrawPhase(match)
    if (drawn !== match) {
      setMatch(drawn)
      return undefined
    }

    if (!canPlay(match.hands[match.currentTurn], match.board)) {
      setMatch(passTurn(match))
      return undefined
    }

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

  const handleTileClick = useCallback(
    (tile) => {
      if (!match || match.status !== 'playing' || match.currentTurn !== HUMAN_ID) return
      const moves = getValidMoves(match.hands[HUMAN_ID], match.board).filter(
        (m) => m.tile.a === tile.a && m.tile.b === tile.b,
      )
      if (moves.length === 0) return
      if (moves.length === 1) {
        setMatch(playMove(match, moves[0]))
        return
      }
      setPendingTile(tile)
    },
    [match],
  )

  const handleChooseEnd = (end) => {
    if (!match || !pendingTile) return
    setMatch(playMove(match, { tile: pendingTile, end }))
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

  if (!match) {
    return (
      <div className="domino domino-select">
        <p>이집트 카페 스타일 블록 도미노(더블식스). AI와 대결하세요.</p>

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

        <button className="btn btn-primary domino-start-btn" onClick={startMatch}>
          게임 시작
        </button>
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
        <span>턴: {playerLabel(match.currentTurn)}</span>
        <span>보유고 {match.boneyard.length}장</span>
        <span className="domino-hud-scores">
          {match.playerOrder.map((id) => (
            <span key={id}>
              {playerLabel(id)} {match.scores[id]}
            </span>
          ))}
        </span>
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
          {match.board.chain.map((placed, i) => (
            <DominoTile
              key={i}
              tile={placed.tile}
              flipped={placed.flipped}
              vertical={placed.tile.a === placed.tile.b}
            />
          ))}
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
        {match.hands[HUMAN_ID].map((tile, i) => (
          <button
            key={i}
            className="domino-hand-slot"
            onClick={() => handleTileClick(tile)}
            disabled={!isMyTurn || !validTileKeys.has(`${tile.a}-${tile.b}`)}
          >
            <DominoTile tile={tile} />
          </button>
        ))}
      </div>

      <p className="domino-help">손패에서 타일을 클릭해 보드 양 끝에 맞춰 놓으세요. 낼 수 없으면 자동으로 뽑거나 패스합니다.</p>
    </div>
  )
}
