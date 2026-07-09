import { useEffect, useRef, useState } from 'react'
import { sfx } from '../../utils/sound.js'
import { TICK_INTERVAL_MS, playActionSfx } from './tekkenLogic.js'
import { createMatchState, stepMatch } from './tekkenHost.js'
import TekkenView from './TekkenView.jsx'

const P1_KEYS = { left: 'a', right: 'd', jump: 'w', block: 's', punch: 'f', kick: 'g' }
const P2_KEYS = { left: 'arrowleft', right: 'arrowright', jump: 'arrowup', block: 'arrowdown', punch: 'k', kick: 'l' }
const ALL_KEYS = new Set([...Object.values(P1_KEYS), ...Object.values(P2_KEYS)])

export default function TekkenLocal({ onBack }) {
  const [match, setMatch] = useState(createMatchState)
  const heldKeysRef = useRef(new Set())
  const pressedRef = useRef({ p1: { jump: false, punch: false, kick: false }, p2: { jump: false, punch: false, kick: false } })
  const prevFightRef = useRef(match.fight)

  useEffect(() => {
    const prev = prevFightRef.current
    const curr = match.fight
    if (prev.p1.action !== curr.p1.action) playActionSfx(sfx, curr.p1.action, curr.p1.attackType)
    if (prev.p2.action !== curr.p2.action) playActionSfx(sfx, curr.p2.action, curr.p2.attackType)
    prevFightRef.current = curr
  }, [match.fight])

  useEffect(() => {
    if (match.status === 'match-over') sfx.win()
  }, [match.status])

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
      setMatch((prev) => stepMatch(prev, inputs))
    }, TICK_INTERVAL_MS)
    return () => clearInterval(id)
  }, [match.status])

  const restart = () => setMatch(createMatchState())

  const { fight, p1Wins, p2Wins, status, winnerLabel } = match

  const resultOverlay = status === 'match-over' && (
    <div className="tekken-overlay">
      <div className="tekken-result">
        <h3>{winnerLabel} 승리!</h3>
        <p>
          {p1Wins} : {p2Wins}
        </p>
        <div className="tekken-result-actions">
          <button className="btn btn-primary" onClick={restart}>
            다시하기
          </button>
          <button className="btn btn-secondary" onClick={onBack}>
            나가기
          </button>
        </div>
      </div>
    </div>
  )

  return (
    <div className="tekken">
      <TekkenView fight={fight} p1Wins={p1Wins} p2Wins={p2Wins} resultOverlay={resultOverlay} />
      <p className="tekken-help">
        P1: A/D 이동 · W 점프 · S 막기 · F 펀치 · G 킥
        <br />
        P2: ← → 이동 · ↑ 점프 · ↓ 막기 · K 펀치 · L 킥
      </p>
    </div>
  )
}
