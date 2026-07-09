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

// 구조물 재질별 튜닝값 - hp(버틸 수 있는 타격 수), massScale(부딪혔을 때 얼마나 세게 튕겨나가는지).
// 유리는 가볍고 약해서 한 번에 깨지며 크게 날아가고, 돌은 무겁고 단단해서 여러 번 맞아야 부서지고 거의 안 밀려난다.
export const MATERIALS = {
  wood: { hp: 2, massScale: 1, label: '나무' },
  stone: { hp: 4, massScale: 0.5, label: '돌' },
  glass: { hp: 1, massScale: 1.8, label: '유리' },
}
const SHATTER_TICKS = 14
const SHARD_COUNT = 5

// 새 종류별 특수 능력 튜닝값. 빨강은 기본형(능력 없음).
export const YELLOW_BOOST = 1.55
export const BLUE_SPLIT_ANGLE = 0.35 // 라디안 단위로 갈라지는 각도
export const BLUE_SPLIT_RADIUS_SCALE = 0.72
export const BLACK_EXPLOSION_RADIUS = 70
export const BLACK_EXPLOSION_IMPULSE = 10

const SPECIAL_BIRD_CYCLE = ['yellow', 'blue', 'black']

/**
 * 스테이지의 새 대기열을 만듭니다. 첫 새는 항상 빨강(기본형)이고,
 * 이후 3마리마다 한 번씩 특수 능력 새(노랑→파랑→검은색 순환)를 섞습니다.
 */
function buildBirdQueue(count) {
  const queue = []
  let specialCursor = 0
  for (let i = 0; i < count; i++) {
    if (i > 0 && i % 3 === 0) {
      queue.push(SPECIAL_BIRD_CYCLE[specialCursor % SPECIAL_BIRD_CYCLE.length])
      specialCursor++
    } else {
      queue.push('red')
    }
  }
  return queue
}

export const HANDCRAFTED_LEVELS = [
  {
    birdCount: 2,
    blocks: [
      { x: 480, y: GROUND_Y - 20, w: 20, h: 40, material: 'wood' },
      { x: 560, y: GROUND_Y - 20, w: 20, h: 40, material: 'glass' },
    ],
    pigs: [{ x: 520, y: GROUND_Y - 50, r: 14 }],
  },
  {
    birdCount: 3,
    blocks: [
      { x: 460, y: GROUND_Y - 20, w: 20, h: 40, material: 'stone' },
      { x: 460, y: GROUND_Y - 60, w: 20, h: 40, material: 'wood' },
      { x: 580, y: GROUND_Y - 20, w: 20, h: 40, material: 'wood' },
    ],
    pigs: [
      { x: 460, y: GROUND_Y - 90, r: 14 },
      { x: 580, y: GROUND_Y - 50, r: 14 },
    ],
  },
  {
    birdCount: 4,
    blocks: [
      { x: 420, y: GROUND_Y - 20, w: 20, h: 40, material: 'wood' },
      { x: 500, y: GROUND_Y - 20, w: 20, h: 40, material: 'stone' },
      { x: 500, y: GROUND_Y - 60, w: 20, h: 40, material: 'glass' },
      { x: 580, y: GROUND_Y - 20, w: 20, h: 40, material: 'wood' },
    ],
    pigs: [
      { x: 420, y: GROUND_Y - 50, r: 14 },
      { x: 500, y: GROUND_Y - 90, r: 14 },
      { x: 580, y: GROUND_Y - 50, r: 14 },
    ],
  },
  {
    birdCount: 4,
    blocks: [
      { x: 400, y: GROUND_Y - 20, w: 20, h: 40, material: 'stone' },
      { x: 400, y: GROUND_Y - 60, w: 20, h: 40, material: 'glass' },
      { x: 560, y: GROUND_Y - 20, w: 20, h: 40, material: 'stone' },
      { x: 560, y: GROUND_Y - 60, w: 20, h: 40, material: 'glass' },
    ],
    pigs: [
      { x: 400, y: GROUND_Y - 90, r: 14 },
      { x: 560, y: GROUND_Y - 90, r: 14 },
      { x: 480, y: GROUND_Y - 14, r: 14 },
    ],
  },
  {
    birdCount: 5,
    blocks: [
      { x: 380, y: GROUND_Y - 20, w: 20, h: 40, material: 'stone' },
      { x: 380, y: GROUND_Y - 60, w: 20, h: 40, material: 'wood' },
      { x: 380, y: GROUND_Y - 100, w: 20, h: 40, material: 'glass' },
      { x: 480, y: GROUND_Y - 20, w: 20, h: 40, material: 'wood' },
      { x: 560, y: GROUND_Y - 20, w: 20, h: 40, material: 'stone' },
      { x: 560, y: GROUND_Y - 60, w: 20, h: 40, material: 'glass' },
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
/** 티어가 올라갈수록 돌(단단함) 비중을 늘려 구조물을 허무는 데 더 신중한 조준이 필요하게 합니다. */
function pickMaterial(tier) {
  const roll = Math.random()
  const stoneChance = Math.min(0.15 + tier * 0.04, 0.45)
  const glassChance = 0.2
  if (roll < stoneChance) return 'stone'
  if (roll < stoneChance + glassChance) return 'glass'
  return 'wood'
}

function generateLevel(levelIndex) {
  const tier = levelIndex - HANDCRAFTED_LEVELS.length + 1
  const towerCount = Math.min(3 + Math.floor(tier / 2), 6)
  const maxHeight = Math.min(2 + Math.floor(tier / 2), 5)
  const pigCount = Math.min(4 + tier, 10)
  const birdCount = Math.min(pigCount + 1, 10)

  const spacing = towerCount > 1 ? (PROC_ZONE_END - PROC_ZONE_START) / (towerCount - 1) : 0
  const towerXs = Array.from({ length: towerCount }, (_, t) =>
    towerCount > 1 ? PROC_ZONE_START + spacing * t : (PROC_ZONE_START + PROC_ZONE_END) / 2,
  )

  const blocks = []
  const towerTops = []
  towerXs.forEach((x) => {
    const height = 1 + Math.floor(Math.random() * maxHeight)
    for (let h = 0; h < height; h++) {
      blocks.push({
        x,
        y: GROUND_Y - PROC_BLOCK_H / 2 - h * PROC_BLOCK_H,
        w: PROC_BLOCK_W,
        h: PROC_BLOCK_H,
        material: pickMaterial(tier),
      })
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
  const material = block.material || 'wood'
  const hpMax = MATERIALS[material].hp
  return {
    ...block,
    material,
    hp: hpMax,
    hpMax,
    vx: 0,
    vy: 0,
    angle: 0,
    angularVelocity: 0,
    resting: false,
    hit: false,
    hitCooldown: 0,
  }
}

/**
 * 부서진 블록 자리에 흩날리는 파편 이펙트를 만듭니다. 각도/거리는 생성 시 한 번만
 * 무작위로 정해서 저장해두고 그대로 재사용합니다 - 매 렌더링마다 다시 뽑으면
 * 애니메이션이 매 틱 순간이동하듯 깨져버립니다.
 */
function createShatter(block) {
  const shards = Array.from({ length: SHARD_COUNT }, (_, i) => ({
    angle: (Math.PI * 2 * i) / SHARD_COUNT + (Math.random() - 0.5) * 0.6,
    dist: 16 + Math.random() * 16,
  }))
  return { x: block.x, y: block.y, material: block.material, ticksLeft: SHATTER_TICKS, shards }
}

function ageShatters(shatters) {
  return shatters.map((s) => ({ ...s, ticksLeft: s.ticksLeft - 1 })).filter((s) => s.ticksLeft > 0)
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
 * 옆으로 밀려난 블록이 다른 블록과 겹쳐 파고드는 것을 막습니다. 위아래로 쌓인
 * 관계(세로로만 겹침)는 computeFloor가 이미 처리하므로 건드리지 않고, 가로로도
 * 겹친 경우에만 두 블록을 겹친 만큼 갈라놓습니다. 가벼운 재질(유리)이 무거운
 * 재질(돌)보다 더 많이 밀려나도록 massScale 비율로 나눠 밀어냅니다.
 */
function resolveBlockOverlaps(blocks) {
  const result = blocks.map((b) => ({ ...b }))
  for (let i = 0; i < result.length; i++) {
    for (let j = i + 1; j < result.length; j++) {
      const a = result[i]
      const b = result[j]
      const overlapX = a.w / 2 + b.w / 2 - Math.abs(a.x - b.x)
      const overlapY = a.h / 2 + b.h / 2 - Math.abs(a.y - b.y)
      if (overlapX <= 0 || overlapY <= 0 || overlapX >= overlapY) continue

      const aMass = MATERIALS[a.material]?.massScale ?? 1
      const bMass = MATERIALS[b.material]?.massScale ?? 1
      const aShare = aMass / (aMass + bMass)
      const dir = a.x <= b.x ? -1 : 1

      a.x += overlapX * aShare * dir
      b.x -= overlapX * (1 - aShare) * dir
      if (dir < 0) {
        if (a.vx > 0) a.vx = 0
        if (b.vx < 0) b.vx = 0
      } else {
        if (a.vx < 0) a.vx = 0
        if (b.vx > 0) b.vx = 0
      }
    }
  }
  return result
}

/**
 * 모든 블록에 중력/받침대/마찰/회전(넘어짐)을 한 틱만큼 진행시킵니다.
 * 서로 떠받쳐주는 관계이므로 개별 블록이 아니라 전체 배열을 한 번에 처리합니다.
 */
function stepBlocks(allBlocks) {
  const floors = allBlocks.map((b) => computeFloor(b, allBlocks))

  const stepped = allBlocks.map((block, i) => {
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

  return resolveBlockOverlaps(stepped)
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
    birdQueue: buildBirdQueue(level.birdCount),
    blocks: level.blocks.map(createBlockState),
    pigs: level.pigs.map(createPigState),
    birds: [],
    shatters: [],
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
  if (state.status !== 'aiming' || state.birds.length > 0 || state.birdQueue.length === 0) return state
  const [type, ...restQueue] = state.birdQueue
  return {
    ...state,
    birds: [{ x: SLING_X, y: SLING_Y, vx, vy, r: BIRD_RADIUS, type, abilityUsed: false }],
    birdQueue: restQueue,
    status: 'flying',
  }
}

/** 새가 모두 착지/화면 밖으로 나갔을 때 다음 상태(클리어/실패/다음 조준)를 정합니다. */
function resolveFlightEnd(state, blocks, pigs, score, birds, shatters) {
  if (birds.length > 0) return { ...state, blocks, pigs, score, birds, shatters }
  if (pigs.length === 0) return { ...state, blocks, pigs, score, birds: [], shatters, status: 'level-clear' }
  if (state.birdQueue.length === 0) return { ...state, blocks, pigs, score, birds: [], shatters, status: 'level-failed' }
  return { ...state, blocks, pigs, score, birds: [], shatters, status: 'aiming' }
}

/**
 * 블록 하나가 맞았을 때의 반응을 재질에 맞게 계산합니다. hp가 다 떨어지면 블록을
 * 제거하고(destroyed: true) 파편 이펙트를 만들며, 아니면 재질의 무게(massScale)에
 * 맞춰 튕겨나갑니다 - 유리는 크게, 돌은 거의 안 밀려납니다.
 */
function damageBlock(block, pushDx, pushDy, impulseBase) {
  const mass = MATERIALS[block.material]?.massScale ?? 1
  const len = Math.hypot(pushDx, pushDy) || 1
  const impulse = impulseBase * mass
  const hp = block.hp - 1

  if (hp <= 0) return { destroyed: true }

  return {
    destroyed: false,
    block: {
      ...block,
      vx: block.vx + (pushDx / len) * impulse,
      vy: block.vy + (pushDy / len) * impulse - BLOCK_PUSH_LIFT,
      angularVelocity: block.angularVelocity + (pushDx / len) * impulse * 0.4,
      resting: false,
      hit: true,
      hitCooldown: BLOCK_HIT_COOLDOWN_TICKS,
      hp,
    },
  }
}

/** 새 한 마리가 이번 틱에 준 충격을 블록/돼지에 적용하고, 갱신된 블록/돼지/점수/파편을 돌려줍니다. */
function applyBirdImpact(bird, blocks, pigs, score, shatters) {
  let hitSomething = false

  const remainingPigs = []
  for (const pig of pigs) {
    if (circleCircleHit(bird.x, bird.y, bird.r, pig.x, pig.y, pig.r)) {
      score += 100
      hitSomething = true
    } else {
      remainingPigs.push(pig)
    }
  }

  const nextBlocks = []
  const nextShatters = [...shatters]
  for (const block of blocks) {
    if (block.hitCooldown > 0 || !circleRectHit(bird.x, bird.y, bird.r, block)) {
      nextBlocks.push(block)
      continue
    }
    hitSomething = true
    if (!block.hit) score += 20

    const pushDx = block.x - bird.x
    const pushDy = block.y - bird.y
    const speed = Math.hypot(bird.vx, bird.vy)
    const impulseBase = BLOCK_PUSH_BASE + speed * BLOCK_PUSH_SCALE
    const result = damageBlock(block, pushDx, pushDy, impulseBase)

    if (result.destroyed) {
      score += 10
      nextShatters.push(createShatter(block))
    } else {
      nextBlocks.push(result.block)
    }
  }

  return { blocks: nextBlocks, pigs: remainingPigs, score, hitSomething, shatters: nextShatters }
}

export function tick(state) {
  const blocksSettling = hasSettlingBlocks(state.blocks)
  const pigsSettling = hasSettlingPigs(state.pigs)
  const shattersActive = state.shatters.length > 0
  const needsPhysics = blocksSettling || pigsSettling

  if (state.status !== 'flying' && !needsPhysics && !shattersActive) return state

  let blocks = blocksSettling ? stepBlocks(state.blocks) : state.blocks
  let pigs = needsPhysics ? stepPigs(state.pigs, blocks) : state.pigs
  let shatters = shattersActive ? ageShatters(state.shatters) : state.shatters

  if (state.status !== 'flying' || state.birds.length === 0) {
    return needsPhysics || shattersActive ? { ...state, blocks, pigs, shatters } : state
  }

  let score = state.score
  const survivingBirds = []

  for (const prevBird of state.birds) {
    const bird = { ...prevBird }
    bird.x += bird.vx
    bird.y += bird.vy
    bird.vy += GRAVITY

    const impact = applyBirdImpact(bird, blocks, pigs, score, shatters)
    blocks = impact.blocks
    pigs = impact.pigs
    score = impact.score
    shatters = impact.shatters

    if (impact.hitSomething) {
      bird.vx *= HIT_SPEED_RETAIN
      bird.vy *= HIT_SPEED_RETAIN
    }

    const landed = bird.y + bird.r >= GROUND_Y
    const offscreen = bird.x - bird.r > ARENA_WIDTH || bird.x + bird.r < 0
    if (!landed && !offscreen) survivingBirds.push(bird)
  }

  return resolveFlightEnd(state, blocks, pigs, score, survivingBirds, shatters)
}

/**
 * 날아가는 중 화면을 탭했을 때 호출됩니다. 능력을 아직 안 쓴 새들에 한해
 * 종류별 효과를 적용합니다: 노랑=가속, 파랑=3방향 분열, 검은색=제자리 폭발(소멸).
 * 빨강은 능력이 없어 그대로 지나칩니다.
 */
export function activateAbilities(state) {
  if (state.status !== 'flying') return state

  let blocks = state.blocks
  let pigs = state.pigs
  let score = state.score
  let shatters = state.shatters
  const nextBirds = []

  for (const bird of state.birds) {
    if (bird.abilityUsed || bird.type === 'red') {
      nextBirds.push(bird)
      continue
    }

    if (bird.type === 'yellow') {
      nextBirds.push({ ...bird, vx: bird.vx * YELLOW_BOOST, vy: bird.vy * YELLOW_BOOST, abilityUsed: true })
      continue
    }

    if (bird.type === 'blue') {
      const speed = Math.hypot(bird.vx, bird.vy)
      const angle = Math.atan2(bird.vy, bird.vx)
      for (const offset of [-BLUE_SPLIT_ANGLE, 0, BLUE_SPLIT_ANGLE]) {
        const a = angle + offset
        nextBirds.push({
          ...bird,
          vx: Math.cos(a) * speed,
          vy: Math.sin(a) * speed,
          r: bird.r * BLUE_SPLIT_RADIUS_SCALE,
          abilityUsed: true,
        })
      }
      continue
    }

    if (bird.type === 'black') {
      const remainingPigs = []
      for (const pig of pigs) {
        if (Math.hypot(bird.x - pig.x, bird.y - pig.y) <= BLACK_EXPLOSION_RADIUS + pig.r) {
          score += 100
        } else {
          remainingPigs.push(pig)
        }
      }
      pigs = remainingPigs

      const nextBlocks = []
      for (const block of blocks) {
        const dist = Math.hypot(bird.x - block.x, bird.y - block.y)
        if (dist > BLACK_EXPLOSION_RADIUS) {
          nextBlocks.push(block)
          continue
        }
        if (!block.hit) score += 20
        const pushDx = block.x - bird.x || 1
        const pushDy = block.y - bird.y - 10
        const result = damageBlock(block, pushDx, pushDy, BLACK_EXPLOSION_IMPULSE)
        if (result.destroyed) {
          score += 10
          shatters = [...shatters, createShatter(block)]
        } else {
          nextBlocks.push(result.block)
        }
      }
      blocks = nextBlocks
      // 검은새는 터지면서 사라진다 - nextBirds에 다시 넣지 않는다
      continue
    }

    nextBirds.push(bird)
  }

  return resolveFlightEnd(state, blocks, pigs, score, nextBirds, shatters)
}
