export const LOGICAL_WIDTH = 320
export const LOGICAL_HEIGHT = 500
export const ANCHOR_Y = 360
export const CHARACTER_RADIUS = 14
export const CHARACTER_HALF_WIDTH = 14

const MOVE_SPEED = 240
const BASE_SCROLL_SPEED = 55
const SPEED_GROWTH_PER_100 = 0.05
const ROW_HEIGHT = 72
const ROW_HEIGHT_JITTER = 14
const PLATFORM_WIDTH = 92
const EDGE_MARGIN = 16
const VANISH_DELAY_MS = 450
const VANISH_FADE_MS = 350
const OBSTACLE_HEIGHT = 26
const OBSTACLE_WIDTH = 30
const OBSTACLE_BASE_INTERVAL_ROWS = 5
const COLLISION_Y_TOLERANCE = 22

function randRange(min, max) {
  return min + Math.random() * (max - min)
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

/**
 * 캐릭터는 화면상 고정된 높이(ANCHOR_Y)에 머물고, 세상이 아래로 스크롤되며
 * 위로 올라가는 것처럼 보입니다. 발판/장애물의 화면 y좌표는 항상 이 함수로 계산합니다.
 */
export function toScreenY(game, worldY) {
  return ANCHOR_Y - (worldY - game.scrollY)
}

function spawnPlatformRow(game) {
  const type = randomPlatformType(game.score)
  const x = randRange(EDGE_MARGIN, LOGICAL_WIDTH - EDGE_MARGIN - PLATFORM_WIDTH)
  game.platforms.push({
    worldY: game.nextPlatformWorldY,
    x,
    width: PLATFORM_WIDTH,
    type,
    resolved: false,
    stepped: false,
    vanishAt: null,
    moveOriginX: x,
  })
  game.nextPlatformWorldY += ROW_HEIGHT + randRange(-ROW_HEIGHT_JITTER, ROW_HEIGHT_JITTER)
}

function spawnObstacle(game) {
  const x = randRange(EDGE_MARGIN, LOGICAL_WIDTH - EDGE_MARGIN - OBSTACLE_WIDTH)
  game.obstacles.push({
    worldY: game.nextObstacleWorldY,
    x,
    width: OBSTACLE_WIDTH,
    height: OBSTACLE_HEIGHT,
    moving: Math.random() < 0.5,
    originX: x,
    phase: Math.random() * Math.PI * 2,
  })
  game.nextObstacleWorldY += ROW_HEIGHT * obstacleIntervalRows(game.score)
}

export function createGame() {
  return {
    scrollY: 0,
    speed: BASE_SCROLL_SPEED,
    characterX: LOGICAL_WIDTH / 2,
    moveDir: 0,
    elapsedMs: 0,
    score: 0,
    status: 'playing',
    platforms: [
      {
        worldY: 0,
        x: LOGICAL_WIDTH / 2 - PLATFORM_WIDTH / 2,
        width: PLATFORM_WIDTH,
        type: 'normal',
        resolved: true,
        stepped: true,
        vanishAt: null,
        moveOriginX: LOGICAL_WIDTH / 2 - PLATFORM_WIDTH / 2,
      },
    ],
    obstacles: [],
    nextPlatformWorldY: ROW_HEIGHT,
    nextObstacleWorldY: ROW_HEIGHT * OBSTACLE_BASE_INTERVAL_ROWS,
  }
}

export function update(game, dt, moveDir) {
  if (game.status !== 'playing') return

  game.elapsedMs += dt * 1000
  game.moveDir = moveDir
  game.speed = currentSpeed(game.score)
  game.scrollY += game.speed * dt
  game.score = Math.floor(game.scrollY)

  game.characterX += moveDir * MOVE_SPEED * dt
  game.characterX = Math.max(CHARACTER_HALF_WIDTH, Math.min(LOGICAL_WIDTH - CHARACTER_HALF_WIDTH, game.characterX))

  while (game.nextPlatformWorldY < game.scrollY + LOGICAL_HEIGHT) {
    spawnPlatformRow(game)
  }
  while (game.nextObstacleWorldY < game.scrollY + LOGICAL_HEIGHT) {
    spawnObstacle(game)
  }

  for (const p of game.platforms) {
    if (p.type === 'moving') {
      const x = p.moveOriginX + Math.sin(game.elapsedMs / 600 + p.worldY) * 40
      p.x = Math.max(EDGE_MARGIN, Math.min(LOGICAL_WIDTH - EDGE_MARGIN - p.width, x))
    }
    if (p.stepped && p.type === 'vanish' && p.vanishAt == null) {
      p.vanishAt = game.elapsedMs + VANISH_DELAY_MS
    }
  }

  for (const o of game.obstacles) {
    if (o.moving) {
      const x = o.originX + Math.sin(game.elapsedMs / 500 + o.phase) * 50
      o.x = Math.max(EDGE_MARGIN, Math.min(LOGICAL_WIDTH - EDGE_MARGIN - o.width, x))
    }
  }

  game.platforms = game.platforms.filter((p) => p.worldY - game.scrollY > -60)
  game.obstacles = game.obstacles.filter((o) => o.worldY - game.scrollY > -60)

  for (const p of game.platforms) {
    if (p.resolved || p.worldY > game.scrollY) continue
    p.resolved = true
    const overlaps =
      game.characterX + CHARACTER_HALF_WIDTH > p.x && game.characterX - CHARACTER_HALF_WIDTH < p.x + p.width
    if (overlaps) {
      p.stepped = true
    } else {
      game.status = 'over'
      return
    }
  }

  for (const o of game.obstacles) {
    const screenY = toScreenY(game, o.worldY)
    if (Math.abs(screenY - ANCHOR_Y) > COLLISION_Y_TOLERANCE) continue
    const overlaps =
      game.characterX + CHARACTER_HALF_WIDTH > o.x && game.characterX - CHARACTER_HALF_WIDTH < o.x + o.width
    if (overlaps) {
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
    ctx.fillRect(p.x, y - 6, p.width, 12)
    ctx.globalAlpha = 1
  }

  ctx.fillStyle = '#ff3b3b'
  for (const o of game.obstacles) {
    const y = toScreenY(game, o.worldY)
    if (y < -30 || y > LOGICAL_HEIGHT + 30) continue
    ctx.beginPath()
    ctx.moveTo(o.x, y + o.height / 2)
    ctx.lineTo(o.x + o.width / 2, y - o.height / 2)
    ctx.lineTo(o.x + o.width, y + o.height / 2)
    ctx.closePath()
    ctx.fill()
  }

  const tilt = game.moveDir * 0.25
  const bob = game.status === 'playing' ? Math.sin(game.elapsedMs / 120) * 2 : 0
  ctx.save()
  ctx.translate(game.characterX, ANCHOR_Y)
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
