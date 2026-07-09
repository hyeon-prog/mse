export const ARENA_WIDTH = 640
export const ROUND_TIME = 60
export const ROUNDS_TO_WIN = 2
export const TICK_INTERVAL_MS = 33

const GRAVITY = 1.18
const JUMP_VELOCITY = -14.3
const MOVE_SPEED = 6.5
const PUNCH_RANGE = 55
const KICK_RANGE = 75
const PUNCH_DAMAGE = 8
const KICK_DAMAGE = 13
const BLOCK_CHIP_RATIO = 0.2
const ATTACK_DURATION = 11
const HIT_STUN = 9
const KNOCKBACK = 18
const MIN_X = 30
const MAX_X = ARENA_WIDTH - 30
const TICKS_PER_SECOND = Math.round(1000 / TICK_INTERVAL_MS)

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v))
}

function createFighter(x) {
  return {
    x,
    y: 0,
    vy: 0,
    health: 100,
    action: 'idle',
    attackType: null,
    actionTimer: 0,
    facing: 1,
    justAttacked: null,
  }
}

export function createFight() {
  return {
    p1: createFighter(100),
    p2: createFighter(ARENA_WIDTH - 100),
    roundTime: ROUND_TIME,
    tickCount: 0,
    status: 'playing',
    roundWinner: null,
  }
}

function stepFighter(f, input) {
  const next = { ...f, justAttacked: null }

  if (next.action === 'attack' || next.action === 'hit') {
    next.actionTimer -= 1
    if (next.actionTimer <= 0) {
      next.action = 'idle'
      next.attackType = null
    }
    return next
  }

  if (next.action === 'jump') {
    next.y += next.vy
    next.vy += GRAVITY
    if (next.y >= 0) {
      next.y = 0
      next.vy = 0
      next.action = 'idle'
    }
    return next
  }

  if (next.action === 'block' && !input.block) {
    next.action = 'idle'
  }

  if (next.action === 'idle') {
    if (input.left) next.x -= MOVE_SPEED
    if (input.right) next.x += MOVE_SPEED
    next.x = clamp(next.x, MIN_X, MAX_X)

    if (input.block) {
      next.action = 'block'
    } else if (input.jumpPressed) {
      next.action = 'jump'
      next.vy = JUMP_VELOCITY
    } else if (input.punchPressed) {
      next.action = 'attack'
      next.attackType = 'punch'
      next.actionTimer = ATTACK_DURATION
      next.justAttacked = 'punch'
    } else if (input.kickPressed) {
      next.action = 'attack'
      next.attackType = 'kick'
      next.actionTimer = ATTACK_DURATION
      next.justAttacked = 'kick'
    }
  }

  return next
}

function applyAttack(attacker, defender) {
  if (!attacker.justAttacked) return { attacker, defender }
  const isKick = attacker.justAttacked === 'kick'
  const range = isKick ? KICK_RANGE : PUNCH_RANGE
  const damage = isKick ? KICK_DAMAGE : PUNCH_DAMAGE
  const dist = Math.abs(attacker.x - defender.x)
  if (dist > range || defender.action === 'jump') return { attacker, defender }

  const defenderUpdate = { ...defender }
  let dealt = damage
  if (defender.action === 'block') {
    dealt = Math.round(damage * BLOCK_CHIP_RATIO)
  } else {
    defenderUpdate.action = 'hit'
    defenderUpdate.actionTimer = HIT_STUN
    const pushDir = defender.x >= attacker.x ? 1 : -1
    defenderUpdate.x = clamp(defender.x + pushDir * KNOCKBACK, MIN_X, MAX_X)
  }
  defenderUpdate.health = Math.max(0, defender.health - dealt)
  return { attacker, defender: defenderUpdate }
}

export function tick(fight, inputs) {
  if (fight.status !== 'playing') return fight

  let p1 = stepFighter(fight.p1, inputs.p1)
  let p2 = stepFighter(fight.p2, inputs.p2)

  const step1 = applyAttack(p1, p2)
  p1 = step1.attacker
  p2 = step1.defender

  const step2 = applyAttack(p2, p1)
  p2 = step2.attacker
  p1 = step2.defender

  p1 = { ...p1, facing: p2.x >= p1.x ? 1 : -1 }
  p2 = { ...p2, facing: p1.x >= p2.x ? 1 : -1 }

  const tickCount = fight.tickCount + 1
  let roundTime = fight.roundTime
  if (tickCount % TICKS_PER_SECOND === 0) {
    roundTime = Math.max(0, roundTime - 1)
  }

  let roundWinner = null
  if (p1.health <= 0 && p2.health <= 0) roundWinner = 'draw'
  else if (p1.health <= 0) roundWinner = 'p2'
  else if (p2.health <= 0) roundWinner = 'p1'
  else if (roundTime <= 0) {
    if (p1.health > p2.health) roundWinner = 'p1'
    else if (p2.health > p1.health) roundWinner = 'p2'
    else roundWinner = 'draw'
  }

  return {
    p1,
    p2,
    roundTime,
    tickCount,
    status: roundWinner ? 'round-over' : 'playing',
    roundWinner,
  }
}

export function actionClass(fighter) {
  if (fighter.action === 'attack') return fighter.attackType === 'kick' ? 'action-kick' : 'action-punch'
  if (fighter.action === 'block') return 'action-block'
  if (fighter.action === 'jump') return 'action-jump'
  if (fighter.action === 'hit') return 'action-hit'
  return 'action-idle'
}

export function playActionSfx(sfx, action, attackType) {
  if (action === 'attack') {
    if (attackType === 'kick') sfx.kick()
    else sfx.punch()
  } else if (action === 'block') {
    sfx.block()
  } else if (action === 'jump') {
    sfx.jump()
  } else if (action === 'hit') {
    sfx.hit()
  }
}
