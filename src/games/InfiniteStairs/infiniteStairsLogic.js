export const LOGICAL_WIDTH = 320
export const LOGICAL_HEIGHT = 500
export const ANCHOR_Y = 360
export const CHARACTER_RADIUS = 14
export const LANE_COUNT = 5
export const LANE_WIDTH = LOGICAL_WIDTH / LANE_COUNT
export const ROW_HEIGHT = 72

const VISIBLE_ROWS_AHEAD = Math.ceil(LOGICAL_HEIGHT / ROW_HEIGHT) + 2
const VANISH_DELAY_MS = 450
const VANISH_FADE_MS = 350
const INVINCIBLE_ROWS = 1
const INITIAL_BUFFER_ROWS = 4
const BASE_RISE_SPEED = 40
const RISE_GROWTH_PER_SCORE = 0.012
const SPIKE_HEIGHT = 26
const SPIKE_COUNT = 10

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

export function laneCenterX(lane) {
  return lane * LANE_WIDTH + LANE_WIDTH / 2
}

/**
 * 캐릭터는 화면상 고정된 높이(ANCHOR_Y)에 머물고, 세상이 아래로 스크롤되며
 * 위로 올라가는 것처럼 보입니다. 발판/가시의 화면 y좌표는 항상 이 함수로 계산합니다.
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
    const delta = Math.random() < 0.5 ? -1 : 1
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
}

export function createGame() {
  const lane = Math.floor(LANE_COUNT / 2)
  const game = {
    rowIndex: 0,
    targetScrollY: 0,
    scrollY: 0,
    lane,
    displayX: laneCenterX(lane),
    elapsedMs: 0,
    score: 0,
    status: 'playing',
    spikeFloorY: -ROW_HEIGHT * INITIAL_BUFFER_ROWS,
    platforms: [{ rowIndex: 0, lane, baseLane: lane, type: 'normal', stepped: true, vanishAt: null }],
    nextRowToGenerate: 1,
    lastGeneratedLane: lane,
  }
  generateRowsAhead(game)
  return game
}

/**
 * 좌/우 입력이 곧 "한 걸음"입니다 - 누를 때마다 그 방향으로 한 칸 이동하면서
 * 동시에 발판도 한 칸 내려옵니다(=한 줄 올라감). 타이머로 저절로 내려오지 않습니다.
 */
export function moveLane(game, delta) {
  if (!game || game.status !== 'playing') return

  game.lane = clampLane(game.lane + delta)
  game.displayX = laneCenterX(game.lane)
  game.rowIndex += 1
  game.targetScrollY = game.rowIndex * ROW_HEIGHT
  game.scrollY = game.targetScrollY
  game.score = game.rowIndex

  generateRowsAhead(game)

  const row = game.platforms.find((p) => p.rowIndex === game.rowIndex)
  if (!row) return

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

/** 매 프레임 실행되는 시간 기반 갱신: 발판 애니메이션과 아래에서 올라오는 가시. */
export function update(game, dt) {
  if (game.status !== 'playing') return

  game.elapsedMs += dt * 1000
  game.spikeFloorY += riseSpeedForScore(game.score) * dt

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

  if (game.spikeFloorY >= game.targetScrollY) {
    game.status = 'over'
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

  const spikeY = toScreenY(game, game.spikeFloorY)
  if (spikeY < LOGICAL_HEIGHT + SPIKE_HEIGHT) {
    const spikeW = LOGICAL_WIDTH / SPIKE_COUNT
    ctx.fillStyle = '#ff3b3b'
    ctx.beginPath()
    ctx.moveTo(0, LOGICAL_HEIGHT + SPIKE_HEIGHT)
    for (let i = 0; i < SPIKE_COUNT; i++) {
      const x0 = i * spikeW
      ctx.lineTo(x0, spikeY)
      ctx.lineTo(x0 + spikeW / 2, spikeY - SPIKE_HEIGHT)
      ctx.lineTo(x0 + spikeW, spikeY)
    }
    ctx.lineTo(LOGICAL_WIDTH, LOGICAL_HEIGHT + SPIKE_HEIGHT)
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
