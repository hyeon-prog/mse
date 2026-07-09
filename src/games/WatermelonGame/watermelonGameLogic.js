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

function drawFace(ctx, radius) {
  const eyeOffsetX = radius * 0.3
  const eyeOffsetY = -radius * 0.05
  const eyeR = Math.max(1.6, radius * 0.1)
  ctx.fillStyle = 'rgba(35, 25, 20, 0.85)'
  ctx.beginPath()
  ctx.arc(-eyeOffsetX, eyeOffsetY, eyeR, 0, Math.PI * 2)
  ctx.arc(eyeOffsetX, eyeOffsetY, eyeR, 0, Math.PI * 2)
  ctx.fill()

  ctx.beginPath()
  ctx.arc(0, radius * 0.24, radius * 0.24, 0, Math.PI, false)
  ctx.strokeStyle = 'rgba(35, 25, 20, 0.75)'
  ctx.lineWidth = Math.max(1.4, radius * 0.07)
  ctx.stroke()

  ctx.fillStyle = 'rgba(255, 120, 130, 0.35)'
  ctx.beginPath()
  ctx.arc(-radius * 0.55, radius * 0.16, radius * 0.13, 0, Math.PI * 2)
  ctx.arc(radius * 0.55, radius * 0.16, radius * 0.13, 0, Math.PI * 2)
  ctx.fill()
}

function drawDots(ctx, radius, color, count, rMin, rMax, dotR) {
  ctx.fillStyle = color
  for (let i = 0; i < count; i++) {
    const a = (i / count) * Math.PI * 2 + i * 0.7
    const d = rMin + (((i * 37) % 100) / 100) * (rMax - rMin)
    ctx.beginPath()
    ctx.arc(Math.cos(a) * d, Math.sin(a) * d, dotR, 0, Math.PI * 2)
    ctx.fill()
  }
}

/** 원(단계별 색/텍스처) 내부에 그려지는, 원 밖으로 삐져나오지 않는 무늬 (클리핑된 상태에서 호출됨). */
function drawStagePattern(ctx, radius, stage) {
  switch (stage) {
    case 1: // 딸기: 씨
      drawDots(ctx, radius, '#ffe08a', 10, radius * 0.3, radius * 0.75, Math.max(1, radius * 0.06))
      break
    case 2: // 포도: 알맹이 뭉치 느낌의 하이라이트
      ctx.fillStyle = 'rgba(255, 255, 255, 0.16)'
      for (const [dx, dy, r] of [
        [-0.32, -0.15, 0.32],
        [0.3, -0.05, 0.3],
        [0, 0.35, 0.34],
        [-0.05, -0.4, 0.24],
      ]) {
        ctx.beginPath()
        ctx.arc(radius * dx, radius * dy, radius * r, 0, Math.PI * 2)
        ctx.fill()
      }
      break
    case 3: // 귤: 오돌토돌한 껍질
      drawDots(ctx, radius, 'rgba(200, 110, 20, 0.35)', 14, radius * 0.2, radius * 0.8, Math.max(1, radius * 0.045))
      break
    case 4: // 감: 세로 골
      ctx.strokeStyle = 'rgba(150, 70, 10, 0.28)'
      ctx.lineWidth = Math.max(1, radius * 0.035)
      for (const dx of [-0.4, -0.13, 0.13, 0.4]) {
        ctx.beginPath()
        ctx.moveTo(radius * dx, -radius * 0.85)
        ctx.quadraticCurveTo(radius * dx * 1.3, 0, radius * dx, radius * 0.85)
        ctx.stroke()
      }
      break
    case 6: // 배: 갈색 반점
      drawDots(ctx, radius, 'rgba(140, 100, 40, 0.4)', 10, radius * 0.25, radius * 0.85, Math.max(1, radius * 0.05))
      break
    case 7: // 복숭아: 가운데 홈
      ctx.strokeStyle = 'rgba(210, 90, 90, 0.4)'
      ctx.lineWidth = Math.max(1.5, radius * 0.05)
      ctx.beginPath()
      ctx.moveTo(0, -radius * 0.85)
      ctx.quadraticCurveTo(radius * 0.06, 0, 0, radius * 0.6)
      ctx.stroke()
      break
    case 8: // 파인애플: 다이아몬드 격자
      ctx.strokeStyle = 'rgba(150, 100, 20, 0.5)'
      ctx.lineWidth = Math.max(1, radius * 0.035)
      for (let d = -radius * 2; d < radius * 2; d += radius * 0.32) {
        ctx.beginPath()
        ctx.moveTo(d - radius, -radius)
        ctx.lineTo(d + radius, radius)
        ctx.stroke()
        ctx.beginPath()
        ctx.moveTo(d - radius, radius)
        ctx.lineTo(d + radius, -radius)
        ctx.stroke()
      }
      break
    case 9: // 멜론: 그물 무늬
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.32)'
      ctx.lineWidth = Math.max(1, radius * 0.035)
      for (let i = -2; i <= 2; i++) {
        ctx.beginPath()
        ctx.moveTo(-radius, i * radius * 0.35)
        ctx.quadraticCurveTo(0, i * radius * 0.35 + radius * 0.25, radius, i * radius * 0.35)
        ctx.stroke()
        ctx.beginPath()
        ctx.moveTo(i * radius * 0.35, -radius)
        ctx.quadraticCurveTo(i * radius * 0.35 + radius * 0.25, 0, i * radius * 0.35, radius)
        ctx.stroke()
      }
      break
    case 10: // 수박: 짙은 초록 줄무늬
      ctx.strokeStyle = '#1e6b34'
      ctx.lineWidth = Math.max(2, radius * 0.14)
      for (const dx of [-0.55, -0.28, 0, 0.28, 0.55]) {
        ctx.beginPath()
        ctx.moveTo(radius * dx * 0.6, -radius * 0.97)
        ctx.quadraticCurveTo(radius * dx * 1.15, 0, radius * dx * 0.6, radius * 0.97)
        ctx.stroke()
      }
      break
    default:
      break
  }
}

function drawSimpleStem(ctx, radius, curly = false) {
  ctx.strokeStyle = '#6b4423'
  ctx.lineWidth = Math.max(1.6, radius * 0.07)
  ctx.beginPath()
  ctx.moveTo(0, -radius * 0.95)
  if (curly) {
    ctx.quadraticCurveTo(radius * 0.25, -radius * 1.1, radius * 0.05, -radius * 1.25)
  } else {
    ctx.lineTo(0, -radius * 1.18)
  }
  ctx.stroke()
}

function drawStemLeaf(ctx, radius, { curl = 1, leafScale = 1 } = {}) {
  drawSimpleStem(ctx, radius, false)
  ctx.save()
  ctx.translate(radius * 0.05 * curl, -radius * 1.05)
  ctx.rotate(-0.5 * curl)
  ctx.beginPath()
  ctx.ellipse(0, 0, radius * 0.26 * leafScale, radius * 0.13 * leafScale, 0, 0, Math.PI * 2)
  ctx.fillStyle = '#4caf50'
  ctx.fill()
  ctx.restore()
}

function drawCalyx(ctx, radius, color, points) {
  ctx.fillStyle = color
  const r = radius * 0.22
  ctx.save()
  ctx.translate(0, -radius * 0.9)
  for (let i = 0; i < points; i++) {
    ctx.save()
    ctx.rotate((i / points) * Math.PI * 2)
    ctx.beginPath()
    ctx.moveTo(0, 0)
    ctx.lineTo(-r * 0.4, -r)
    ctx.lineTo(r * 0.4, -r)
    ctx.closePath()
    ctx.fill()
    ctx.restore()
  }
  ctx.restore()
}

function drawPineappleCrown(ctx, radius) {
  ctx.fillStyle = '#3f9142'
  const spikes = 5
  for (let i = 0; i < spikes; i++) {
    const t = (i - (spikes - 1) / 2) * 0.34
    ctx.save()
    ctx.translate(radius * t * 0.9, -radius * 0.92)
    ctx.rotate(t * 0.9)
    ctx.beginPath()
    ctx.moveTo(-radius * 0.12, 0)
    ctx.lineTo(radius * 0.12, 0)
    ctx.lineTo(0, -radius * 0.55)
    ctx.closePath()
    ctx.fill()
    ctx.restore()
  }
}

/** 원 밖으로 삐져나올 수 있는 줄기/꽃받침/잎 장식 (클리핑 해제 후 호출됨). */
function drawTopDecoration(ctx, radius, stage) {
  switch (stage) {
    case 0: // 체리
      drawStemLeaf(ctx, radius, { curl: 1, leafScale: 0.8 })
      break
    case 1: // 딸기
      drawCalyx(ctx, radius, '#3f9142', 5)
      break
    case 2: // 포도
      drawSimpleStem(ctx, radius)
      break
    case 3: // 귤
      drawStemLeaf(ctx, radius, { curl: -1, leafScale: 0.9 })
      break
    case 4: // 감
      drawCalyx(ctx, radius, '#7a4a1e', 4)
      break
    case 5: // 사과
      drawStemLeaf(ctx, radius, { curl: 1, leafScale: 1 })
      break
    case 6: // 배
      drawStemLeaf(ctx, radius, { curl: -1, leafScale: 1 })
      break
    case 7: // 복숭아
      drawStemLeaf(ctx, radius, { curl: 1, leafScale: 0.8 })
      break
    case 8: // 파인애플
      drawPineappleCrown(ctx, radius)
      break
    case 9: // 멜론
      drawSimpleStem(ctx, radius)
      break
    case 10: // 수박
      drawSimpleStem(ctx, radius, true)
      break
    default:
      break
  }
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

  ctx.save()
  ctx.beginPath()
  ctx.arc(0, 0, radius, 0, Math.PI * 2)
  ctx.clip()

  drawStagePattern(ctx, radius, stage)

  ctx.beginPath()
  ctx.ellipse(-radius * 0.32, -radius * 0.38, radius * 0.22, radius * 0.14, -0.6, 0, Math.PI * 2)
  ctx.fillStyle = 'rgba(255, 255, 255, 0.32)'
  ctx.fill()

  drawFace(ctx, radius)
  ctx.restore()

  ctx.lineWidth = Math.max(1.5, radius * 0.045)
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.25)'
  ctx.beginPath()
  ctx.arc(0, 0, radius, 0, Math.PI * 2)
  ctx.stroke()

  drawTopDecoration(ctx, radius, stage)

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
