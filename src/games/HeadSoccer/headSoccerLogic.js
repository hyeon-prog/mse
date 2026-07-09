export const FIELD_WIDTH = 480
export const FIELD_HEIGHT = 280
export const GROUND_Y = FIELD_HEIGHT - 26
export const CEILING_Y = 18
export const GOAL_HEIGHT = 84
export const GOAL_POST_WIDTH = 10

export const CHAR_RADIUS = 22
export const CHAR_SPEED = 190
export const CHAR_JUMP_SPEED = 350
export const GRAVITY = 900

export const BALL_RADIUS = 11
export const BALL_GRAVITY = 780
export const BALL_RESTITUTION = 0.72
export const BALL_WALL_RESTITUTION = 0.65

export const KICK_RANGE = 46
export const KICK_COOLDOWN_MS = 260
export const KICK_POWER = 560
export const KICK_POSE_MS = 220

export const MATCH_DURATION_MS = 60000
export const WIN_SCORE = 5
export const GOAL_CELEBRATION_MS = 1400

export function createCharacter(x, side, isCPU) {
  return {
    x,
    y: GROUND_Y - CHAR_RADIUS,
    vx: 0,
    vy: 0,
    onGround: true,
    facing: side === 'left' ? 1 : -1,
    side,
    isCPU,
    kickCooldownMs: 0,
    kickPoseMs: 0,
    moveDir: 0,
    wantsJump: false,
    wantsKick: false,
  }
}

export function createBall() {
  return { x: FIELD_WIDTH / 2, y: FIELD_HEIGHT / 2 - 30, vx: 0, vy: 0 }
}

export function createMatch(mode) {
  return {
    mode,
    p1: createCharacter(FIELD_WIDTH * 0.25, 'left', false),
    p2: createCharacter(FIELD_WIDTH * 0.75, 'right', mode === '1p'),
    ball: createBall(),
    scoreLeft: 0,
    scoreRight: 0,
    timeLeftMs: MATCH_DURATION_MS,
    status: 'playing',
    goalCelebrationMs: 0,
    lastScorer: null,
    winner: null,
    elapsedMs: 0,
    aiTimerMs: 0,
  }
}

function resetPositions(match) {
  match.p1.x = FIELD_WIDTH * 0.25
  match.p1.y = GROUND_Y - CHAR_RADIUS
  match.p1.vx = 0
  match.p1.vy = 0
  match.p1.facing = 1
  match.p2.x = FIELD_WIDTH * 0.75
  match.p2.y = GROUND_Y - CHAR_RADIUS
  match.p2.vx = 0
  match.p2.vy = 0
  match.p2.facing = -1
  match.ball.x = FIELD_WIDTH / 2
  match.ball.y = FIELD_HEIGHT / 2 - 30
  match.ball.vx = 0
  match.ball.vy = 0
}

function updateCharacter(c, dt) {
  c.vx = c.moveDir * CHAR_SPEED
  if (c.moveDir !== 0) c.facing = c.moveDir

  if (c.wantsJump && c.onGround) {
    c.vy = -CHAR_JUMP_SPEED
    c.onGround = false
  }
  c.wantsJump = false

  c.vy += GRAVITY * dt
  c.x += c.vx * dt
  c.y += c.vy * dt

  const minX = GOAL_POST_WIDTH + CHAR_RADIUS
  const maxX = FIELD_WIDTH - GOAL_POST_WIDTH - CHAR_RADIUS
  c.x = Math.max(minX, Math.min(maxX, c.x))

  const groundY = GROUND_Y - CHAR_RADIUS
  if (c.y >= groundY) {
    c.y = groundY
    c.vy = 0
    c.onGround = true
  }

  if (c.kickCooldownMs > 0) c.kickCooldownMs -= dt * 1000
  if (c.kickPoseMs > 0) c.kickPoseMs -= dt * 1000
}

function separateCharacters(a, b) {
  const dx = b.x - a.x
  const dist = Math.abs(dx)
  const minDist = CHAR_RADIUS * 1.8
  if (dist < minDist && dist > 0.001) {
    const push = (minDist - dist) / 2
    const dir = Math.sign(dx)
    a.x -= push * dir
    b.x += push * dir
  }
}

function tryKick(c, ball) {
  if (!c.wantsKick) return
  c.wantsKick = false
  if (c.kickCooldownMs > 0) return

  const dx = ball.x - c.x
  const dy = ball.y - c.y
  const dist = Math.hypot(dx, dy)
  if (dist > KICK_RANGE) return

  const nx = dist > 0.001 ? dx / dist : c.facing
  const ny = dist > 0.001 ? dy / dist : -0.3
  ball.vx += nx * KICK_POWER + c.facing * 150
  ball.vy += ny * KICK_POWER - 110
  c.kickCooldownMs = KICK_COOLDOWN_MS
  c.kickPoseMs = KICK_POSE_MS
}

function resolveBallCharacterCollision(ball, c) {
  const dx = ball.x - c.x
  const dy = ball.y - c.y
  const dist = Math.hypot(dx, dy)
  const minDist = BALL_RADIUS + CHAR_RADIUS
  if (dist >= minDist || dist < 0.001) return

  const nx = dx / dist
  const ny = dy / dist
  const overlap = minDist - dist
  ball.x += nx * overlap
  ball.y += ny * overlap

  const relVx = ball.vx - c.vx
  const relVy = ball.vy - c.vy
  const velAlongNormal = relVx * nx + relVy * ny
  if (velAlongNormal < 0) {
    const restitution = 1.1
    ball.vx -= (1 + restitution) * velAlongNormal * nx
    ball.vy -= (1 + restitution) * velAlongNormal * ny
  }

  // 캐릭터 위쪽(머리)으로 맞은 헤딩은 살짝 더 튀어오르며 캐릭터가 보는 방향으로 힘을 보탭니다.
  if (ny < -0.3) {
    ball.vy -= 55
    ball.vx += c.facing * 35
  }
}

function updateBall(ball, dt) {
  ball.vy += BALL_GRAVITY * dt
  ball.x += ball.vx * dt
  ball.y += ball.vy * dt
  ball.vx *= 0.999

  const floorY = GROUND_Y - BALL_RADIUS
  if (ball.y > floorY) {
    ball.y = floorY
    ball.vy = -ball.vy * BALL_RESTITUTION
    ball.vx *= 0.98
  }

  const ceilY = CEILING_Y + BALL_RADIUS
  if (ball.y < ceilY) {
    ball.y = ceilY
    ball.vy = -ball.vy * BALL_RESTITUTION
  }

  const inGoalHeightRange = ball.y > GROUND_Y - GOAL_HEIGHT
  const leftWallX = GOAL_POST_WIDTH + BALL_RADIUS
  const rightWallX = FIELD_WIDTH - GOAL_POST_WIDTH - BALL_RADIUS
  if (!inGoalHeightRange) {
    if (ball.x < leftWallX) {
      ball.x = leftWallX
      ball.vx = -ball.vx * BALL_WALL_RESTITUTION
    }
    if (ball.x > rightWallX) {
      ball.x = rightWallX
      ball.vx = -ball.vx * BALL_WALL_RESTITUTION
    }
  }
}

function checkGoal(ball) {
  const inGoalHeightRange = ball.y > GROUND_Y - GOAL_HEIGHT
  if (!inGoalHeightRange) return null
  if (ball.x < 0) return 'right'
  if (ball.x > FIELD_WIDTH) return 'left'
  return null
}

/** 간단한 반응형 CPU: 공 쪽으로 이동하고, 가까우면 점프/킥을 시도합니다. */
function updateCPU(match, dt) {
  const c = match.p2
  const ball = match.ball

  match.aiTimerMs -= dt * 1000
  if (match.aiTimerMs <= 0) {
    match.aiTimerMs = 120 + Math.random() * 80
    const dx = ball.x - c.x
    const dy = ball.y - c.y
    const dist = Math.hypot(dx, dy)

    c.moveDir = Math.abs(dx) > 12 ? Math.sign(dx) : 0
    c.wantsJump = dy < -18 && dist < 90 && c.onGround
    c.wantsKick = dist < KICK_RANGE + 6
  }
}

export function update(match, dtMs) {
  if (match.status === 'over') return

  if (match.status === 'goal') {
    match.goalCelebrationMs -= dtMs
    if (match.goalCelebrationMs <= 0) {
      resetPositions(match)
      match.status = 'playing'
    }
    return
  }

  const dt = Math.min(0.033, dtMs / 1000)
  match.elapsedMs += dtMs

  const tied = match.scoreLeft === match.scoreRight
  match.timeLeftMs = Math.max(0, match.timeLeftMs - dtMs)

  if (match.p2.isCPU) updateCPU(match, dt)

  updateCharacter(match.p1, dt)
  updateCharacter(match.p2, dt)
  separateCharacters(match.p1, match.p2)
  tryKick(match.p1, match.ball)
  tryKick(match.p2, match.ball)
  updateBall(match.ball, dt)
  resolveBallCharacterCollision(match.ball, match.p1)
  resolveBallCharacterCollision(match.ball, match.p2)

  const scorer = checkGoal(match.ball)
  if (scorer) {
    if (scorer === 'left') match.scoreLeft += 1
    else match.scoreRight += 1
    match.lastScorer = scorer
    match.status = 'goal'
    match.goalCelebrationMs = GOAL_CELEBRATION_MS

    if (match.scoreLeft >= WIN_SCORE || match.scoreRight >= WIN_SCORE) {
      match.status = 'over'
      match.winner = match.scoreLeft > match.scoreRight ? 'left' : 'right'
    }
    return
  }

  if (match.timeLeftMs <= 0 && !tied) {
    match.status = 'over'
    match.winner = match.scoreLeft > match.scoreRight ? 'left' : 'right'
  }
}

// 초등학생 마스코트 같은 2등신 비율: 머리 지름이 전체 키의 절반을 차지하도록 그린다.
// 물리 충돌은 여전히 CHAR_RADIUS 원 하나로 처리하므로, 시각적 키는 그 지름(2 * CHAR_RADIUS)에 맞춰
// head-top이 -CHAR_RADIUS, feet가 +CHAR_RADIUS에 오도록 배치해 헤딩 판정 위치와 그림이 어긋나지 않게 한다.
const HEAD_R = CHAR_RADIUS * 0.5
const HEAD_TOP_Y = -CHAR_RADIUS
const NECK_Y = 0
const TORSO_BOTTOM_Y = CHAR_RADIUS * 0.65
const FEET_Y = CHAR_RADIUS
const HEAD_CENTER_Y = HEAD_TOP_Y + HEAD_R

function strokeOutlined(ctx, outlineWidth, colorWidth, color) {
  ctx.lineWidth = outlineWidth
  ctx.strokeStyle = 'rgba(20, 30, 20, 0.4)'
  ctx.stroke()
  ctx.lineWidth = colorWidth
  ctx.strokeStyle = color
  ctx.stroke()
}

function drawCharacter(ctx, c, color) {
  const swing = c.onGround && c.moveDir !== 0 ? Math.sin(c.x / 6) : 0
  const legSwing = swing * 6
  const armSwing = swing * 5

  ctx.save()
  ctx.translate(c.x, c.y)
  ctx.lineCap = 'round'

  // 다리: 통통하고 짧은 2등신 다리
  ctx.beginPath()
  ctx.moveTo(-5, TORSO_BOTTOM_Y)
  ctx.lineTo(-5 + legSwing, FEET_Y)
  ctx.moveTo(5, TORSO_BOTTOM_Y)
  ctx.lineTo(5 - legSwing, FEET_Y)
  strokeOutlined(ctx, 7, 5, color)

  // 킥 다리
  if (c.kickPoseMs > 0) {
    ctx.beginPath()
    ctx.moveTo(0, TORSO_BOTTOM_Y)
    ctx.lineTo(c.facing * CHAR_RADIUS * 0.9, TORSO_BOTTOM_Y + 4)
    strokeOutlined(ctx, 7, 5, color)
  }

  // 팔: 옆으로 짧게 뻗은 팔 (요청대로 팔다리가 잘 보이게)
  ctx.beginPath()
  ctx.moveTo(-CHAR_RADIUS * 0.32, NECK_Y + 3)
  ctx.lineTo(-CHAR_RADIUS * 0.62, TORSO_BOTTOM_Y - 1 + armSwing)
  ctx.moveTo(CHAR_RADIUS * 0.32, NECK_Y + 3)
  ctx.lineTo(CHAR_RADIUS * 0.62, TORSO_BOTTOM_Y - 1 - armSwing)
  strokeOutlined(ctx, 6, 4, color)

  // 몸통: 머리 절반 크기의 짧은 몸통
  ctx.beginPath()
  ctx.moveTo(-CHAR_RADIUS * 0.4, TORSO_BOTTOM_Y)
  ctx.lineTo(-CHAR_RADIUS * 0.36, NECK_Y)
  ctx.lineTo(CHAR_RADIUS * 0.36, NECK_Y)
  ctx.lineTo(CHAR_RADIUS * 0.4, TORSO_BOTTOM_Y)
  ctx.closePath()
  ctx.fillStyle = color
  ctx.fill()
  ctx.lineWidth = 2
  ctx.strokeStyle = 'rgba(20, 30, 20, 0.45)'
  ctx.stroke()

  // 머리: 몸 전체 키의 절반을 차지하는 큰 머리 (2등신)
  ctx.beginPath()
  ctx.arc(0, HEAD_CENTER_Y, HEAD_R, 0, Math.PI * 2)
  ctx.fillStyle = '#ffdcb0'
  ctx.fill()
  ctx.lineWidth = 2.5
  ctx.strokeStyle = color
  ctx.stroke()

  // 눈
  ctx.fillStyle = '#241a33'
  const eyeX = c.facing * HEAD_R * 0.45
  ctx.beginPath()
  ctx.arc(eyeX, HEAD_CENTER_Y - HEAD_R * 0.1, HEAD_R * 0.22, 0, Math.PI * 2)
  ctx.fill()

  ctx.restore()
}

function drawBall(ctx, ball) {
  ctx.save()
  ctx.translate(ball.x, ball.y)
  ctx.beginPath()
  ctx.arc(0, 0, BALL_RADIUS, 0, Math.PI * 2)
  ctx.fillStyle = '#f3ecff'
  ctx.fill()
  ctx.lineWidth = 2
  ctx.strokeStyle = '#241a33'
  ctx.stroke()
  ctx.beginPath()
  ctx.moveTo(-BALL_RADIUS * 0.5, -BALL_RADIUS * 0.2)
  ctx.lineTo(BALL_RADIUS * 0.5, -BALL_RADIUS * 0.2)
  ctx.lineTo(0, BALL_RADIUS * 0.55)
  ctx.closePath()
  ctx.fillStyle = '#241a33'
  ctx.fill()
  ctx.restore()
}

// 하늘/잔디 위에서도 항상 잘 보이도록, 밝은 하얀 선 아래에 어두운 그림자 선을 한 번 더 깔아 테두리를 만든다.
function strokeFieldLine(ctx, lineWidth, drawPathFn) {
  ctx.save()
  ctx.lineWidth = lineWidth + 2
  ctx.strokeStyle = 'rgba(20, 40, 20, 0.35)'
  drawPathFn()
  ctx.stroke()
  ctx.lineWidth = lineWidth
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)'
  drawPathFn()
  ctx.stroke()
  ctx.restore()
}

function drawGoal(ctx, side) {
  const x = side === 'left' ? 0 : FIELD_WIDTH - GOAL_POST_WIDTH
  const topY = GROUND_Y - GOAL_HEIGHT

  // 실제로 공을 튕겨내는 벽은 골 높이보다 위쪽(topY보다 작은 y) 구간이므로, 그 부분을
  // 하얀 골포스트처럼 칠하고, 공이 실제로 통과하는 골문 안쪽(topY~GROUND_Y)은 그물만 그립니다.
  ctx.save()
  ctx.fillStyle = '#ffffff'
  ctx.strokeStyle = '#1a2a1a'
  ctx.lineWidth = 2
  ctx.fillRect(x, CEILING_Y, GOAL_POST_WIDTH, topY - CEILING_Y)
  ctx.strokeRect(x, CEILING_Y, GOAL_POST_WIDTH, topY - CEILING_Y)

  ctx.strokeStyle = '#ffffff'
  ctx.lineWidth = 3
  ctx.strokeRect(x + 1.5, topY, GOAL_POST_WIDTH - 3, GOAL_HEIGHT)

  ctx.strokeStyle = 'rgba(255, 255, 255, 0.55)'
  ctx.lineWidth = 1
  const netDepth = 30
  const netX0 = side === 'left' ? GOAL_POST_WIDTH : FIELD_WIDTH - GOAL_POST_WIDTH - netDepth
  for (let i = 0; i <= 4; i++) {
    const gx = netX0 + (i * netDepth) / 4
    ctx.beginPath()
    ctx.moveTo(gx, topY)
    ctx.lineTo(gx, GROUND_Y)
    ctx.stroke()
  }
  for (let i = 0; i <= 4; i++) {
    const gy = topY + (i * GOAL_HEIGHT) / 4
    ctx.beginPath()
    ctx.moveTo(netX0, gy)
    ctx.lineTo(netX0 + netDepth, gy)
    ctx.stroke()
  }
  ctx.restore()
}

function drawFilledText(ctx, text, x, y, fillColor) {
  ctx.lineJoin = 'round'
  ctx.miterLimit = 2
  ctx.lineWidth = 4
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)'
  ctx.strokeText(text, x, y)
  ctx.fillStyle = fillColor
  ctx.fillText(text, x, y)
}

export function render(ctx, match) {
  ctx.clearRect(0, 0, FIELD_WIDTH, FIELD_HEIGHT)

  // 어두운 나이트 경기장 하늘 + 조명탑 불빛으로, 그냥 캄캄한 배경이 아니라
  // "야간 축구장"으로 보이게 한다.
  const skyGrad = ctx.createLinearGradient(0, 0, 0, GROUND_Y)
  skyGrad.addColorStop(0, '#0e0620')
  skyGrad.addColorStop(1, '#2a1450')
  ctx.fillStyle = skyGrad
  ctx.fillRect(0, 0, FIELD_WIDTH, GROUND_Y)

  ;[[40, 22], [FIELD_WIDTH / 2, 16], [FIELD_WIDTH - 40, 22]].forEach(([cx, cy]) => {
    const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, 30)
    glow.addColorStop(0, 'rgba(255, 244, 214, 0.55)')
    glow.addColorStop(1, 'rgba(255, 244, 214, 0)')
    ctx.fillStyle = glow
    ctx.fillRect(cx - 30, cy - 30, 60, 60)
    ctx.fillStyle = '#fff4d6'
    ctx.beginPath()
    ctx.arc(cx, cy, 3, 0, Math.PI * 2)
    ctx.fill()
  })

  // 잔디: 짙은 초록에 스트라이프를 넣어 그냥 어두운 게 아니라 야간 경기장 잔디처럼 보이게 한다.
  ctx.fillStyle = '#1f4a28'
  ctx.fillRect(0, GROUND_Y, FIELD_WIDTH, FIELD_HEIGHT - GROUND_Y)
  ctx.fillStyle = 'rgba(255, 255, 255, 0.06)'
  const stripeWidth = FIELD_WIDTH / 8
  for (let i = 0; i < 8; i += 2) {
    ctx.fillRect(i * stripeWidth, GROUND_Y, stripeWidth, FIELD_HEIGHT - GROUND_Y)
  }

  strokeFieldLine(ctx, 2, () => {
    ctx.beginPath()
    ctx.moveTo(0, GROUND_Y)
    ctx.lineTo(FIELD_WIDTH, GROUND_Y)
  })

  strokeFieldLine(ctx, 2, () => {
    ctx.beginPath()
    ctx.moveTo(FIELD_WIDTH / 2, CEILING_Y)
    ctx.lineTo(FIELD_WIDTH / 2, GROUND_Y)
  })
  strokeFieldLine(ctx, 2, () => {
    ctx.beginPath()
    ctx.arc(FIELD_WIDTH / 2, GROUND_Y, 34, Math.PI, Math.PI * 2)
  })

  drawGoal(ctx, 'left')
  drawGoal(ctx, 'right')

  drawCharacter(ctx, match.p1, '#33e6ff')
  drawCharacter(ctx, match.p2, '#ff2f92')
  drawBall(ctx, match.ball)

  if (match.status === 'goal') {
    ctx.save()
    ctx.font = 'bold 22px "Courier New", monospace'
    ctx.textAlign = 'center'
    drawFilledText(ctx, 'GOAL!', FIELD_WIDTH / 2, FIELD_HEIGHT / 2, '#ffd23d')
    ctx.restore()
  }

  if (match.timeLeftMs <= 0 && match.status === 'playing') {
    ctx.save()
    ctx.font = 'bold 14px "Courier New", monospace'
    ctx.textAlign = 'center'
    drawFilledText(ctx, '연장전! 다음 골이 승부를 가릅니다', FIELD_WIDTH / 2, 34, '#ff2f92')
    ctx.restore()
  }
}
