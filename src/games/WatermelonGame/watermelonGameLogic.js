export const FRUITS = [
  { name: '체리', radius: 14, color: '#e63950', score: 1 },
  { name: '딸기', radius: 19, color: '#ff5d7a', score: 3 },
  { name: '포도', radius: 25, color: '#8e44ad', score: 6 },
  { name: '귤', radius: 31, color: '#f5a623', score: 10 },
  { name: '감', radius: 38, color: '#e8752c', score: 15 },
  { name: '사과', radius: 45, color: '#e63946', score: 21 },
  { name: '배', radius: 53, color: '#b5cc5a', score: 28 },
  { name: '복숭아', radius: 61, color: '#ffb3ab', score: 36 },
  { name: '파인애플', radius: 70, color: '#f4c430', score: 45 },
  { name: '멜론', radius: 80, color: '#7ec850', score: 55 },
  { name: '수박', radius: 92, color: '#2fa84f', score: 66 },
]

export const MAX_STAGE = FRUITS.length - 1
export const DROP_POOL_SIZE = 5
export const MERGE_BONUS_SCORE = 200

const DROP_WEIGHTS = Array.from({ length: DROP_POOL_SIZE }, (_, i) => DROP_POOL_SIZE - i)
const DROP_WEIGHT_TOTAL = DROP_WEIGHTS.reduce((a, b) => a + b, 0)

/** 작은 과일일수록 더 자주 나오도록 가중치를 둔 하위 5단계 중 랜덤 선택. */
export function randomDropStage() {
  let r = Math.random() * DROP_WEIGHT_TOTAL
  for (let i = 0; i < DROP_WEIGHTS.length; i++) {
    r -= DROP_WEIGHTS[i]
    if (r <= 0) return i
  }
  return 0
}

export function createFruitBody(Matter, x, y, stage) {
  const fruit = FRUITS[stage]
  const body = Matter.Bodies.circle(x, y, fruit.radius, {
    restitution: 0.15,
    friction: 0.35,
    frictionStatic: 0.6,
    frictionAir: 0.001,
    density: 0.0012,
  })
  body.fruitStage = stage
  body.merged = false
  body.spawnedAt = performance.now()
  return body
}

export function drawFruit(ctx, x, y, radius, stage, angle = 0, alpha = 1) {
  const fruit = FRUITS[stage]
  ctx.save()
  ctx.globalAlpha = alpha
  ctx.translate(x, y)
  ctx.rotate(angle)

  ctx.beginPath()
  ctx.arc(0, 0, radius, 0, Math.PI * 2)
  ctx.fillStyle = fruit.color
  ctx.fill()
  ctx.lineWidth = 2
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.25)'
  ctx.stroke()

  const eyeOffsetX = radius * 0.32
  const eyeOffsetY = -radius * 0.08
  const eyeR = Math.max(1.4, radius * 0.09)
  ctx.fillStyle = 'rgba(0, 0, 0, 0.55)'
  ctx.beginPath()
  ctx.arc(-eyeOffsetX, eyeOffsetY, eyeR, 0, Math.PI * 2)
  ctx.arc(eyeOffsetX, eyeOffsetY, eyeR, 0, Math.PI * 2)
  ctx.fill()

  ctx.beginPath()
  ctx.arc(0, radius * 0.22, radius * 0.28, 0, Math.PI, false)
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.55)'
  ctx.lineWidth = Math.max(1.4, radius * 0.07)
  ctx.stroke()

  ctx.restore()
}

export function drawMergeEffect(ctx, effect) {
  const t = effect.elapsedMs / effect.durationMs
  if (t >= 1) return
  const radius = effect.baseRadius * (1 + t * (effect.big ? 2.2 : 1.2))
  ctx.save()
  ctx.globalAlpha = 1 - t
  ctx.beginPath()
  ctx.arc(effect.x, effect.y, radius, 0, Math.PI * 2)
  ctx.strokeStyle = effect.color
  ctx.lineWidth = effect.big ? 6 : 4
  ctx.stroke()
  ctx.restore()
}
