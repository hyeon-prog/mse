export const VISIBLE_STEPS = 7
export const BEAT_MS_START = 900
export const BEAT_MS_MIN = 380
const BEAT_MS_DECAY = 15
const SAME_DIRECTION_CHANCE = 0.25

let nextStepId = 0

function makeStep(dir) {
  nextStepId += 1
  return { id: nextStepId, dir }
}

function randomDirection(prevDir) {
  if (Math.random() < SAME_DIRECTION_CHANCE) return prevDir
  return prevDir === 'L' ? 'R' : 'L'
}

/** step.id는 계단마다 고유해서, 배열이 한 칸씩 밀릴 때 React가 같은 계단 DOM을
 * 재사용하며 위치만 바꿔주기 때문에 계단이 실제로 미끄러져 내려가는 것처럼 보입니다. */
export function createInitialSteps() {
  const steps = [makeStep('L')]
  for (let i = 1; i < VISIBLE_STEPS; i++) {
    steps.push(makeStep(randomDirection(steps[i - 1].dir)))
  }
  return steps
}

export function createInitialState() {
  return {
    steps: createInitialSteps(),
    score: 0,
    beatMs: BEAT_MS_START,
    status: 'playing',
  }
}

export function currentDirection(state) {
  return state.steps[0].dir
}

export function advanceStep(state) {
  const steps = state.steps.slice(1)
  steps.push(makeStep(randomDirection(steps[steps.length - 1].dir)))
  return {
    ...state,
    steps,
    score: state.score + 1,
    beatMs: Math.max(BEAT_MS_MIN, state.beatMs - BEAT_MS_DECAY),
  }
}

export function fail(state) {
  return { ...state, status: 'over' }
}
