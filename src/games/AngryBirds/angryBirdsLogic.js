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
const BLOCK_FRICTION = 0.85
const BLOCK_PUSH_BASE = 3
const BLOCK_PUSH_SCALE = 0.6
const BLOCK_PUSH_LIFT = 2
const BLOCK_HIT_COOLDOWN_TICKS = 6
const BLOCK_REST_EPSILON = 0.05
const BLOCK_ANGLE_REST_EPSILON = 0.5
const TOPPLE_KICK = 6
const TOPPLE_VX_FACTOR = 1.1
const ANGULAR_DAMPING_AIR = 0.98
const ANGULAR_DAMPING_GROUND = 0.7

const PROC_BLOCK_W = 20
const PROC_BLOCK_H = 40
const PROC_PIG_R = 14
const PROC_ZONE_START = 360
const PROC_ZONE_END = 620

export const HANDCRAFTED_LEVELS = [
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
  {
    birdCount: 5,
    blocks: [
      { x: 400, y: GROUND_Y - 20, w: 20, h: 40 },
      { x: 400, y: GROUND_Y - 60, w: 20, h: 40 },
      { x: 560, y: GROUND_Y - 20, w: 20, h: 40 },
      { x: 560, y: GROUND_Y - 60, w: 20, h: 40 },
    ],
    pigs: [
      { x: 400, y: GROUND_Y - 90, r: 14 },
      { x: 560, y: GROUND_Y - 90, r: 14 },
      { x: 480, y: GROUND_Y - 14, r: 14 },
    ],
  },
  {
    birdCount: 6,
    blocks: [
      { x: 380, y: GROUND_Y - 20, w: 20, h: 40 },
      { x: 380, y: GROUND_Y - 60, w: 20, h: 40 },
      { x: 380, y: GROUND_Y - 100, w: 20, h: 40 },
      { x: 480, y: GROUND_Y - 20, w: 20, h: 40 },
      { x: 560, y: GROUND_Y - 20, w: 20, h: 40 },
      { x: 560, y: GROUND_Y - 60, w: 20, h: 40 },
    ],
    pigs: [
      { x: 380, y: GROUND_Y - 130, r: 14 },
      { x: 480, y: GROUND_Y - 50, r: 14 },
      { x: 560, y: GROUND_Y - 90, r: 14 },
      { x: 620, y: GROUND_Y - 14, r: 14 },
    ],
  },
]

/**
 * 미리 만든 스테이지(HANDCRAFTED_LEVELS)를 다 넘어서면 난이도를 계속 높여가며
 * 절차적으로 스테이지를 생성합니다. 끝없이 이어지는 모드라 최종 승리 상태는 없고,
 * 새가 다 떨어지면 그 회차가 끝납니다.
 */
function generateLevel(levelIndex) {
  const tier = levelIndex - HANDCRAFTED_LEVELS.length + 1
  const towerCount = Math.min(3 + Math.floor(tier / 2), 6)
  const maxHeight = Math.min(2 + Math.floor(tier / 2), 5)
  const pigCount = Math.min(4 + tier, 10)
  const birdCount = Math.min(pigCount + 2, 12)

  const spacing = towerCount > 1 ? (PROC_ZONE_END - PROC_ZONE_START) / (towerCount - 1) : 0
  const towerXs = Array.from({ length: towerCount }, (_, t) =>
    towerCount > 1 ? PROC_ZONE_START + spacing * t : (PROC_ZONE_START + PROC_ZONE_END) / 2,
  )

  const blocks = []
  const towerTops = []
  towerXs.forEach((x) => {
    const height = 1 + Math.floor(Math.random() * maxHeight)
    for (let h = 0; h < height; h++) {
      blocks.push({ x, y: GROUND_Y - PROC_BLOCK_H / 2 - h * PROC_BLOCK_H, w: PROC_BLOCK_W, h: PROC_BLOCK_H })
    }
    towerTops.push(GROUND_Y - height * PROC_BLOCK_H)
  })

  const pigs = []
  towerXs.forEach((x, i) => {
    if (pigs.length < pigCount) pigs.push({ x, y: towerTops[i] - PROC_PIG_R, r: PROC_PIG_R })
  })

  for (let i = 0; i < towerXs.length - 1 && pigs.length < pigCount; i++) {
    const midX = (towerXs[i] + towerXs[i + 1]) / 2
    pigs.push({ x: midX, y: GROUND_Y - PROC_PIG_R, r: PROC_PIG_R })
  }

  let fallbackX = PROC_ZONE_END + 30
  while (pigs.length < pigCount && fallbackX < ARENA_WIDTH - 20) {
    pigs.push({ x: fallbackX, y: GROUND_Y - PROC_PIG_R, r: PROC_PIG_R })
    fallbackX += 35
  }

  return { birdCount, blocks, pigs }
}

function getLevel(levelIndex) {
  if (levelIndex < HANDCRAFTED_LEVELS.length) return HANDCRAFTED_LEVELS[levelIndex]
  return generateLevel(levelIndex)
}

// resting을 true로 미리 믿지 않고 false로 시작합니다 - 레벨 데이터에 있는 좌표가
// 실제로 바닥/블록에 딱 맞아떨어지는지는 물리 엔진이 첫 틱에 검증하게 둡니다.
// 좌표가 어긋나 있으면(예: 어떤 블록과도 안 겹치는 곳에 놓인 돼지) 레벨 시작과
// 동시에 중력을 받아 제자리로 떨어지고, 이미 맞는 좌표라면 변화 없이 그대로 멈춥니다.
function createBlockState(block) {
  return { ...block, vx: 0, vy: 0, angle: 0, angularVelocity: 0, resting: false, hit: false, hitCooldown: 0 }
}

function createPigState(pig) {
  return { ...pig, vx: 0, vy: 0, resting: false }
}

function isBlockFullySettled(block) {
  return (
    block.resting &&
    block.hitCooldown <= 0 &&
    Math.abs(block.vx) < BLOCK_REST_EPSILON &&
    Math.abs(block.vy) < BLOCK_REST_EPSILON &&
    Math.abs(block.angularVelocity) < BLOCK_ANGLE_REST_EPSILON
  )
}

export function hasSettlingBlocks(blocks) {
  return blocks.some((b) => !isBlockFullySettled(b))
}

/**
 * 이 블록 바로 아래에서 떠받쳐주는 표면의 y좌표(바닥 또는 다른 블록의 윗면)를 찾습니다.
 * "otherTop >= block.y" 조건으로 자기보다 위에 있는 블록은 바닥 후보에서 제외합니다.
 */
function computeFloor(block, allBlocks) {
  const halfW = block.w / 2
  let floor = GROUND_Y
  for (const other of allBlocks) {
    if (other === block) continue
    const otherHalfW = other.w / 2
    const otherHalfH = other.h / 2
    const overlapsX = Math.abs(block.x - other.x) < halfW + otherHalfW - 2
    const otherTop = other.y - otherHalfH
    if (overlapsX && otherTop >= block.y && otherTop < floor) {
      floor = otherTop
    }
  }
  return floor
}

/**
 * 모든 블록에 중력/받침대/마찰/회전(넘어짐)을 한 틱만큼 진행시킵니다.
 * 서로 떠받쳐주는 관계이므로 개별 블록이 아니라 전체 배열을 한 번에 처리합니다.
 */
function stepBlocks(allBlocks) {
  const floors = allBlocks.map((b) => computeFloor(b, allBlocks))

  return allBlocks.map((block, i) => {
    // 개별 블록이 "정지 상태"라고 표시돼 있어도 건너뛰지 않습니다 - 바로 아래 블록이
    // 이번 틱에 치워졌다면 그 표시는 낡은 값이라 다시 바닥(floor)을 계산해야 합니다.
    const halfW = block.w / 2
    const halfH = block.h / 2
    const floor = floors[i]
    const wasResting = block.resting

    let vx = block.vx
    let vy = block.vy + GRAVITY
    let x = block.x + vx
    let y = block.y + vy
    let angularVelocity = block.angularVelocity
    let angle = block.angle

    let resting = false
    if (y + halfH >= floor) {
      y = floor - halfH
      vy = 0
      vx *= BLOCK_FRICTION
      resting = true
    }

    if (x - halfW < 0) {
      x = halfW
      vx = 0
    } else if (x + halfW > ARENA_WIDTH) {
      x = ARENA_WIDTH - halfW
      vx = 0
    }

    if (wasResting && !resting) {
      angularVelocity += (vx !== 0 ? Math.sign(vx) : i % 2 === 0 ? 1 : -1) * TOPPLE_KICK
    }

    if (resting) {
      angularVelocity *= ANGULAR_DAMPING_GROUND
    } else {
      angularVelocity += vx * TOPPLE_VX_FACTOR
      angularVelocity *= ANGULAR_DAMPING_AIR
    }
    angle += angularVelocity

    if (resting && Math.abs(angularVelocity) < BLOCK_ANGLE_REST_EPSILON) {
      angularVelocity = 0
      angle = Math.round(angle / 90) * 90
    }

    if (Math.abs(vx) < BLOCK_REST_EPSILON) vx = 0
    if (Math.abs(vy) < BLOCK_REST_EPSILON) vy = 0

    return { ...block, x, y, vx, vy, angle, angularVelocity, resting, hitCooldown: Math.max(0, block.hitCooldown - 1) }
  })
}

function isPigSettled(pig) {
  return pig.resting && Math.abs(pig.vx) < BLOCK_REST_EPSILON && Math.abs(pig.vy) < BLOCK_REST_EPSILON
}

export function hasSettlingPigs(pigs) {
  return pigs.some((p) => !isPigSettled(p))
}

/** 블록의 computeFloor와 같은 개념이지만 원(돼지) 기준입니다. */
function computeCircleFloor(cx, cy, r, blocks) {
  let floor = GROUND_Y
  for (const block of blocks) {
    const halfW = block.w / 2
    const halfH = block.h / 2
    const overlapsX = Math.abs(cx - block.x) < halfW + r - 2
    const blockTop = block.y - halfH
    if (overlapsX && blockTop >= cy && blockTop < floor) {
      floor = blockTop
    }
  }
  return floor
}

/**
 * 돼지가 서 있던 블록이 날아가면(받침이 사라지면) 돼지도 중력을 받아 떨어집니다.
 * 블록과 마찬가지로 "정지 상태" 표시를 믿지 않고 매번 바닥을 다시 계산합니다.
 */
function stepPigs(pigs, blocks) {
  return pigs.map((pig) => {
    const floor = computeCircleFloor(pig.x, pig.y, pig.r, blocks)

    let vx = pig.vx
    let vy = pig.vy + GRAVITY
    let x = pig.x + vx
    let y = pig.y + vy

    let resting = false
    if (y + pig.r >= floor) {
      y = floor - pig.r
      vy = 0
      vx *= BLOCK_FRICTION
      resting = true
    }

    if (x - pig.r < 0) {
      x = pig.r
      vx = 0
    } else if (x + pig.r > ARENA_WIDTH) {
      x = ARENA_WIDTH - pig.r
      vx = 0
    }

    if (Math.abs(vx) < BLOCK_REST_EPSILON) vx = 0
    if (Math.abs(vy) < BLOCK_REST_EPSILON) vy = 0

    return { ...pig, x, y, vx, vy, resting }
  })
}

function circleRectHit(cx, cy, r, rect) {
  return Math.abs(cx - rect.x) <= rect.w / 2 + r && Math.abs(cy - rect.y) <= rect.h / 2 + r
}

function circleCircleHit(x1, y1, r1, x2, y2, r2) {
  return Math.hypot(x1 - x2, y1 - y2) <= r1 + r2
}

export function createLevelState(levelIndex, baseScore = 0) {
  const level = getLevel(levelIndex)
  return {
    levelIndex,
    birdsLeft: level.birdCount,
    blocks: level.blocks.map(createBlockState),
    pigs: level.pigs.map(createPigState),
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
  const blocksSettling = hasSettlingBlocks(state.blocks)
  const pigsSettling = hasSettlingPigs(state.pigs)
  const needsPhysics = blocksSettling || pigsSettling

  if (state.status !== 'flying' && !needsPhysics) return state

  const blocks = blocksSettling ? stepBlocks(state.blocks) : state.blocks
  const pigs = needsPhysics ? stepPigs(state.pigs, blocks) : state.pigs

  if (state.status !== 'flying' || !state.bird) {
    return needsPhysics ? { ...state, blocks, pigs } : state
  }

  const bird = { ...state.bird }
  bird.x += bird.vx
  bird.y += bird.vy
  bird.vy += GRAVITY

  let score = state.score
  let hitSomething = false

  const remainingPigs = []
  for (const pig of pigs) {
    if (circleCircleHit(bird.x, bird.y, BIRD_RADIUS, pig.x, pig.y, pig.r)) {
      score += 100
      hitSomething = true
    } else {
      remainingPigs.push(pig)
    }
  }

  const nextBlocks = blocks.map((block) => {
    if (block.hitCooldown > 0 || !circleRectHit(bird.x, bird.y, BIRD_RADIUS, block)) return block
    hitSomething = true
    if (!block.hit) score += 20

    const pushDx = block.x - bird.x
    const pushDy = block.y - bird.y
    const len = Math.hypot(pushDx, pushDy) || 1
    const speed = Math.hypot(bird.vx, bird.vy)
    const impulse = BLOCK_PUSH_BASE + speed * BLOCK_PUSH_SCALE

    return {
      ...block,
      vx: block.vx + (pushDx / len) * impulse,
      vy: block.vy + (pushDy / len) * impulse - BLOCK_PUSH_LIFT,
      angularVelocity: block.angularVelocity + (pushDx / len) * impulse * 0.4,
      resting: false,
      hit: true,
      hitCooldown: BLOCK_HIT_COOLDOWN_TICKS,
    }
  })

  if (hitSomething) {
    bird.vx *= HIT_SPEED_RETAIN
    bird.vy *= HIT_SPEED_RETAIN
  }

  const landed = bird.y + BIRD_RADIUS >= GROUND_Y
  const offscreen = bird.x - BIRD_RADIUS > ARENA_WIDTH || bird.x + BIRD_RADIUS < 0

  if (landed || offscreen) {
    if (remainingPigs.length === 0) {
      return { ...state, blocks: nextBlocks, pigs: remainingPigs, score, bird: null, status: 'level-clear' }
    }
    if (state.birdsLeft <= 0) {
      return { ...state, blocks: nextBlocks, pigs: remainingPigs, score, bird: null, status: 'level-failed' }
    }
    return { ...state, blocks: nextBlocks, pigs: remainingPigs, score, bird: null, status: 'aiming' }
  }

  return { ...state, blocks: nextBlocks, pigs: remainingPigs, score, bird }
}
