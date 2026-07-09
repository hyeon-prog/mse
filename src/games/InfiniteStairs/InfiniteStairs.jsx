import { useEffect, useRef, useState } from 'react'
import { addScore } from '../../utils/leaderboard.js'
import { sfx } from '../../utils/sound.js'
import {
  VISIBLE_STEPS,
  advanceStep,
  createInitialState,
  currentDirection,
  fail,
} from './infiniteStairsLogic.js'
import './InfiniteStairs.css'

const STEP_HEIGHT = 42

export default function InfiniteStairs() {
  const [state, setState] = useState(createInitialState)
  const [playerName, setPlayerName] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const pressedRef = useRef(null)

  useEffect(() => {
    const onKeyDown = (e) => {
      if (state.status !== 'playing') return
      if (e.key === 'ArrowLeft') {
        e.preventDefault()
        pressedRef.current = 'L'
      } else if (e.key === 'ArrowRight') {
        e.preventDefault()
        pressedRef.current = 'R'
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [state.status])

  useEffect(() => {
    if (state.status !== 'playing') return
    const id = setTimeout(() => {
      const pressed = pressedRef.current
      pressedRef.current = null
      if (pressed === currentDirection(state)) {
        sfx.select()
        setState((prev) => advanceStep(prev))
      } else {
        sfx.lose()
        setState((prev) => fail(prev))
      }
    }, state.beatMs)
    return () => clearTimeout(id)
  }, [state])

  const handleSide = (side) => {
    if (state.status !== 'playing') return
    pressedRef.current = side
  }

  const restart = () => {
    setState(createInitialState())
    setPlayerName('')
    setSaveError('')
  }

  const handleSaveScore = async () => {
    setSaving(true)
    setSaveError('')
    try {
      await addScore('infinite-stairs', playerName, state.score)
      restart()
    } catch {
      setSaveError('저장에 실패했습니다. 다시 시도해주세요.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="infinite-stairs">
      <div className="infinite-stairs-hud">
        <span>오른 계단: {state.score}</span>
        <span>속도: {Math.round((1000 / state.beatMs) * 100) / 100}배</span>
      </div>

      <div className="stairs-viewport" style={{ height: (VISIBLE_STEPS - 1) * STEP_HEIGHT + 120 }}>
        {state.steps.map((step, i) => (
          <div
            key={step.id}
            className={'stair-step' + (step.dir === 'L' ? ' left' : ' right') + (i === 0 ? ' current' : '')}
            style={{ bottom: i * STEP_HEIGHT }}
          />
        ))}

        <div
          className="stairs-character"
          style={{
            bottom: STEP_HEIGHT,
            left: state.steps[0].dir === 'L' ? '25%' : '75%',
          }}
        >
          🧍
        </div>

        {state.status === 'over' && (
          <div className="infinite-stairs-overlay">
            <div className="infinite-stairs-result">
              <h3>굴러 떨어졌습니다!</h3>
              <p>오른 계단: {state.score}</p>
              <input
                type="text"
                placeholder="이름을 입력하세요"
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                maxLength={12}
              />
              {saveError && <p className="infinite-stairs-error">{saveError}</p>}
              <div className="infinite-stairs-result-actions">
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

      <div className="infinite-stairs-controls">
        <button
          type="button"
          className="stairs-btn"
          onPointerDown={() => handleSide('L')}
          disabled={state.status !== 'playing'}
        >
          ← 왼쪽
        </button>
        <button
          type="button"
          className="stairs-btn"
          onPointerDown={() => handleSide('R')}
          disabled={state.status !== 'playing'}
        >
          오른쪽 →
        </button>
      </div>

      <p className="infinite-stairs-help">
        다음 계단이 있는 방향으로 ← → 키(또는 버튼)를 박자에 맞춰 누르세요. 틀리거나 늦으면 떨어집니다.
      </p>
    </div>
  )
}
