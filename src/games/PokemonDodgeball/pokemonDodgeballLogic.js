export const ARENA_WIDTH = 480
export const ARENA_HEIGHT = 360
export const TICK_MS = 30

const PLAYER_RADIUS = 16
const OPPONENT_RADIUS = 16
const BALL_RADIUS = 6
const PLAYER_SPEED = 4
const OPPONENT_SPEED = 1.8
const BALL_SPEED = 6
const OPPONENT_COUNT = 4
const PLAYER_LIVES = 3
const PLAYER_THROW_COOLDOWN = 18
const AI_THROW_MIN_TICKS = 60
const AI_THROW_MAX_TICKS = 140
const OPPONENT_TURN_MIN_TICKS = 40
const OPPONENT_TURN_MAX_TICKS = 100

const OPPONENT_SPAWNS = [
  { x: 60, y: 60 },
  { x: ARENA_WIDTH - 60, y: 60 },
  { x: 60, y: ARENA_HEIGHT - 60 },
  { x: ARENA_WIDTH - 60, y: ARENA_HEIGHT - 60 },
]

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v))
}

function randInt(min, max) {
  return Math.floor(min + Math.random() * (max - min + 1))
}

function createOpponent(index) {
  const spot = OPPONENT_SPAWNS[index % OPPONENT_SPAWNS.length]
  const angle = Math.random() * Math.PI * 2
  return {
    id: index,
    x: spot.x,
    y: spot.y,
    dx: Math.cos(angle),
    dy: Math.sin(angle),
    alive: true,
    nextTurnAt: randInt(OPPONENT_TURN_MIN_TICKS, OPPONENT_TURN_MAX_TICKS),
    nextThrowAt: randInt(AI_THROW_MIN_TICKS, AI_THROW_MAX_TICKS),
  }
}

export function createInitialState() {
  return {
    player: { x: ARENA_WIDTH / 2, y: ARENA_HEIGHT / 2, dx: 0, dy: -1, lives: PLAYER_LIVES, throwCooldown: 0 },
    opponents: Array.from({ length: OPPONENT_COUNT }, (_, i) => createOpponent(i)),
    balls: [],
    score: 0,
    tickCount: 0,
    status: 'playing',
  }
}

export function tick(state, input) {
  if (state.status !== 'playing') return state

  const player = { ...state.player }
  if (input.dx !== 0 || input.dy !== 0) {
    const len = Math.hypot(input.dx, input.dy) || 1
    const nx = input.dx / len
    const ny = input.dy / len
    player.x = clamp(player.x + nx * PLAYER_SPEED, PLAYER_RADIUS, ARENA_WIDTH - PLAYER_RADIUS)
    player.y = clamp(player.y + ny * PLAYER_SPEED, PLAYER_RADIUS, ARENA_HEIGHT - PLAYER_RADIUS)
    player.dx = nx
    player.dy = ny
  }
  if (player.throwCooldown > 0) player.throwCooldown -= 1

  let balls = state.balls.map((b) => ({ ...b, x: b.x + b.vx, y: b.y + b.vy }))
  balls = balls.filter((b) => b.x > -20 && b.x < ARENA_WIDTH + 20 && b.y > -20 && b.y < ARENA_HEIGHT + 20)

  if (input.throwRequested && player.throwCooldown <= 0) {
    balls.push({
      x: player.x + player.dx * (PLAYER_RADIUS + BALL_RADIUS),
      y: player.y + player.dy * (PLAYER_RADIUS + BALL_RADIUS),
      vx: player.dx * BALL_SPEED,
      vy: player.dy * BALL_SPEED,
      owner: 'player',
    })
    player.throwCooldown = PLAYER_THROW_COOLDOWN
  }

  const tickCount = state.tickCount + 1
  const previousDeadCount = state.opponents.filter((o) => !o.alive).length

  let opponents = state.opponents.map((o) => {
    if (!o.alive) return o
    const next = { ...o }
    if (tickCount >= next.nextTurnAt) {
      const angle = Math.random() * Math.PI * 2
      next.dx = Math.cos(angle)
      next.dy = Math.sin(angle)
      next.nextTurnAt = tickCount + randInt(OPPONENT_TURN_MIN_TICKS, OPPONENT_TURN_MAX_TICKS)
    }

    let nx = next.x + next.dx * OPPONENT_SPEED
    let ny = next.y + next.dy * OPPONENT_SPEED
    if (nx < OPPONENT_RADIUS || nx > ARENA_WIDTH - OPPONENT_RADIUS) {
      next.dx = -next.dx
      nx = clamp(nx, OPPONENT_RADIUS, ARENA_WIDTH - OPPONENT_RADIUS)
    }
    if (ny < OPPONENT_RADIUS || ny > ARENA_HEIGHT - OPPONENT_RADIUS) {
      next.dy = -next.dy
      ny = clamp(ny, OPPONENT_RADIUS, ARENA_HEIGHT - OPPONENT_RADIUS)
    }
    next.x = nx
    next.y = ny

    if (tickCount >= next.nextThrowAt) {
      const ddx = player.x - next.x
      const ddy = player.y - next.y
      const len = Math.hypot(ddx, ddy) || 1
      balls.push({
        x: next.x,
        y: next.y,
        vx: (ddx / len) * BALL_SPEED,
        vy: (ddy / len) * BALL_SPEED,
        owner: next.id,
      })
      next.nextThrowAt = tickCount + randInt(AI_THROW_MIN_TICKS, AI_THROW_MAX_TICKS)
    }

    return next
  })

  const survivingBalls = []
  for (const ball of balls) {
    if (ball.owner === 'player') {
      const hitOpponent = opponents.find(
        (o) => o.alive && Math.hypot(o.x - ball.x, o.y - ball.y) <= OPPONENT_RADIUS + BALL_RADIUS,
      )
      if (hitOpponent) {
        opponents = opponents.map((o) => (o.id === hitOpponent.id ? { ...o, alive: false } : o))
        continue
      }
    } else if (Math.hypot(player.x - ball.x, player.y - ball.y) <= PLAYER_RADIUS + BALL_RADIUS) {
      player.lives -= 1
      continue
    }
    survivingBalls.push(ball)
  }

  const newlyDefeated = opponents.filter((o) => !o.alive).length - previousDeadCount
  let score = state.score + newlyDefeated * 100

  let status = 'playing'
  if (player.lives <= 0) {
    status = 'lost'
  } else if (opponents.every((o) => !o.alive)) {
    status = 'won'
    score += player.lives * 50
  }

  return {
    player,
    opponents,
    balls: survivingBalls,
    score,
    tickCount,
    status,
  }
}
