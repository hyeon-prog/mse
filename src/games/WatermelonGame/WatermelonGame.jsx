import { useCallback, useEffect, useRef, useState } from 'react'
import {
  FRUITS,
  MAX_STAGE,
  MERGE_BONUS_SCORE,
  createFruitBody,
  drawFruit,
  drawMergeEffect,
  randomDropStage,
} from './watermelonGameLogic.js'
import './WatermelonGame.css'

const BEST_KEY = 'mse-watermelon-best'
const MATTER_CDN_URL = 'https://cdn.jsdelivr.net/npm/matter-js@0.19.0/build/matter.min.js'

const LOGICAL_WIDTH = 360
const LOGICAL_HEIGHT = 560
const WALL_THICKNESS = 16
const BOTTLE_MARGIN_TOP = 90
const BOTTLE_LEFT = 30
const BOTTLE_RIGHT = 330
const BOTTLE_BOTTOM = LOGICAL_HEIGHT - 20
const LINE_Y = BOTTLE_MARGIN_TOP + 40
const PREVIEW_Y = BOTTLE_MARGIN_TOP - 30
const DANGER_MS = 2000
const DROP_COOLDOWN_MS = 350
const SETTLE_SPEED = 0.05
const SPAWN_GRACE_MS = 400

let matterLoadPromise = null
function loadMatter() {
  if (typeof window !== 'undefined' && window.Matter) return Promise.resolve(window.Matter)
  if (!matterLoadPromise) {
    matterLoadPromise = new Promise((resolve, reject) => {
      const script = document.createElement('script')
      script.src = MATTER_CDN_URL
      script.async = true
      script.onload = () => resolve(window.Matter)
      script.onerror = () => reject(new Error('Matter.js 로드 실패'))
      document.body.appendChild(script)
    })
  }
  return matterLoadPromise
}

function clampAimX(x, radius) {
  return Math.max(BOTTLE_LEFT + radius, Math.min(BOTTLE_RIGHT - radius, x))
}

const LEGEND_ICON_SIZE = 34

function FruitIcon({ stage }) {
  const canvasRef = useRef(null)
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    ctx.clearRect(0, 0, LEGEND_ICON_SIZE, LEGEND_ICON_SIZE)
    drawFruit(ctx, LEGEND_ICON_SIZE / 2, LEGEND_ICON_SIZE / 2, LEGEND_ICON_SIZE * 0.38, stage)
  }, [stage])
  return <canvas ref={canvasRef} width={LEGEND_ICON_SIZE} height={LEGEND_ICON_SIZE} />
}

function FruitLegend({ activeStage }) {
  return (
    <div className="watermelon-legend">
      <h4>과일 단계</h4>
      <ol>
        {FRUITS.map((fruit, stage) => (
          <li key={fruit.name} className={stage === activeStage ? 'active' : ''}>
            <FruitIcon stage={stage} />
            <span>{fruit.name}</span>
          </li>
        ))}
      </ol>
    </div>
  )
}

export default function WatermelonGame() {
  const canvasRef = useRef(null)
  const matterRef = useRef(null)
  const rafRef = useRef(null)
  const lastTsRef = useRef(0)
  const effectsRef = useRef([])
  const mergeQueueRef = useRef([])
  const aimXRef = useRef(LOGICAL_WIDTH / 2)
  const lastDropAtRef = useRef(0)
  const draggingRef = useRef(false)
  const dangerMsRef = useRef(0)
  const bestScoreRef = useRef(0)
  const reportedOverRef = useRef(false)
  const gameRef = useRef({ status: 'idle', score: 0, nextStage: randomDropStage() })

  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [phase, setPhase] = useState('idle')
  const [score, setScore] = useState(0)
  const [bestScore, setBestScore] = useState(0)
  const [nextStage, setNextStage] = useState(gameRef.current.nextStage)

  const spawnEffect = useCallback((x, y, stage, big) => {
    effectsRef.current.push({
      x,
      y,
      color: FRUITS[stage].color,
      baseRadius: FRUITS[stage].radius,
      elapsedMs: 0,
      durationMs: big ? 550 : 320,
      big,
    })
  }, [])

  const processMergeQueue = useCallback(
    (matter) => {
      if (mergeQueueRef.current.length === 0) return
      const { Matter, world } = matter
      for (const { bodyA, bodyB } of mergeQueueRef.current) {
        const midX = (bodyA.position.x + bodyB.position.x) / 2
        const midY = (bodyA.position.y + bodyB.position.y) / 2
        Matter.World.remove(world, bodyA)
        Matter.World.remove(world, bodyB)

        if (bodyA.fruitStage >= MAX_STAGE) {
          gameRef.current.score += MERGE_BONUS_SCORE
          spawnEffect(midX, midY, MAX_STAGE, true)
        } else {
          const nextFruitStage = bodyA.fruitStage + 1
          gameRef.current.score += FRUITS[nextFruitStage].score
          const merged = createFruitBody(Matter, midX, midY, nextFruitStage)
          Matter.World.add(world, merged)
          spawnEffect(midX, midY, nextFruitStage, false)
        }
      }
      mergeQueueRef.current = []
      setScore(gameRef.current.score)
    },
    [spawnEffect],
  )

  const updateDanger = useCallback((matter, dtMs) => {
    const { Matter, world } = matter
    const now = performance.now()
    let dangerous = false
    for (const body of Matter.Composite.allBodies(world)) {
      if (body.isStatic) continue
      if (now - body.spawnedAt < SPAWN_GRACE_MS) continue
      const top = body.position.y - body.circleRadius
      if (top < LINE_Y && Math.abs(body.velocity.x) < SETTLE_SPEED && Math.abs(body.velocity.y) < SETTLE_SPEED) {
        dangerous = true
        break
      }
    }
    if (dangerous) {
      dangerMsRef.current += dtMs
      if (dangerMsRef.current >= DANGER_MS) {
        gameRef.current.status = 'over'
      }
    } else {
      dangerMsRef.current = 0
    }
  }, [])

  const render = useCallback(
    (ctx, matter) => {
      ctx.clearRect(0, 0, LOGICAL_WIDTH, LOGICAL_HEIGHT)
      ctx.fillStyle = '#120a24'
      ctx.fillRect(0, 0, LOGICAL_WIDTH, LOGICAL_HEIGHT)

      ctx.strokeStyle = '#ff2f92'
      ctx.lineWidth = 4
      ctx.beginPath()
      ctx.moveTo(BOTTLE_LEFT, BOTTLE_MARGIN_TOP)
      ctx.lineTo(BOTTLE_LEFT, BOTTLE_BOTTOM)
      ctx.lineTo(BOTTLE_RIGHT, BOTTLE_BOTTOM)
      ctx.lineTo(BOTTLE_RIGHT, BOTTLE_MARGIN_TOP)
      ctx.stroke()

      ctx.strokeStyle = 'rgba(255, 59, 59, 0.65)'
      ctx.setLineDash([6, 6])
      ctx.beginPath()
      ctx.moveTo(BOTTLE_LEFT, LINE_Y)
      ctx.lineTo(BOTTLE_RIGHT, LINE_Y)
      ctx.stroke()
      ctx.setLineDash([])

      if (matter) {
        for (const body of matter.Matter.Composite.allBodies(matter.world)) {
          if (body.isStatic) continue
          drawFruit(ctx, body.position.x, body.position.y, body.circleRadius, body.fruitStage, body.angle)
        }
      }

      for (const effect of effectsRef.current) {
        drawMergeEffect(ctx, effect)
      }

      if (gameRef.current.status === 'playing') {
        drawFruit(ctx, aimXRef.current, PREVIEW_Y, FRUITS[gameRef.current.nextStage].radius, gameRef.current.nextStage, 0, 0.55)
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)'
        ctx.setLineDash([4, 6])
        ctx.beginPath()
        ctx.moveTo(aimXRef.current, PREVIEW_Y)
        ctx.lineTo(aimXRef.current, LINE_Y)
        ctx.stroke()
        ctx.setLineDash([])
      }

      ctx.fillStyle = '#f3ecff'
      ctx.font = 'bold 22px "Press Start 2P", monospace'
      ctx.textAlign = 'center'
      ctx.fillText(String(gameRef.current.score), LOGICAL_WIDTH / 2, 40)
    },
    [],
  )

  const loop = useCallback(
    (ts) => {
      const dt = Math.min(50, ts - (lastTsRef.current || ts))
      lastTsRef.current = ts
      const matter = matterRef.current
      const ctx = canvasRef.current?.getContext('2d')

      if (matter && ctx) {
        if (gameRef.current.status === 'playing') {
          matter.Matter.Engine.update(matter.engine, dt)
          processMergeQueue(matter)
          updateDanger(matter, dt)
        }

        for (const effect of effectsRef.current) {
          effect.elapsedMs += dt
        }
        effectsRef.current = effectsRef.current.filter((e) => e.elapsedMs < e.durationMs)

        if (gameRef.current.status === 'over' && !reportedOverRef.current) {
          reportedOverRef.current = true
          if (gameRef.current.score > bestScoreRef.current) {
            bestScoreRef.current = gameRef.current.score
            localStorage.setItem(BEST_KEY, String(gameRef.current.score))
            setBestScore(gameRef.current.score)
          }
          setPhase('over')
        }

        render(ctx, matter)
      }
      rafRef.current = requestAnimationFrame(loop)
    },
    [processMergeQueue, updateDanger, render],
  )

  useEffect(() => {
    const canvas = canvasRef.current
    const dpr = window.devicePixelRatio || 1
    canvas.width = LOGICAL_WIDTH * dpr
    canvas.height = LOGICAL_HEIGHT * dpr
    canvas.getContext('2d').scale(dpr, dpr)

    const raw = localStorage.getItem(BEST_KEY)
    const initialBest = raw ? Number(raw) || 0 : 0
    bestScoreRef.current = initialBest
    setBestScore(initialBest)

    let cancelled = false
    loadMatter()
      .then((Matter) => {
        if (cancelled) return
        const engine = Matter.Engine.create()
        engine.world.gravity.y = 1.15
        const world = engine.world

        const ground = Matter.Bodies.rectangle(
          LOGICAL_WIDTH / 2,
          BOTTLE_BOTTOM + WALL_THICKNESS / 2,
          BOTTLE_RIGHT - BOTTLE_LEFT + WALL_THICKNESS * 2,
          WALL_THICKNESS,
          { isStatic: true },
        )
        const leftWall = Matter.Bodies.rectangle(
          BOTTLE_LEFT - WALL_THICKNESS / 2,
          (BOTTLE_MARGIN_TOP + BOTTLE_BOTTOM) / 2,
          WALL_THICKNESS,
          BOTTLE_BOTTOM - BOTTLE_MARGIN_TOP + WALL_THICKNESS,
          { isStatic: true },
        )
        const rightWall = Matter.Bodies.rectangle(
          BOTTLE_RIGHT + WALL_THICKNESS / 2,
          (BOTTLE_MARGIN_TOP + BOTTLE_BOTTOM) / 2,
          WALL_THICKNESS,
          BOTTLE_BOTTOM - BOTTLE_MARGIN_TOP + WALL_THICKNESS,
          { isStatic: true },
        )
        Matter.World.add(world, [ground, leftWall, rightWall])

        Matter.Events.on(engine, 'collisionStart', (event) => {
          for (const pair of event.pairs) {
            const { bodyA, bodyB } = pair
            if (bodyA.fruitStage == null || bodyB.fruitStage == null) continue
            if (bodyA.merged || bodyB.merged) continue
            if (bodyA.fruitStage !== bodyB.fruitStage) continue
            bodyA.merged = true
            bodyB.merged = true
            mergeQueueRef.current.push({ bodyA, bodyB })
          }
        })

        matterRef.current = { Matter, engine, world }
        setLoading(false)
        rafRef.current = requestAnimationFrame(loop)
      })
      .catch(() => {
        if (cancelled) return
        setLoadError('게임을 불러오지 못했습니다. 새로고침해 주세요.')
        setLoading(false)
      })

    return () => {
      cancelled = true
      cancelAnimationFrame(rafRef.current)
    }
  }, [loop])

  const startGame = () => {
    const matter = matterRef.current
    if (matter) {
      for (const body of matter.Matter.Composite.allBodies(matter.world)) {
        if (!body.isStatic) matter.Matter.World.remove(matter.world, body)
      }
    }
    effectsRef.current = []
    mergeQueueRef.current = []
    dangerMsRef.current = 0
    reportedOverRef.current = false
    const firstNext = randomDropStage()
    gameRef.current = { status: 'playing', score: 0, nextStage: firstNext }
    setScore(0)
    setNextStage(firstNext)
    setPhase('playing')
  }

  const updateAim = (e) => {
    const rect = canvasRef.current.getBoundingClientRect()
    const ratio = LOGICAL_WIDTH / rect.width
    const logicalX = (e.clientX - rect.left) * ratio
    aimXRef.current = clampAimX(logicalX, FRUITS[gameRef.current.nextStage].radius)
  }

  const handlePointerDown = (e) => {
    if (gameRef.current.status !== 'playing') return
    // 터치 캡처를 걸어서, 손가락이 캔버스 밖으로 살짝 벗어난 채 떼더라도 pointerup이 확실히 이 캔버스로 옵니다.
    canvasRef.current?.setPointerCapture?.(e.pointerId)
    draggingRef.current = true
    updateAim(e)
  }

  const handlePointerMove = (e) => {
    // 데스크톱 마우스는 누르지 않고 움직이기만 해도(hover) 조준선이 따라와야 하므로
    // draggingRef 여부와 관계없이 항상 조준을 갱신합니다. 터치는 손가락을 뗀 상태에서는
    // 애초에 pointermove 자체가 발생하지 않으므로 별도 분기가 필요 없습니다.
    if (gameRef.current.status !== 'playing') return
    updateAim(e)
  }

  // 터치/클릭을 누르는 순간이 아니라 뗄 때 드롭합니다 - 눌러서 스크롤/조준을 조정하는 동안에는
  // 과일이 떨어지지 않고, 손을 떼는 순간에만 실제로 떨어집니다.
  const handlePointerUp = (e) => {
    const wasDragging = draggingRef.current
    draggingRef.current = false
    if (!wasDragging) return
    if (gameRef.current.status !== 'playing') return
    updateAim(e)

    const matter = matterRef.current
    if (!matter) return
    const now = performance.now()
    if (now - lastDropAtRef.current < DROP_COOLDOWN_MS) return
    lastDropAtRef.current = now

    const stage = gameRef.current.nextStage
    const body = createFruitBody(matter.Matter, aimXRef.current, PREVIEW_Y, stage)
    matter.Matter.World.add(matter.world, body)

    const nextFruitStage = randomDropStage()
    gameRef.current.nextStage = nextFruitStage
    setNextStage(nextFruitStage)
  }

  const handlePointerCancel = () => {
    draggingRef.current = false
  }

  return (
    <div className="watermelon-game">
      <div className="watermelon-hud">
        <span>점수: {score}</span>
        <span>최고 점수: {bestScore}</span>
        <span className="watermelon-next">
          다음 <span style={{ color: FRUITS[nextStage].color }}>{FRUITS[nextStage].name}</span>
        </span>
      </div>

      <div className="watermelon-layout">
        <div className="watermelon-canvas-wrap">
          <canvas
            ref={canvasRef}
            className="watermelon-canvas"
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerCancel}
          />

          {loading && (
            <div className="watermelon-overlay">
              <div className="watermelon-result">
                <h3>불러오는 중...</h3>
                {loadError && <p className="watermelon-error">{loadError}</p>}
              </div>
            </div>
          )}

          {!loading && phase === 'idle' && (
            <div className="watermelon-overlay">
              <div className="watermelon-result">
                <h3>수박게임</h3>
                <p>같은 과일 두 개를 부딫혀 합치고, 수박까지 진화시켜 보세요.</p>
                <p>최고 점수: {bestScore}</p>
                <button className="btn btn-primary" onClick={startGame}>
                  시작하기
                </button>
              </div>
            </div>
          )}

          {phase === 'over' && (
            <div className="watermelon-overlay">
              <div className="watermelon-result">
                <h3>게임 오버</h3>
                <p>최종 점수: {score}</p>
                <p>최고 점수: {bestScore}</p>
                <button className="btn btn-primary" onClick={startGame}>
                  다시하기
                </button>
              </div>
            </div>
          )}
        </div>

        <FruitLegend activeStage={phase === 'playing' ? nextStage : -1} />
      </div>

      <p className="watermelon-help">마우스/터치로 좌우 이동, 클릭/탭으로 떨어뜨리세요. 병 위 경고선을 넘어 2초 이상 쌓이면 게임 오버.</p>
    </div>
  )
}
