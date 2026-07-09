import { ROUNDS_TO_WIN, createFight, tick } from './tekkenLogic.js'

export function createMatchState() {
  return {
    fight: createFight(),
    p1Wins: 0,
    p2Wins: 0,
    status: 'playing',
    winnerLabel: '',
  }
}

export function stepMatch(state, inputs) {
  if (state.status !== 'playing') return state

  const nextFight = tick(state.fight, inputs)
  if (nextFight.status !== 'round-over') {
    return { ...state, fight: nextFight }
  }

  let p1Wins = state.p1Wins
  let p2Wins = state.p2Wins
  if (nextFight.roundWinner === 'p1') p1Wins += 1
  if (nextFight.roundWinner === 'p2') p2Wins += 1

  if (p1Wins >= ROUNDS_TO_WIN || p2Wins >= ROUNDS_TO_WIN) {
    return {
      ...state,
      fight: nextFight,
      p1Wins,
      p2Wins,
      status: 'match-over',
      winnerLabel: p1Wins > p2Wins ? 'Player 1' : 'Player 2',
    }
  }

  return {
    ...state,
    fight: createFight(),
    p1Wins,
    p2Wins,
    status: 'playing',
  }
}
