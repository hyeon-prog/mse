export const ARENA_WIDTH = 640
export const ARENA_HEIGHT = 360
export const GROUND_Y = ARENA_HEIGHT - 24
export const SLING_X = 90
export const SLING_Y = GROUND_Y - 50
export const BIRD_RADIUS = 14
export const MAX_PULL = 80
export const LAUNCH_MULTIPLIER = 0.18
export const GRAVITY = 0.35
export const TICK_MS = 30
const HIT_SPEED_RETAIN = 0.6

export const LEVELS = [
  {
    birdCount: 4,
    blocks: [
      { x: 480, y: GROUND_Y - 20, w: 20, h: 40 },
      { x: 560, y: GROUND_Y - 20, w: 20, h: 40 },
    ],
    pigs: [{ x: 520, y: GROUND_Y - 50, r: 14 }],
  },
  {
    birdCount: 4,
    blocks: [
      { x: 460, y: GROUND_Y - 20, w: 20, h: 40 },
      { x: 460, y: GROUND_Y - 60, w: 20, h: 40 },
      { x: 580, y: GROUND_Y - 20, w: 20, h: 40 },
    ],
    pigs: [
      { x: 460, y: GROUND_Y - 90, r: 14 },
      { x: 580, y: GROUND_Y - 50, r: 14 },
    ],
  },
  {
    birdCount: 5,
    blocks: [
      { x: 420, y: GROUND_Y - 20, w: 20, h: 40 },
      { x: 500, y: GROUND_Y - 20, w: 20, h: 40 },
      { x: 500, y: GROUND_Y - 60, w: 20, h: 40 },
      { x: 580, y: GROUND_Y - 20, w: 20, h: 40 },
    ],
    pigs: [
      { x: 420, y: GROUND_Y - 50, r: 14 },
      { x: 500, y: GROUND_Y - 90, r: 14 },
      { x: 580, y: GROUND_Y - 50, r: 14 },
    ],
  },
]

function circleRectHit(cx, cy, r, rect) {
  return Math.abs(cx - rect.x) <= rect.w / 2 + r && Math.abs(cy - rect.y) <= rect.h / 2 + r
}

function circleCircleHit(x1, y1, r1, x2, y2, r2) {
  return Math.hypot(x1 - x2, y1 - y2) <= r1 + r2
}

export function createLevelState(levelIndex, baseScore = 0) {
  const level = LEVELS[levelIndex]
  return {
    levelIndex,
    birdsLeft: level.birdCount,
    blocks: level.blocks.map((b) => ({ ...b })),
    pigs: level.pigs.map((p) => ({ ...p })),
    bird: null,
    score: baseScore,
    status: 'aiming',
  }
}

export function predictTrajectory(vx, vy, maxPoints = 18) {
  const points = []
  let x = SLING_X
  let y = SLING_Y
  let velX = vx
  let velY = vy
  const STEPS_PER_POINT = 3

  for (let i = 0; i < maxPoints; i++) {
    for (let s = 0; s < STEPS_PER_POINT; s++) {
      x += velX
      y += velY
      velY += GRAVITY
    }
    if (y > GROUND_Y || x > ARENA_WIDTH || x < 0) break
    points.push({ x, y })
  }

  return points
}

export function launch(state, vx, vy) {
  if (state.status !== 'aiming' || state.bird) return state
  return {
    ...state,
    bird: { x: SLING_X, y: SLING_Y, vx, vy },
    birdsLeft: state.birdsLeft - 1,
    status: 'flying',
  }
}

export function tick(state) {
  if (state.status !== 'flying' || !state.bird) return state

  const bird = { ...state.bird }
  bird.x += bird.vx
  bird.y += bird.vy
  bird.vy += GRAVITY

  let score = state.score
  let hitSomething = false

  const remainingPigs = []
  for (const pig of state.pigs) {
    if (circleCircleHit(bird.x, bird.y, BIRD_RADIUS, pig.x, pig.y, pig.r)) {
      score += 100
      hitSomething = true
    } else {
      remainingPigs.push(pig)
    }
  }

  const remainingBlocks = []
  for (const block of state.blocks) {
    if (circleRectHit(bird.x, bird.y, BIRD_RADIUS, block)) {
      score += 20
      hitSomething = true
    } else {
      remainingBlocks.push(block)
    }
  }

  if (hitSomething) {
    bird.vx *= HIT_SPEED_RETAIN
    bird.vy *= HIT_SPEED_RETAIN
  }

  const landed = bird.y + BIRD_RADIUS >= GROUND_Y
  const offscreen = bird.x - BIRD_RADIUS > ARENA_WIDTH || bird.x + BIRD_RADIUS < 0

  if (landed || offscreen) {
    if (remainingPigs.length === 0) {
      const isLastLevel = state.levelIndex >= LEVELS.length - 1
      return {
        ...state,
        blocks: remainingBlocks,
        pigs: remainingPigs,
        score,
        bird: null,
        status: isLastLevel ? 'game-won' : 'level-clear',
      }
    }
    if (state.birdsLeft <= 0) {
      return { ...state, blocks: remainingBlocks, pigs: remainingPigs, score, bird: null, status: 'level-failed' }
    }
    return { ...state, blocks: remainingBlocks, pigs: remainingPigs, score, bird: null, status: 'aiming' }
  }

  return { ...state, blocks: remainingBlocks, pigs: remainingPigs, score, bird }
}
