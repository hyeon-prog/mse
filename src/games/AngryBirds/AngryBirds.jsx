import { useEffect, useRef, useState } from 'react'
import { addScore } from '../../utils/leaderboard.js'
import { sfx } from '../../utils/sound.js'
import {
  ARENA_HEIGHT,
  ARENA_WIDTH,
  BIRD_RADIUS,
  GROUND_Y,
  LAUNCH_MULTIPLIER,
  MAX_PULL,
  SLING_X,
  SLING_Y,
  TICK_MS,
  activateAbilities,
  createLevelState,
  launch,
  predictTrajectory,
  tick,
} from './angryBirdsLogic.js'
import './AngryBirds.css'

export default function AngryBirds() {
  const [state, setState] = useState(() => createLevelState(0, 0))
  const [pull, setPull] = useState({ dx: 0, dy: 0 })
  const [playerName, setPlayerName] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const draggingRef = useRef(false)
  const arenaRef = useRef(null)
  const prevStateRef = useRef(state)

  useEffect(() => {
    const id = setInterval(() => {
      setState((prev) => tick(prev))
    }, TICK_MS)
    return () => clearInterval(id)
  }, [])

  useEffect(() => {
    const prev = prevStateRef.current
    const curr = state

    if (curr.pigs.length < prev.pigs.length) sfx.pop()

    const prevHitCount = prev.blocks.filter((b) => b.hit).length
    const currHitCount = curr.blocks.filter((b) => b.hit).length
    if (currHitCount > prevHitCount) sfx.hit()

    if (prev.status !== curr.status) {
      if (curr.status === 'level-clear') sfx.win()
      else if (curr.status === 'level-failed') sfx.lose()
    }

    prevStateRef.current = curr
  }, [state])

  const getRelativePoint = (clientX, clientY) => {
    const rect = arenaRef.current.getBoundingClientRect()
    return { x: clientX - rect.left, y: clientY - rect.top }
  }

  const handleBirdPointerDown = (e) => {
    if (state.status !== 'aiming' || state.birds.length > 0) return
    e.preventDefault()
    draggingRef.current = true
  }

  // 노랑/파랑/검은 새가 날아가는 중에 화면을 다시 탭하면 능력을 발동합니다.
  const handleArenaPointerDown = () => {
    if (state.status !== 'flying') return
    const activatable = state.birds.filter((b) => !b.abilityUsed && b.type !== 'red')
    if (activatable.length === 0) return
    if (activatable.some((b) => b.type === 'black')) sfx.explosion()
    else if (activatable.some((b) => b.type === 'blue')) sfx.pop()
    else if (activatable.some((b) => b.type === 'yellow')) sfx.launch()
    setState((prev) => activateAbilities(prev))
  }

  const handlePointerMove = (e) => {
    if (!draggingRef.current) return
    const { x, y } = getRelativePoint(e.clientX, e.clientY)
    let dx = x - SLING_X
    let dy = y - SLING_Y
    const len = Math.hypot(dx, dy)
    if (len > MAX_PULL) {
      dx = (dx / len) * MAX_PULL
      dy = (dy / len) * MAX_PULL
    }
    setPull({ dx, dy })
  }

  const handlePointerUp = () => {
    if (!draggingRef.current) return
    draggingRef.current = false
    const prevPull = pull
    setPull({ dx: 0, dy: 0 })

    const len = Math.hypot(prevPull.dx, prevPull.dy)
    if (len > 8) {
      sfx.launch()
      const vx = -prevPull.dx * LAUNCH_MULTIPLIER
      const vy = -prevPull.dy * LAUNCH_MULTIPLIER
      setState((prev) => launch(prev, vx, vy))
    }
  }

  useEffect(() => {
    window.addEventListener('pointermove', handlePointerMove)
    window.addEventListener('pointerup', handlePointerUp)
    return () => {
      window.removeEventListener('pointermove', handlePointerMove)
      window.removeEventListener('pointerup', handlePointerUp)
    }
  })

  const nextStage = () => {
    setState((prev) => createLevelState(prev.levelIndex + 1, prev.score))
  }

  const restart = () => {
    setState(createLevelState(0, 0))
    setPlayerName('')
    setSaveError('')
  }

  const handleSaveScore = async () => {
    setSaving(true)
    setSaveError('')
    try {
      await addScore('angry-birds', playerName, state.score)
      restart()
    } catch {
      setSaveError('저장에 실패했습니다. 다시 시도해주세요.')
    } finally {
      setSaving(false)
    }
  }

  const birdX = SLING_X + pull.dx
  const birdY = SLING_Y + pull.dy
  const showBand = state.birds.length === 0 && (pull.dx !== 0 || pull.dy !== 0)
  const trajectoryPoints = showBand
    ? predictTrajectory(-pull.dx * LAUNCH_MULTIPLIER, -pull.dy * LAUNCH_MULTIPLIER)
    : []

  return (
    <div className="angry-birds">
      <div className="angry-birds-hud">
        <span>점수: {state.score}</span>
        <span>스테이지: {state.levelIndex + 1}</span>
        <span>남은 새: {state.birdQueue.length}</span>
        <span>남은 돼지: {state.pigs.length}</span>
      </div>

      <div
        className="angry-birds-arena"
        ref={arenaRef}
        style={{ width: ARENA_WIDTH, height: ARENA_HEIGHT }}
        onPointerDown={handleArenaPointerDown}
      >
        <div className="ab-ground" style={{ top: GROUND_Y }} />
        <div className="ab-sling-post" style={{ left: SLING_X, top: SLING_Y }} />

        {showBand && (
          <div
            className="ab-band"
            style={{
              left: SLING_X,
              top: SLING_Y,
              width: Math.hypot(pull.dx, pull.dy),
              transform: `rotate(${Math.atan2(pull.dy, pull.dx)}rad)`,
            }}
          />
        )}

        {trajectoryPoints.map((pt, i) => (
          <div key={i} className="ab-trajectory-dot" style={{ left: pt.x, top: pt.y }} />
        ))}

        {state.blocks.map((b, i) => (
          <div
            key={i}
            className={`ab-block material-${b.material}`}
            style={{
              left: b.x,
              top: b.y,
              width: b.w,
              height: b.h,
              opacity: 1 - ((b.hpMax - b.hp) / b.hpMax) * 0.4,
              transform: `translate(-50%, -50%) rotate(${b.angle}deg)`,
            }}
          />
        ))}

        {state.shatters.map((s, i) => (
          <div key={i} className="ab-shatter" style={{ left: s.x, top: s.y }}>
            {s.shards.map((shard, j) => (
              <span
                key={j}
                className={`ab-shard material-${s.material}`}
                style={{ '--tx': `${Math.cos(shard.angle) * shard.dist}px`, '--ty': `${Math.sin(shard.angle) * shard.dist}px` }}
              />
            ))}
          </div>
        ))}

        {state.pigs.map((p, i) => (
          <div
            key={i}
            className="ab-pig"
            style={{ left: p.x, top: p.y, width: p.r * 2, height: p.r * 2 }}
          >
            🐷
          </div>
        ))}

        {state.birds.map((bird, i) => (
          <div
            key={i}
            className={`ab-bird type-${bird.type}`}
            style={{ left: bird.x, top: bird.y, width: bird.r * 2, height: bird.r * 2 }}
          >
            <span className="ab-bird-glyph">🐦</span>
          </div>
        ))}

        {state.birds.length === 0 && (
          <div
            className={`ab-bird type-${state.birdQueue[0] ?? 'red'}` + (state.status === 'aiming' ? ' draggable' : '')}
            style={{ left: birdX, top: birdY, width: BIRD_RADIUS * 2, height: BIRD_RADIUS * 2 }}
            onPointerDown={handleBirdPointerDown}
          >
            <span className="ab-bird-glyph">🐦</span>
          </div>
        )}

        {state.status === 'level-clear' && (
          <div className="angry-birds-overlay">
            <div className="angry-birds-result">
              <h3>스테이지 클리어!</h3>
              <p>점수: {state.score}</p>
              <button className="btn btn-primary" onClick={nextStage}>
                다음 스테이지
              </button>
            </div>
          </div>
        )}

        {state.status === 'level-failed' && (
          <div className="angry-birds-overlay">
            <div className="angry-birds-result">
              <h3>게임 오버</h3>
              <p>도달한 스테이지: {state.levelIndex + 1}</p>
              <p>최종 점수: {state.score}</p>
              <input
                type="text"
                placeholder="이름을 입력하세요"
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                maxLength={12}
              />
              {saveError && <p className="angry-birds-error">{saveError}</p>}
              <div className="angry-birds-result-actions">
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

      <p className="angry-birds-help">
        새를 드래그해서 당긴 뒤 놓으면 발사됩니다. 돼지를 모두 맞춰 스테이지를 클리어하세요.
        <br />
        노랑 새는 날아가는 중 화면을 탭하면 가속, 파랑 새는 3방향으로 분열, 검은 새는 그 자리에서 폭발합니다.
      </p>
    </div>
  )
}
