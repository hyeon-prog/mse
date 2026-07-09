export const LOGICAL_WIDTH = 320
export const LOGICAL_HEIGHT = 500
export const ANCHOR_Y = 360
export const LANE_COUNT = 5
export const LANE_WIDTH = LOGICAL_WIDTH / LANE_COUNT
export const ROW_HEIGHT = 72

const VISIBLE_ROWS_AHEAD = Math.ceil(LOGICAL_HEIGHT / ROW_HEIGHT) + 2
const VANISH_DELAY_MS = 450
const VANISH_FADE_MS = 350
const INVINCIBLE_ROWS = 1
const INITIAL_BUFFER_ROWS = 2
const BASE_RISE_SPEED = 130
const RISE_GROWTH_PER_SCORE = 0.02

// 계단 블록(발판) 입체 표현
const STEP_DEPTH = 40
const STEP_TOP_H = 10

// 물 표면 애니메이션
const WAVE_LEN = 46
const WAVE_AMP = 5
const WAVE_SPEED = 300

// 걸음 애니메이션 (좌우 이동 트윈 + 계단 오르는 홉 + 팔다리 스윙)
const STEP_ANIM_MS = 150
const HOP_HEIGHT = 15

// 검은 실루엣 사람 치수
const HEAD_R = 8
const TORSO_H = 20
const TORSO_TOP_W = 15
const TORSO_BOTTOM_W = 20
const LEG_LEN = 15
const ARM_LEN = 12
const LIMB_W = 5

function clampLane(lane) {
  return Math.max(0, Math.min(LANE_COUNT - 1, lane))
}

function randomPlatformType(score) {
  const r = Math.random()
  if (score > 300 && r < 0.18) return 'vanish'
  if (score > 150 && r < 0.34) return 'moving'
  return 'normal'
}

function riseSpeedForScore(score) {
  return BASE_RISE_SPEED * (1 + RISE_GROWTH_PER_SCORE * score)
}

function easeOutCubic(t) {
  return 1 - (1 - t) ** 3
}

export function laneCenterX(lane) {
  return lane * LANE_WIDTH + LANE_WIDTH / 2
}

/**
 * 캐릭터는 화면상 고정된 높이(ANCHOR_Y)에 머물고, 세상이 아래로 스크롤되며
 * 위로 올라가는 것처럼 보입니다. 발판/물의 화면 y좌표는 항상 이 함수로 계산합니다.
 */
export function toScreenY(game, worldY) {
  return ANCHOR_Y - (worldY - game.scrollY)
}

/**
 * 다음 발판의 레인은 바로 이전 발판 레인에서 반드시 -1 또는 +1칸 이동합니다
 * (제자리 유지 없음 - 매번 좌/우 중 하나를 선택해야 함).
 */
function generateRowsAhead(game) {
  const maxRow = game.rowIndex + VISIBLE_ROWS_AHEAD

  while (game.nextRowToGenerate <= maxRow) {
    // 경계에서는 clampLane으로 값을 눌러 담지 않습니다 - 그러면 -1이나 +1을 뽑아도
    // 결과 레인이 이전과 같아져 "절대 같은 자리 반복 없음" 규칙이 깨집니다.
    // 대신 경계에서는 벗어나는 방향을 강제로 선택합니다.
    let delta
    if (game.lastGeneratedLane <= 0) {
      delta = 1
    } else if (game.lastGeneratedLane >= LANE_COUNT - 1) {
      delta = -1
    } else {
      delta = Math.random() < 0.5 ? -1 : 1
    }
    const lane = game.lastGeneratedLane + delta
    game.platforms.push({
      rowIndex: game.nextRowToGenerate,
      lane,
      baseLane: lane,
      type: randomPlatformType(game.score),
      stepped: false,
      vanishAt: null,
    })
    game.lastGeneratedLane = lane
    game.nextRowToGenerate += 1
  }
}

export function createGame() {
  const lane = Math.floor(LANE_COUNT / 2)
  const x = laneCenterX(lane)
  const game = {
    rowIndex: 0,
    targetScrollY: 0,
    scrollY: 0,
    lane,
    displayX: x,
    elapsedMs: 0,
    score: 0,
    status: 'playing',
    waterY: -ROW_HEIGHT * INITIAL_BUFFER_ROWS,
    platforms: [{ rowIndex: 0, lane, baseLane: lane, type: 'normal', stepped: true, vanishAt: null }],
    nextRowToGenerate: 1,
    lastGeneratedLane: lane,
    // 걸음 애니메이션 상태 - renderX가 실제로 그려지는 위치, stepPhase(0~1)가
    // 진행도(1이면 정지/유휴 상태)로 홉 높이와 팔다리 스윙 각도를 함께 결정합니다.
    renderX: x,
    stepFromX: x,
    stepToX: x,
    stepPhase: 1,
    facing: 1,
  }
  generateRowsAhead(game)
  return game
}

/**
 * 좌/우 입력이 곧 "한 걸음"입니다 - 누를 때마다 그 방향으로 한 칸 이동하면서
 * 동시에 발판도 한 칸 내려옵니다(=한 줄 올라감). 타이머로 저절로 내려오지 않습니다.
 * 판정(레인 일치 여부)은 즉시 확정되고, 화면상 좌우 이동/계단 오르는 모션만
 * update()에서 STEP_ANIM_MS에 걸쳐 부드럽게 재생됩니다.
 */
export function moveLane(game, delta) {
  if (!game || game.status !== 'playing') return

  const fromX = game.renderX
  game.lane = clampLane(game.lane + delta)
  game.displayX = laneCenterX(game.lane)
  game.rowIndex += 1
  game.targetScrollY = game.rowIndex * ROW_HEIGHT
  game.scrollY = game.targetScrollY
  game.score = game.rowIndex

  generateRowsAhead(game)

  const row = game.platforms.find((p) => p.rowIndex === game.rowIndex)
  if (row) {
    if (game.lane === row.lane) {
      row.stepped = true
    } else if (game.rowIndex <= INVINCIBLE_ROWS) {
      // 시작하고 얼마 안 됐을 때는 봐줍니다 - 안전한 레인으로 슬쩍 옮겨서 계속하게 함
      game.lane = row.lane
      game.displayX = laneCenterX(game.lane)
      row.stepped = true
    } else {
      game.status = 'over'
    }
  }

  if (game.status === 'playing' && delta !== 0) {
    game.facing = delta > 0 ? 1 : -1
    game.stepFromX = fromX
    game.stepToX = game.displayX
    game.stepPhase = 0
  }
}

/** 매 프레임 실행되는 시간 기반 갱신: 발판 애니메이션, 걸음 모션, 아래에서 올라오는 물. */
export function update(game, dt) {
  if (game.status !== 'playing') return

  game.elapsedMs += dt * 1000
  game.waterY += riseSpeedForScore(game.score) * dt

  if (game.stepPhase < 1) {
    game.stepPhase = Math.min(1, game.stepPhase + (dt * 1000) / STEP_ANIM_MS)
    game.renderX = game.stepFromX + (game.stepToX - game.stepFromX) * easeOutCubic(game.stepPhase)
  } else {
    game.renderX = game.stepToX
  }

  for (const p of game.platforms) {
    if (p.type === 'moving') {
      const shift = Math.sin(game.elapsedMs / 700 + p.rowIndex) > 0 ? 1 : 0
      p.lane = clampLane(p.baseLane + shift)
    }
    if (p.stepped && p.type === 'vanish' && p.vanishAt == null) {
      p.vanishAt = game.elapsedMs + VANISH_DELAY_MS
    }
  }

  game.platforms = game.platforms.filter((p) => p.rowIndex >= game.rowIndex - 1)

  if (game.waterY >= game.targetScrollY) {
    game.status = 'over'
  }
}

const STEP_COLORS = {
  normal: { top: '#cfc3ec', body: '#5b4f7a' },
  moving: { top: '#bdfbff', body: '#146875' },
  vanish: { top: '#ffd0ea', body: '#7a1f52' },
}

function drawWave(ctx, waterTopY, elapsedMs, draw) {
  draw(0, waterTopY + Math.sin(elapsedMs / WAVE_SPEED) * WAVE_AMP)
  for (let x = 0; x <= LOGICAL_WIDTH; x += 8) {
    const y = waterTopY + Math.sin(x / WAVE_LEN + elapsedMs / WAVE_SPEED) * WAVE_AMP
    draw(x, y)
  }
}

function drawWater(ctx, game) {
  const waterTopY = toScreenY(game, game.waterY)
  if (waterTopY > LOGICAL_HEIGHT + WAVE_AMP) return

  const grad = ctx.createLinearGradient(0, waterTopY, 0, LOGICAL_HEIGHT)
  grad.addColorStop(0, 'rgba(64, 176, 230, 0.85)')
  grad.addColorStop(1, 'rgba(8, 52, 82, 0.96)')
  ctx.fillStyle = grad
  ctx.beginPath()
  ctx.moveTo(0, LOGICAL_HEIGHT)
  ctx.lineTo(0, waterTopY)
  drawWave(ctx, waterTopY, game.elapsedMs, (x, y) => ctx.lineTo(x, y))
  ctx.lineTo(LOGICAL_WIDTH, LOGICAL_HEIGHT)
  ctx.closePath()
  ctx.fill()

  ctx.strokeStyle = 'rgba(220, 250, 255, 0.55)'
  ctx.lineWidth = 2
  ctx.beginPath()
  let first = true
  drawWave(ctx, waterTopY, game.elapsedMs, (x, y) => {
    if (first) {
      ctx.moveTo(x, y)
      first = false
    } else {
      ctx.lineTo(x, y)
    }
  })
  ctx.stroke()
}

function drawSteps(ctx, game) {
  for (const p of game.platforms) {
    const y = toScreenY(game, p.rowIndex * ROW_HEIGHT)
    if (y < -STEP_DEPTH || y > LOGICAL_HEIGHT + 20) continue
    let alpha = 1
    if (p.type === 'vanish' && p.vanishAt != null) {
      alpha = Math.max(0, 1 - (game.elapsedMs - p.vanishAt) / VANISH_FADE_MS)
    }
    if (alpha <= 0) continue
    const colors = STEP_COLORS[p.type] ?? STEP_COLORS.normal
    const x = p.lane * LANE_WIDTH + 4
    const w = LANE_WIDTH - 8

    ctx.globalAlpha = alpha
    ctx.fillStyle = colors.body
    ctx.fillRect(x, y, w, STEP_DEPTH)
    ctx.fillStyle = colors.top
    ctx.fillRect(x, y - STEP_TOP_H, w, STEP_TOP_H)
    ctx.globalAlpha = 1
  }
}

function drawLimb(ctx, x, y, angle, length, width) {
  ctx.save()
  ctx.translate(x, y)
  ctx.rotate(angle)
  ctx.beginPath()
  ctx.moveTo(-width / 2, 0)
  ctx.lineTo(width / 2, 0)
  ctx.lineTo(width / 2 - 1, length)
  ctx.lineTo(-width / 2 + 1, length)
  ctx.closePath()
  ctx.fill()
  ctx.stroke()
  ctx.restore()
}

/** 코난의 '검은 조직' 실루엣처럼 - 얼굴 없이 검은 형체만, 얇은 테두리로 배경과 구분. */
function drawCharacter(ctx, game) {
  const stepPhase = game.stepPhase
  const swing = Math.sin(Math.min(1, stepPhase) * Math.PI) // 0 -> 1 -> 0, 한 걸음 동안만
  const hop = stepPhase < 1 ? swing * HOP_HEIGHT : 0
  const idleBob = stepPhase >= 1 ? Math.sin(game.elapsedMs / 220) * 1.5 : 0
  const lean = game.facing * swing * 0.16
  const legAngle = swing * 0.7 * game.facing
  const armAngle = swing * 0.7 * -game.facing

  ctx.save()
  ctx.translate(game.renderX, ANCHOR_Y - hop - idleBob)
  ctx.rotate(lean)

  ctx.fillStyle = '#050508'
  ctx.strokeStyle = 'rgba(170, 225, 255, 0.4)'
  ctx.lineWidth = 1.5

  drawLimb(ctx, 4, 0, -legAngle, LEG_LEN, LIMB_W)
  drawLimb(ctx, -4, 0, legAngle, LEG_LEN, LIMB_W)

  ctx.beginPath()
  ctx.moveTo(-TORSO_TOP_W / 2, -TORSO_H)
  ctx.lineTo(TORSO_TOP_W / 2, -TORSO_H)
  ctx.lineTo(TORSO_BOTTOM_W / 2, 0)
  ctx.lineTo(-TORSO_BOTTOM_W / 2, 0)
  ctx.closePath()
  ctx.fill()
  ctx.stroke()

  drawLimb(ctx, TORSO_TOP_W / 2 - 1, -TORSO_H + 5, armAngle, ARM_LEN, LIMB_W)
  drawLimb(ctx, -TORSO_TOP_W / 2 + 1, -TORSO_H + 5, -armAngle, ARM_LEN, LIMB_W)

  ctx.beginPath()
  ctx.arc(0, -TORSO_H - HEAD_R, HEAD_R, 0, Math.PI * 2)
  ctx.fill()
  ctx.stroke()

  ctx.restore()
}

export function render(ctx, game) {
  const hue = (200 + game.score * 0.6) % 360
  const grad = ctx.createLinearGradient(0, 0, 0, LOGICAL_HEIGHT)
  grad.addColorStop(0, `hsl(${hue}, 45%, 14%)`)
  grad.addColorStop(1, `hsl(${(hue + 40) % 360}, 40%, 8%)`)
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, LOGICAL_WIDTH, LOGICAL_HEIGHT)

  ctx.strokeStyle = 'rgba(255, 255, 255, 0.06)'
  ctx.lineWidth = 1
  for (let i = 1; i < LANE_COUNT; i++) {
    const x = i * LANE_WIDTH
    ctx.beginPath()
    ctx.moveTo(x, 0)
    ctx.lineTo(x, LOGICAL_HEIGHT)
    ctx.stroke()
  }

  drawSteps(ctx, game)
  drawWater(ctx, game)
  drawCharacter(ctx, game)

  ctx.fillStyle = '#f3ecff'
  ctx.font = 'bold 26px "Press Start 2P", monospace'
  ctx.textAlign = 'center'
  ctx.fillText(String(game.score), LOGICAL_WIDTH / 2, 46)
}
