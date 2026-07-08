import { useEffect, useRef, useState } from 'react'
import { addScore } from '../../utils/leaderboard.js'
import { ARENA_HEIGHT, ARENA_WIDTH, TICK_MS, createInitialState, tick } from './pokemonDodgeballLogic.js'
import './PokemonDodgeball.css'

const MOVE_KEYS = {
  ArrowUp: [0, -1],
  ArrowDown: [0, 1],
  ArrowLeft: [-1, 0],
  ArrowRight: [1, 0],
}

export default function PokemonDodgeball() {
  const [state, setState] = useState(createInitialState)
  const [playerName, setPlayerName] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const heldRef = useRef(new Set())
  const throwRef = useRef(false)

  useEffect(() => {
    const onKeyDown = (e) => {
      if (MOVE_KEYS[e.key]) {
        e.preventDefault()
        heldRef.current.add(e.key)
      } else if (e.code === 'Space') {
        e.preventDefault()
        throwRef.current = true
      }
    }
    const onKeyUp = (e) => {
      heldRef.current.delete(e.key)
    }
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
    }
  }, [])

  useEffect(() => {
    if (state.status !== 'playing') return
    const id = setInterval(() => {
      let dx = 0
      let dy = 0
      heldRef.current.forEach((key) => {
        const [mx, my] = MOVE_KEYS[key]
        dx += mx
        dy += my
      })
      const throwRequested = throwRef.current
      throwRef.current = false
      setState((prev) => tick(prev, { dx, dy, throwRequested }))
    }, TICK_MS)
    return () => clearInterval(id)
  }, [state.status])

  const restart = () => {
    setState(createInitialState())
    setPlayerName('')
    setSaveError('')
  }

  const handleSaveScore = async () => {
    setSaving(true)
    setSaveError('')
    try {
      await addScore('pokemon-dodgeball', playerName, state.score)
      restart()
    } catch {
      setSaveError('저장에 실패했습니다. 다시 시도해주세요.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="dodgeball">
      <div className="dodgeball-hud">
        <span>점수: {state.score}</span>
        <span>❤️ {state.player.lives}</span>
        <span>남은 상대: {state.opponents.filter((o) => o.alive).length}</span>
      </div>

      <div className="dodgeball-arena" style={{ width: ARENA_WIDTH, height: ARENA_HEIGHT }}>
        <div className="db-player" style={{ left: state.player.x, top: state.player.y }}>
          ⚡
        </div>

        {state.opponents
          .filter((o) => o.alive)
          .map((o) => (
            <div key={o.id} className="db-opponent" style={{ left: o.x, top: o.y }}>
              👻
            </div>
          ))}

        {state.balls.map((b, i) => (
          <div
            key={i}
            className={'db-ball' + (b.owner === 'player' ? ' player-ball' : ' enemy-ball')}
            style={{ left: b.x, top: b.y }}
          />
        ))}

        {state.status !== 'playing' && (
          <div className="dodgeball-overlay">
            <div className="dodgeball-result">
              <h3>{state.status === 'won' ? '승리!' : '게임 오버'}</h3>
              <p>점수: {state.score}</p>
              <input
                type="text"
                placeholder="이름을 입력하세요"
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                maxLength={12}
              />
              {saveError && <p className="dodgeball-error">{saveError}</p>}
              <div className="dodgeball-result-actions">
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

      <p className="dodgeball-help">
        방향키로 이동, 스페이스바로 공을 던져 상대를 맞추세요. 공에 맞으면 목숨이 줄어듭니다.
      </p>
    </div>
  )
}
