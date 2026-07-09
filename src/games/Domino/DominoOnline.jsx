import { useCallback, useEffect, useRef, useState } from 'react'
import { addScore } from '../../utils/leaderboard.js'
import DominoTile from './DominoTile.jsx'
import { getValidMoves } from './dominoLogic.js'
import { hostRoom, joinRoomByCode } from './dominoSession.js'

const DEFAULT_TARGET_SCORE = 100

export default function DominoOnline({ initialRoomCode, onBack }) {
  const [stage, setStage] = useState('setup') // setup | room
  const [tab, setTab] = useState(initialRoomCode ? 'join' : 'create')
  const [nickname, setNickname] = useState('')
  const [roomCodeInput, setRoomCodeInput] = useState(initialRoomCode)
  const [mode, setMode] = useState('target-score')
  const [targetScore, setTargetScore] = useState(DEFAULT_TARGET_SCORE)
  const [busy, setBusy] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [lobby, setLobby] = useState(null)
  const [view, setView] = useState(null)
  const [pendingTile, setPendingTile] = useState(null)
  const [copied, setCopied] = useState(false)
  const [playerName, setPlayerName] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const sessionRef = useRef(null)
  const savedRef = useRef(false)

  const trimmedNickname = nickname.trim() || '익명'

  const leaveRoom = useCallback(() => {
    sessionRef.current?.close()
    sessionRef.current = null
    setLobby(null)
    setView(null)
    setStage('setup')
  }, [])

  useEffect(() => {
    return () => {
      sessionRef.current?.close()
      sessionRef.current = null
    }
  }, [])

  const events = useCallback(
    () => ({
      onLobby: setLobby,
      onView: setView,
      onError: (message) => {
        sessionRef.current = null
        setLobby(null)
        setView(null)
        setErrorMessage(message)
        setStage('setup')
      },
      onClosed: () => {
        setLobby(null)
        setView(null)
        setErrorMessage('방과의 연결이 끊어졌습니다.')
        setStage('setup')
        sessionRef.current = null
      },
    }),
    [],
  )

  const handleCreate = async () => {
    setBusy(true)
    setErrorMessage('')
    try {
      sessionRef.current = await hostRoom(trimmedNickname, mode, targetScore, events())
      savedRef.current = false
      setStage('room')
    } catch {
      setErrorMessage('방을 만들지 못했습니다. 잠시 후 다시 시도해주세요.')
    } finally {
      setBusy(false)
    }
  }

  const handleJoin = async () => {
    setBusy(true)
    setErrorMessage('')
    try {
      sessionRef.current = await joinRoomByCode(roomCodeInput.trim(), trimmedNickname, events())
      savedRef.current = false
      setStage('room')
    } catch {
      setErrorMessage('방에 참가하지 못했습니다. 잠시 후 다시 시도해주세요.')
    } finally {
      setBusy(false)
    }
  }

  const session = sessionRef.current
  const myId = session?.myPlayerId

  const label = useCallback(
    (id) => (id === myId ? '나' : (view?.nicknames?.[id] ?? lobby?.players?.find((p) => p.playerId === id)?.nickname ?? '???')),
    [myId, view, lobby],
  )

  const handleTileClick = (tile) => {
    if (!view || view.status !== 'playing' || view.currentTurn !== myId) return
    const moves = getValidMoves(view.yourHand, view.board).filter((m) => m.tile.a === tile.a && m.tile.b === tile.b)
    if (moves.length === 0) return
    if (moves.length === 1) {
      session.play(moves[0])
      return
    }
    setPendingTile(tile)
  }

  const handleChooseEnd = (end) => {
    if (!pendingTile) return
    session.play({ tile: pendingTile, end })
    setPendingTile(null)
  }

  const handleSaveScore = async () => {
    setSaving(true)
    setSaveError('')
    try {
      await addScore('domino', playerName || trimmedNickname, view.scores[myId] ?? 0)
      savedRef.current = true
      leaveRoom()
      onBack()
    } catch {
      setSaveError('저장에 실패했습니다. 다시 시도해주세요.')
    } finally {
      setSaving(false)
    }
  }

  // ---- 화면: 방 만들기 / 참가 ----
  if (stage === 'setup') {
    return (
      <div className="domino domino-select">
        <p>친구와 온라인 대결 (최대 4명). 방을 만들고 링크를 공유하세요.</p>

        <div className="domino-option-group">
          <span className="domino-option-label">닉네임</span>
          <input
            type="text"
            className="domino-target-input"
            placeholder="닉네임"
            value={nickname}
            maxLength={12}
            onChange={(e) => setNickname(e.target.value)}
          />
        </div>

        <div className="domino-option-buttons">
          <button className={`btn ${tab === 'create' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setTab('create')}>
            방 만들기
          </button>
          <button className={`btn ${tab === 'join' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setTab('join')}>
            코드로 참가
          </button>
        </div>

        {tab === 'create' ? (
          <>
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
            <button className="btn btn-primary" onClick={handleCreate} disabled={busy}>
              {busy ? '만드는 중...' : '방 만들기'}
            </button>
          </>
        ) : (
          <>
            <div className="domino-option-group">
              <span className="domino-option-label">방 코드</span>
              <input
                type="text"
                className="domino-target-input"
                placeholder="예: AB12CD"
                value={roomCodeInput}
                maxLength={6}
                onChange={(e) => setRoomCodeInput(e.target.value.toUpperCase())}
              />
            </div>
            <button className="btn btn-primary" onClick={handleJoin} disabled={busy || roomCodeInput.trim().length === 0}>
              {busy ? '참가하는 중...' : '참가하기'}
            </button>
          </>
        )}

        {errorMessage && <p className="domino-error">{errorMessage}</p>}

        <button className="btn btn-secondary" onClick={onBack}>
          ← 뒤로
        </button>
      </div>
    )
  }

  // ---- 화면: 대기실 ----
  if (!view) {
    if (!lobby) {
      return (
        <div className="domino domino-select">
          <p>연결하는 중...</p>
          <button className="btn btn-secondary" onClick={() => { leaveRoom(); }}>
            취소
          </button>
        </div>
      )
    }
    const isHost = lobby.hostPlayerId === myId
    const shareUrl = `${window.location.origin}${window.location.pathname}?room=${lobby.roomCode}`
    const copyLink = () => {
      navigator.clipboard.writeText(shareUrl).then(() => {
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      })
    }
    return (
      <div className="domino domino-select">
        <h3 className="domino-lobby-code">방 코드: {lobby.roomCode}</h3>
        <div className="domino-option-buttons domino-share-row">
          <input readOnly value={shareUrl} className="domino-target-input domino-share-link" />
          <button className="btn btn-secondary" onClick={copyLink}>
            {copied ? '복사됨!' : '링크 복사'}
          </button>
        </div>

        <ul className="domino-lobby-players">
          {lobby.players.map((player) => (
            <li key={player.playerId}>
              {player.nickname}
              {player.playerId === lobby.hostPlayerId && ' 👑'}
              {!player.connected && ' (연결 끊김)'}
            </li>
          ))}
        </ul>

        {isHost ? (
          <button className="btn btn-primary" disabled={lobby.players.length < 2} onClick={() => session.start()}>
            게임 시작 ({lobby.players.length}/4명)
          </button>
        ) : (
          <p className="domino-help">호스트가 게임을 시작하기를 기다리는 중...</p>
        )}

        <button className="btn btn-secondary" onClick={() => { leaveRoom(); }}>
          나가기
        </button>
      </div>
    )
  }

  // ---- 화면: 게임 ----
  const isMyTurn = view.status === 'playing' && view.currentTurn === myId
  const validTileKeys = new Set(
    isMyTurn ? getValidMoves(view.yourHand, view.board).map((m) => `${m.tile.a}-${m.tile.b}`) : [],
  )
  const opponents = view.playerOrder.filter((id) => id !== myId)
  const isHost = view.hostPlayerId === myId

  return (
    <div className="domino">
      <div className="domino-hud">
        <span>
          턴: {label(view.currentTurn)}
          {view.isDrawing && <span className="domino-drawing-indicator"> · 카드 가져가는 중...</span>}
        </span>
        <span>보유고 {view.boneyardCount}장</span>
        <span className="domino-hud-scores">
          {view.playerOrder.map((id) => (
            <span key={id}>
              {label(id)} {view.scores[id]}
            </span>
          ))}
        </span>
        <button className="btn btn-secondary" onClick={() => { leaveRoom(); }}>
          나가기
        </button>
      </div>

      <div className="domino-opponents">
        {opponents.map((id) => (
          <div key={id} className={`domino-opponent ${view.currentTurn === id ? 'active' : ''}`}>
            <span className="domino-opponent-label">{label(id)}</span>
            <div className="domino-opponent-hand">
              {Array.from({ length: view.handCounts[id] ?? 0 }, (_, i) => (
                <DominoTile key={i} tile={{ a: 0, b: 0 }} faceDown />
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="domino-board-wrap">
        <div className="domino-chain">
          {view.board.chain.length === 0 && <p className="domino-chain-empty">첫 타일을 놓아보세요</p>}
          {view.board.chain.map((placed, i) => (
            <DominoTile key={i} tile={placed.tile} flipped={placed.flipped} vertical={placed.tile.a === placed.tile.b} />
          ))}
        </div>

        {view.status === 'round-over' && view.lastRoundResult && (
          <div className="domino-overlay">
            <div className="domino-result">
              <h3>{label(view.lastRoundResult.winnerId)} 라운드 승리!</h3>
              <p>+{view.lastRoundResult.pointsAwarded}점 획득</p>
              <div className="domino-result-actions">
                {isHost ? (
                  <button className="btn btn-primary" onClick={() => session.nextRound()}>
                    다음 라운드
                  </button>
                ) : (
                  <p className="domino-help">호스트를 기다리는 중...</p>
                )}
              </div>
            </div>
          </div>
        )}

        {view.status === 'match-over' && (
          <div className="domino-overlay">
            <div className="domino-result">
              <h3>{label(view.matchWinnerId ?? myId)} 매치 승리!</h3>
              <p>내 최종 점수: {view.scores[myId] ?? 0}</p>
              {!savedRef.current && (
                <input
                  type="text"
                  placeholder="이름을 입력하세요"
                  value={playerName}
                  onChange={(e) => setPlayerName(e.target.value)}
                  maxLength={12}
                />
              )}
              {saveError && <p className="domino-error">{saveError}</p>}
              <div className="domino-result-actions">
                <button className="btn btn-primary" onClick={handleSaveScore} disabled={saving}>
                  {saving ? '저장 중...' : '기록 저장'}
                </button>
                <button className="btn btn-secondary" onClick={() => { leaveRoom(); onBack(); }}>
                  나가기
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
        {view.yourHand.map((tile, i) => (
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

      <p className="domino-help">낼 수 없으면 자동으로 뽑거나 패스합니다. 새로고침해도 같은 방으로 돌아올 수 있어요.</p>
    </div>
  )
}
