export const LOGICAL_WIDTH = 320
export const LOGICAL_HEIGHT = 500
export const ANCHOR_Y = 360
export const CHARACTER_RADIUS = 14
export const LANE_COUNT = 5
export const LANE_WIDTH = LOGICAL_WIDTH / LANE_COUNT
export const ROW_HEIGHT = 72

const BEAT_MS_START = 650
const BEAT_MS_MIN = 280
const BEAT_DECAY_PER_ROW = 3.5
const VISIBLE_ROWS_AHEAD = Math.ceil(LOGICAL_HEIGHT / ROW_HEIGHT) + 2
const VANISH_DELAY_MS = 450
const VANISH_FADE_MS = 350
const OBSTACLE_DRAW_WIDTH = LANE_WIDTH * 0.55
const OBSTACLE_HEIGHT = 26
const OBSTACLE_BASE_INTERVAL_ROWS = 5
const COLLISION_Y_TOLERANCE = 22
const INVINCIBLE_ROWS = 1

function clampLane(lane) {
  return Math.max(0, Math.min(LANE_COUNT - 1, lane))
}

function randomPlatformType(score) {
  const r = Math.random()
  if (score > 300 && r < 0.18) return 'vanish'
  if (score > 150 && r < 0.34) return 'moving'
  return 'normal'
}

function beatMsForScore(score) {
  return Math.max(BEAT_MS_MIN, BEAT_MS_START - score * BEAT_DECAY_PER_ROW)
}

function obstacleIntervalRows(score) {
  return Math.max(2, OBSTACLE_BASE_INTERVAL_ROWS - Math.floor(score / 200))
}

export function laneCenterX(lane) {
  return lane * LANE_WIDTH + LANE_WIDTH / 2
}

/**
 * 캐릭터는 화면상 고정된 높이(ANCHOR_Y)에 머물고, 세상이 아래로 스크롤되며
 * 위로 올라가는 것처럼 보입니다. 발판/장애물의 화면 y좌표는 항상 이 함수로 계산합니다.
 */
export function toScreenY(game, worldY) {
  return ANCHOR_Y - (worldY - game.scrollY)
}

/**
 * 다음 발판의 레인은 바로 이전 발판 레인에서 -1/0/+1칸까지만 벗어나도록 생성합니다
 * (바로 위아래 블럭은 좌우로 1칸까지만 차이나게).
 */
function generateRowsAhead(game) {
  const maxRow = game.rowIndex + VISIBLE_ROWS_AHEAD

  while (game.nextRowToGenerate <= maxRow) {
    const delta = Math.floor(Math.random() * 3) - 1
    const lane = clampLane(game.lastGeneratedLane + delta)
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

  while (game.nextObstacleRow <= maxRow) {
    const lane = Math.floor(Math.random() * LANE_COUNT)
    game.obstacles.push({
      rowIndex: game.nextObstacleRow,
      lane,
      baseLane: lane,
      moving: Math.random() < 0.5,
      phase: Math.random() * Math.PI * 2,
    })
    game.nextObstacleRow += obstacleIntervalRows(game.score)
  }
}

export function createGame() {
  const lane = Math.floor(LANE_COUNT / 2)
  const game = {
    rowIndex: 0,
    targetScrollY: 0,
    scrollY: 0,
    beatMs: BEAT_MS_START,
    beatTimer: 0,
    lane,
    displayX: laneCenterX(lane),
    elapsedMs: 0,
    score: 0,
    status: 'playing',
    platforms: [{ rowIndex: 0, lane, baseLane: lane, type: 'normal', stepped: true, vanishAt: null }],
    obstacles: [],
    nextRowToGenerate: 1,
    nextObstacleRow: OBSTACLE_BASE_INTERVAL_ROWS,
    lastGeneratedLane: lane,
  }
  generateRowsAhead(game)
  return game
}

/** 좌/우 입력 한 번에 정확히 한 칸(레인)만 이동합니다 - 누르고 있어도 미끄러지지 않음. */
export function moveLane(game, delta) {
  if (!game || game.status !== 'playing') return
  game.lane = clampLane(game.lane + delta)
}

function advanceRow(game) {
  game.rowIndex += 1
  game.targetScrollY = game.rowIndex * ROW_HEIGHT
  game.score = game.rowIndex
  game.beatMs = beatMsForScore(game.score)

  generateRowsAhead(game)

  const row = game.platforms.find((p) => p.rowIndex === game.rowIndex)
  if (!row) return
  if (game.lane === row.lane) {
    row.stepped = true
  } else if (game.rowIndex <= INVINCIBLE_ROWS) {
    // 시작하고 얼마 안 됐을 때는 봐줍니다 - 안전한 레인으로 슬쩍 옮겨서 계속하게 함
    game.lane = row.lane
    row.stepped = true
  } else {
    game.status = 'over'
  }
}

export function update(game, dt) {
  if (game.status !== 'playing') return

  game.elapsedMs += dt * 1000
  game.scrollY = game.targetScrollY
  game.displayX = laneCenterX(game.lane)

  for (const p of game.platforms) {
    if (p.type === 'moving') {
      const shift = Math.sin(game.elapsedMs / 700 + p.rowIndex) > 0 ? 1 : 0
      p.lane = clampLane(p.baseLane + shift)
    }
    if (p.stepped && p.type === 'vanish' && p.vanishAt == null) {
      p.vanishAt = game.elapsedMs + VANISH_DELAY_MS
    }
  }

  for (const o of game.obstacles) {
    if (o.moving) {
      const shift = Math.sin(game.elapsedMs / 600 + o.phase) > 0 ? 1 : 0
      o.lane = clampLane(o.baseLane + shift)
    }
  }

  game.beatTimer += dt * 1000
  if (game.beatTimer >= game.beatMs) {
    game.beatTimer -= game.beatMs
    advanceRow(game)
    if (game.status !== 'playing') return
  }

  game.platforms = game.platforms.filter((p) => p.rowIndex >= game.rowIndex - 1)
  game.obstacles = game.obstacles.filter((o) => o.rowIndex >= game.rowIndex - 1)

  if (game.rowIndex <= INVINCIBLE_ROWS) return

  for (const o of game.obstacles) {
    const screenY = toScreenY(game, o.rowIndex * ROW_HEIGHT)
    if (Math.abs(screenY - ANCHOR_Y) > COLLISION_Y_TOLERANCE) continue
    if (game.lane === o.lane) {
      game.status = 'over'
      return
    }
  }
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

  for (const p of game.platforms) {
    const y = toScreenY(game, p.rowIndex * ROW_HEIGHT)
    if (y < -20 || y > LOGICAL_HEIGHT + 20) continue
    let alpha = 1
    if (p.type === 'vanish' && p.vanishAt != null) {
      alpha = Math.max(0, 1 - (game.elapsedMs - p.vanishAt) / VANISH_FADE_MS)
    }
    if (alpha <= 0) continue
    ctx.globalAlpha = alpha
    ctx.fillStyle = p.type === 'moving' ? '#33e6ff' : p.type === 'vanish' ? '#ff2f92' : '#a496c9'
    ctx.fillRect(p.lane * LANE_WIDTH + 4, y - 6, LANE_WIDTH - 8, 12)
    ctx.globalAlpha = 1
  }

  ctx.fillStyle = '#ff3b3b'
  for (const o of game.obstacles) {
    const y = toScreenY(game, o.rowIndex * ROW_HEIGHT)
    if (y < -30 || y > LOGICAL_HEIGHT + 30) continue
    const cx = laneCenterX(o.lane)
    ctx.beginPath()
    ctx.moveTo(cx - OBSTACLE_DRAW_WIDTH / 2, y + OBSTACLE_HEIGHT / 2)
    ctx.lineTo(cx, y - OBSTACLE_HEIGHT / 2)
    ctx.lineTo(cx + OBSTACLE_DRAW_WIDTH / 2, y + OBSTACLE_HEIGHT / 2)
    ctx.closePath()
    ctx.fill()
  }

  const bob = game.status === 'playing' ? Math.sin(game.elapsedMs / 120) * 2 : 0
  ctx.fillStyle = '#ffcf3d'
  ctx.beginPath()
  ctx.arc(game.displayX, ANCHOR_Y + bob, CHARACTER_RADIUS, 0, Math.PI * 2)
  ctx.fill()

  ctx.fillStyle = '#f3ecff'
  ctx.font = 'bold 26px "Press Start 2P", monospace'
  ctx.textAlign = 'center'
  ctx.fillText(String(game.score), LOGICAL_WIDTH / 2, 46)
}
