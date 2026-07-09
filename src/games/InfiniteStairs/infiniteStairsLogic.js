export const LOGICAL_WIDTH = 320
export const LOGICAL_HEIGHT = 500
export const ANCHOR_Y = 360
export const CHARACTER_RADIUS = 14
export const LANE_COUNT = 5
export const LANE_WIDTH = LOGICAL_WIDTH / LANE_COUNT

const LANE_EASE_SPEED = 14
const BASE_SCROLL_SPEED = 55
const SPEED_GROWTH_PER_100 = 0.05
const ROW_HEIGHT = 72
const ROW_HEIGHT_JITTER = 14
const PLATFORM_LANE_SPAN = 2
const VANISH_DELAY_MS = 450
const VANISH_FADE_MS = 350
const OBSTACLE_LANE_SPAN = 1
const OBSTACLE_DRAW_WIDTH = LANE_WIDTH * 0.55
const OBSTACLE_HEIGHT = 26
const OBSTACLE_BASE_INTERVAL_ROWS = 5
const COLLISION_Y_TOLERANCE = 22

function randRange(min, max) {
  return min + Math.random() * (max - min)
}

function randomLaneStart(span) {
  return Math.floor(randRange(0, LANE_COUNT - span + 1))
}

function randomPlatformType(score) {
  const r = Math.random()
  if (score > 300 && r < 0.18) return 'vanish'
  if (score > 150 && r < 0.34) return 'moving'
  return 'normal'
}

function currentSpeed(score) {
  return BASE_SCROLL_SPEED * (1 + SPEED_GROWTH_PER_100 * Math.floor(score / 100))
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

function spawnPlatformRow(game) {
  const type = randomPlatformType(game.score)
  const startLane = randomLaneStart(PLATFORM_LANE_SPAN)
  game.platforms.push({
    worldY: game.nextPlatformWorldY,
    startLane,
    baseLane: startLane,
    laneSpan: PLATFORM_LANE_SPAN,
    type,
    resolved: false,
    stepped: false,
    vanishAt: null,
  })
  game.nextPlatformWorldY += ROW_HEIGHT + randRange(-ROW_HEIGHT_JITTER, ROW_HEIGHT_JITTER)
}

function spawnObstacle(game) {
  const startLane = randomLaneStart(OBSTACLE_LANE_SPAN)
  game.obstacles.push({
    worldY: game.nextObstacleWorldY,
    startLane,
    baseLane: startLane,
    laneSpan: OBSTACLE_LANE_SPAN,
    moving: Math.random() < 0.5,
    phase: Math.random() * Math.PI * 2,
  })
  game.nextObstacleWorldY += ROW_HEIGHT * obstacleIntervalRows(game.score)
}

export function createGame() {
  const startLane = Math.max(0, Math.min(LANE_COUNT - PLATFORM_LANE_SPAN, Math.floor(LANE_COUNT / 2)))
  const lane = Math.floor(LANE_COUNT / 2)
  return {
    scrollY: 0,
    speed: BASE_SCROLL_SPEED,
    lane,
    displayX: laneCenterX(lane),
    elapsedMs: 0,
    score: 0,
    status: 'playing',
    platforms: [
      {
        worldY: 0,
        startLane,
        baseLane: startLane,
        laneSpan: PLATFORM_LANE_SPAN,
        type: 'normal',
        resolved: true,
        stepped: true,
        vanishAt: null,
      },
    ],
    obstacles: [],
    nextPlatformWorldY: ROW_HEIGHT,
    nextObstacleWorldY: ROW_HEIGHT * OBSTACLE_BASE_INTERVAL_ROWS,
  }
}

/** 좌/우 입력 한 번에 정확히 한 칸(레인)만 이동합니다 - 누르고 있어도 미끄러지지 않음. */
export function moveLane(game, delta) {
  if (!game || game.status !== 'playing') return
  game.lane = Math.max(0, Math.min(LANE_COUNT - 1, game.lane + delta))
}

export function update(game, dt) {
  if (game.status !== 'playing') return

  game.elapsedMs += dt * 1000
  game.speed = currentSpeed(game.score)
  game.scrollY += game.speed * dt
  game.score = Math.floor(game.scrollY)

  const targetX = laneCenterX(game.lane)
  game.displayX += (targetX - game.displayX) * Math.min(1, LANE_EASE_SPEED * dt)

  while (game.nextPlatformWorldY < game.scrollY + LOGICAL_HEIGHT) {
    spawnPlatformRow(game)
  }
  while (game.nextObstacleWorldY < game.scrollY + LOGICAL_HEIGHT) {
    spawnObstacle(game)
  }

  for (const p of game.platforms) {
    if (p.type === 'moving') {
      const shift = Math.sin(game.elapsedMs / 700 + p.worldY) > 0 ? 1 : 0
      p.startLane = Math.max(0, Math.min(LANE_COUNT - p.laneSpan, p.baseLane + shift))
    }
    if (p.stepped && p.type === 'vanish' && p.vanishAt == null) {
      p.vanishAt = game.elapsedMs + VANISH_DELAY_MS
    }
  }

  for (const o of game.obstacles) {
    if (o.moving) {
      const shift = Math.sin(game.elapsedMs / 600 + o.phase) > 0 ? 1 : 0
      o.startLane = Math.max(0, Math.min(LANE_COUNT - o.laneSpan, o.baseLane + shift))
    }
  }

  game.platforms = game.platforms.filter((p) => p.worldY - game.scrollY > -60)
  game.obstacles = game.obstacles.filter((o) => o.worldY - game.scrollY > -60)

  for (const p of game.platforms) {
    if (p.resolved || p.worldY > game.scrollY) continue
    p.resolved = true
    const safe = game.lane >= p.startLane && game.lane < p.startLane + p.laneSpan
    if (safe) {
      p.stepped = true
    } else {
      game.status = 'over'
      return
    }
  }

  for (const o of game.obstacles) {
    const screenY = toScreenY(game, o.worldY)
    if (Math.abs(screenY - ANCHOR_Y) > COLLISION_Y_TOLERANCE) continue
    const hit = game.lane >= o.startLane && game.lane < o.startLane + o.laneSpan
    if (hit) {
      game.status = 'over'
      return
    }
  }
}

export function render(ctx, game) {
  const hue = (200 + game.score * 0.15) % 360
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
    const y = toScreenY(game, p.worldY)
    if (y < -20 || y > LOGICAL_HEIGHT + 20) continue
    let alpha = 1
    if (p.type === 'vanish' && p.vanishAt != null) {
      alpha = Math.max(0, 1 - (game.elapsedMs - p.vanishAt) / VANISH_FADE_MS)
    }
    if (alpha <= 0) continue
    ctx.globalAlpha = alpha
    ctx.fillStyle = p.type === 'moving' ? '#33e6ff' : p.type === 'vanish' ? '#ff2f92' : '#a496c9'
    ctx.fillRect(p.startLane * LANE_WIDTH + 4, y - 6, p.laneSpan * LANE_WIDTH - 8, 12)
    ctx.globalAlpha = 1
  }

  ctx.fillStyle = '#ff3b3b'
  for (const o of game.obstacles) {
    const y = toScreenY(game, o.worldY)
    if (y < -30 || y > LOGICAL_HEIGHT + 30) continue
    const cx = o.startLane * LANE_WIDTH + (o.laneSpan * LANE_WIDTH) / 2
    ctx.beginPath()
    ctx.moveTo(cx - OBSTACLE_DRAW_WIDTH / 2, y + OBSTACLE_HEIGHT / 2)
    ctx.lineTo(cx, y - OBSTACLE_HEIGHT / 2)
    ctx.lineTo(cx + OBSTACLE_DRAW_WIDTH / 2, y + OBSTACLE_HEIGHT / 2)
    ctx.closePath()
    ctx.fill()
  }

  const targetX = laneCenterX(game.lane)
  const tilt = Math.max(-1, Math.min(1, (targetX - game.displayX) / LANE_WIDTH)) * 0.5
  const bob = game.status === 'playing' ? Math.sin(game.elapsedMs / 120) * 2 : 0
  ctx.save()
  ctx.translate(game.displayX, ANCHOR_Y)
  ctx.rotate(tilt)
  ctx.fillStyle = '#ffcf3d'
  ctx.beginPath()
  ctx.arc(0, bob, CHARACTER_RADIUS, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()

  ctx.fillStyle = '#f3ecff'
  ctx.font = 'bold 26px "Press Start 2P", monospace'
  ctx.textAlign = 'center'
  ctx.fillText(String(game.score), LOGICAL_WIDTH / 2, 46)
}
