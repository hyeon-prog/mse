import { useEffect, useRef, useState } from 'react'
import { ARENA_WIDTH, ROUNDS_TO_WIN, TICK_INTERVAL_MS, createFight, tick } from './tekkenLogic.js'
import './Tekken.css'

const P1_KEYS = { left: 'a', right: 'd', jump: 'w', block: 's', punch: 'f', kick: 'g' }
const P2_KEYS = { left: 'arrowleft', right: 'arrowright', jump: 'arrowup', block: 'arrowdown', punch: 'k', kick: 'l' }
const ALL_KEYS = new Set([...Object.values(P1_KEYS), ...Object.values(P2_KEYS)])

function actionClass(fighter) {
  if (fighter.action === 'attack') return fighter.attackType === 'kick' ? 'action-kick' : 'action-punch'
  if (fighter.action === 'block') return 'action-block'
  if (fighter.action === 'jump') return 'action-jump'
  if (fighter.action === 'hit') return 'action-hit'
  return 'action-idle'
}

function initMatch() {
  return {
    fight: createFight(),
    p1Wins: 0,
    p2Wins: 0,
    status: 'playing',
    winnerLabel: '',
  }
}

export default function Tekken() {
  const [match, setMatch] = useState(initMatch)
  const heldKeysRef = useRef(new Set())
  const pressedRef = useRef({ p1: { jump: false, punch: false, kick: false }, p2: { jump: false, punch: false, kick: false } })

  useEffect(() => {
    const onKeyDown = (e) => {
      const key = e.key.toLowerCase()
      if (!ALL_KEYS.has(key)) return
      e.preventDefault()
      heldKeysRef.current.add(key)
      if (key === P1_KEYS.jump) pressedRef.current.p1.jump = true
      if (key === P1_KEYS.punch) pressedRef.current.p1.punch = true
      if (key === P1_KEYS.kick) pressedRef.current.p1.kick = true
      if (key === P2_KEYS.jump) pressedRef.current.p2.jump = true
      if (key === P2_KEYS.punch) pressedRef.current.p2.punch = true
      if (key === P2_KEYS.kick) pressedRef.current.p2.kick = true
    }
    const onKeyUp = (e) => {
      heldKeysRef.current.delete(e.key.toLowerCase())
    }
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
    }
  }, [])

  useEffect(() => {
    if (match.status !== 'playing') return
    const id = setInterval(() => {
      const held = heldKeysRef.current
      const pressed = pressedRef.current
      const inputs = {
        p1: {
          left: held.has(P1_KEYS.left),
          right: held.has(P1_KEYS.right),
          block: held.has(P1_KEYS.block),
          jumpPressed: pressed.p1.jump,
          punchPressed: pressed.p1.punch,
          kickPressed: pressed.p1.kick,
        },
        p2: {
          left: held.has(P2_KEYS.left),
          right: held.has(P2_KEYS.right),
          block: held.has(P2_KEYS.block),
          jumpPressed: pressed.p2.jump,
          punchPressed: pressed.p2.punch,
          kickPressed: pressed.p2.kick,
        },
      }
      pressedRef.current = { p1: { jump: false, punch: false, kick: false }, p2: { jump: false, punch: false, kick: false } }

      setMatch((prev) => {
        const nextFight = tick(prev.fight, inputs)
        if (nextFight.status !== 'round-over') {
          return { ...prev, fight: nextFight }
        }

        let p1Wins = prev.p1Wins
        let p2Wins = prev.p2Wins
        if (nextFight.roundWinner === 'p1') p1Wins += 1
        if (nextFight.roundWinner === 'p2') p2Wins += 1

        if (p1Wins >= ROUNDS_TO_WIN || p2Wins >= ROUNDS_TO_WIN) {
          return {
            ...prev,
            fight: nextFight,
            p1Wins,
            p2Wins,
            status: 'match-over',
            winnerLabel: p1Wins > p2Wins ? 'Player 1' : 'Player 2',
          }
        }

        return {
          ...prev,
          fight: createFight(),
          p1Wins,
          p2Wins,
          status: 'playing',
        }
      })
    }, TICK_INTERVAL_MS)
    return () => clearInterval(id)
  }, [match.status])

  const restart = () => setMatch(initMatch())

  const { fight, p1Wins, p2Wins, status, winnerLabel } = match

  return (
    <div className="tekken">
      <div className="tekken-hud">
        <div className="tekken-health-block">
          <div className="tekken-name">P1 ({p1Wins}승)</div>
          <div className="tekken-health-bar">
            <div className="tekken-health-fill" style={{ width: `${fight.p1.health}%` }} />
          </div>
        </div>
        <div className="tekken-timer">{fight.roundTime}</div>
        <div className="tekken-health-block right">
          <div className="tekken-name">P2 ({p2Wins}승)</div>
          <div className="tekken-health-bar">
            <div className="tekken-health-fill" style={{ width: `${fight.p2.health}%` }} />
          </div>
        </div>
      </div>

      <div className="tekken-arena" style={{ width: `${ARENA_WIDTH}px` }}>
        <div
          className="tekken-fighter"
          style={{
            left: `${fight.p1.x}px`,
            bottom: `${20 - fight.p1.y}px`,
            transform: `translateX(-50%) scaleX(${fight.p1.facing})`,
          }}
        >
          <div className={`fighter-sprite p1 ${actionClass(fight.p1)}`}>
            <div className="f-head" />
            <div className="f-body" />
            <div className="f-arm back" />
            <div className="f-arm front" />
            <div className="f-leg back" />
            <div className="f-leg front" />
          </div>
        </div>
        <div
          className="tekken-fighter"
          style={{
            left: `${fight.p2.x}px`,
            bottom: `${20 - fight.p2.y}px`,
            transform: `translateX(-50%) scaleX(${fight.p2.facing})`,
          }}
        >
          <div className={`fighter-sprite p2 ${actionClass(fight.p2)}`}>
            <div className="f-head" />
            <div className="f-body" />
            <div className="f-arm back" />
            <div className="f-arm front" />
            <div className="f-leg back" />
            <div className="f-leg front" />
          </div>
        </div>

        {status === 'match-over' && (
          <div className="tekken-overlay">
            <div className="tekken-result">
              <h3>{winnerLabel} 승리!</h3>
              <p>
                {p1Wins} : {p2Wins}
              </p>
              <button className="btn btn-primary" onClick={restart}>
                다시하기
              </button>
            </div>
          </div>
        )}
      </div>

      <p className="tekken-help">
        P1: A/D 이동 · W 점프 · S 막기 · F 펀치 · G 킥
        <br />
        P2: ← → 이동 · ↑ 점프 · ↓ 막기 · K 펀치 · L 킥
      </p>
    </div>
  )
}
