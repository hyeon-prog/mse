// 표준 블록 도미노(더블식스, 28피스) 순수 로직
// 규칙: 인원수와 무관하게 각자 7피스씩 분배, 낼 수 없으면 낼 수 있을 때까지
// 보유고에서 뽑기, 보유고가 비면 패스. 손패를 다 내거나 블록(전원 못 냄)이면
// 라운드 종료 — 승자가 나머지 전원의 남은 핀 합을 점수로 획득.

export const HAND_SIZE = 7

export function createDeck() {
  const deck = []
  for (let a = 0; a <= 6; a++) {
    for (let b = a; b <= 6; b++) {
      deck.push({ a, b })
    }
  }
  return deck
}

export function shuffle(items) {
  const result = [...items]
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[result[i], result[j]] = [result[j], result[i]]
  }
  return result
}

export function createEmptyBoard() {
  return { chain: [], leftEnd: null, rightEnd: null }
}

export function getValidMoves(hand, board) {
  const { leftEnd, rightEnd } = board
  if (leftEnd === null || rightEnd === null) {
    return hand.map((tile) => ({ tile, end: 'right' }))
  }
  const moves = []
  for (const tile of hand) {
    if (tile.a === leftEnd || tile.b === leftEnd) moves.push({ tile, end: 'left' })
    if (tile.a === rightEnd || tile.b === rightEnd) moves.push({ tile, end: 'right' })
  }
  return moves
}

export function canPlay(hand, board) {
  return getValidMoves(hand, board).length > 0
}

function otherValue(tile, matched) {
  return tile.a === matched ? tile.b : tile.a
}

export function applyMove(board, move) {
  const { tile } = move
  const { leftEnd, rightEnd } = board

  if (leftEnd === null || rightEnd === null) {
    return { chain: [{ tile, flipped: false }], leftEnd: tile.a, rightEnd: tile.b }
  }

  if (move.end === 'left') {
    const flipped = tile.a === leftEnd
    return { chain: [{ tile, flipped }, ...board.chain], leftEnd: otherValue(tile, leftEnd), rightEnd }
  }

  const flipped = tile.b === rightEnd
  return { chain: [...board.chain, { tile, flipped }], leftEnd, rightEnd: otherValue(tile, rightEnd) }
}

export function pipSum(hand) {
  return hand.reduce((sum, t) => sum + t.a + t.b, 0)
}

export function nextPlayer(order, current) {
  const index = order.indexOf(current)
  return order[(index + 1) % order.length]
}

function pickClosestAfter(order, starter, candidates) {
  const startIndex = order.indexOf(starter)
  for (let offset = 1; offset <= order.length; offset++) {
    const candidate = order[(startIndex + offset) % order.length]
    if (candidates.includes(candidate)) return candidate
  }
  return candidates[0]
}

function dealHands(playerOrder) {
  const shuffled = shuffle(createDeck())
  const hands = {}
  let offset = 0
  for (const player of playerOrder) {
    hands[player] = shuffled.slice(offset, offset + HAND_SIZE)
    offset += HAND_SIZE
  }
  return { hands, boneyard: shuffled.slice(offset) }
}

export function createMatch(mode, targetScore, playerOrder) {
  const dealt = dealHands(playerOrder)
  const scores = {}
  for (const player of playerOrder) scores[player] = 0
  const starter = playerOrder[Math.floor(Math.random() * playerOrder.length)]
  return {
    mode, // 'single-round' | 'target-score'
    targetScore,
    playerOrder,
    hands: dealt.hands,
    scores,
    board: createEmptyBoard(),
    boneyard: dealt.boneyard,
    currentTurn: starter,
    roundStarter: starter,
    status: 'playing', // 'playing' | 'round-over' | 'match-over'
    lastRoundResult: null,
    matchWinnerId: null,
  }
}

export function startNextRound(state) {
  const dealt = dealHands(state.playerOrder)
  const starter = state.lastRoundResult?.winnerId ?? state.roundStarter
  return {
    ...state,
    hands: dealt.hands,
    board: createEmptyBoard(),
    boneyard: dealt.boneyard,
    currentTurn: starter,
    roundStarter: starter,
    status: 'playing',
    lastRoundResult: null,
  }
}

export function resolveDrawPhase(state) {
  if (state.status !== 'playing') return state
  const player = state.currentTurn
  if (canPlay(state.hands[player], state.board)) return state

  let hand = state.hands[player]
  let boneyard = state.boneyard
  let drewAny = false
  while (!canPlay(hand, state.board) && boneyard.length > 0) {
    hand = [...hand, boneyard[0]]
    boneyard = boneyard.slice(1)
    drewAny = true
  }
  // 아무것도 못 뽑았으면 같은 참조를 반환해야 호출부(effect)가 무한 재실행되지 않는다
  if (!drewAny) return state
  return { ...state, hands: { ...state.hands, [player]: hand }, boneyard }
}

function pipTotal(state, player) {
  return pipSum(state.hands[player])
}

function finishRound(state, winnerId, reason) {
  const pointsAwarded = state.playerOrder
    .filter((id) => id !== winnerId)
    .reduce((sum, id) => sum + pipTotal(state, id), 0)
  const scores = { ...state.scores, [winnerId]: state.scores[winnerId] + pointsAwarded }
  const matchOver = state.mode === 'single-round' || scores[winnerId] >= state.targetScore
  return {
    ...state,
    scores,
    status: matchOver ? 'match-over' : 'round-over',
    lastRoundResult: { winnerId, reason, pointsAwarded },
    matchWinnerId: matchOver ? winnerId : null,
  }
}

export function playMove(state, move) {
  if (state.status !== 'playing') return state
  const player = state.currentTurn
  const hand = state.hands[player]
  const tileIndex = hand.findIndex((t) => t.a === move.tile.a && t.b === move.tile.b)
  if (tileIndex === -1) return state

  const newHand = [...hand.slice(0, tileIndex), ...hand.slice(tileIndex + 1)]
  const next = {
    ...state,
    board: applyMove(state.board, move),
    hands: { ...state.hands, [player]: newHand },
  }

  if (newHand.length === 0) {
    return finishRound(next, player, 'emptied-hand')
  }
  return { ...next, currentTurn: nextPlayer(state.playerOrder, player) }
}

export function passTurn(state) {
  if (state.status !== 'playing') return state

  if (state.boneyard.length === 0) {
    const anyoneCanPlay = state.playerOrder.some((id) => canPlay(state.hands[id], state.board))
    if (!anyoneCanPlay) {
      const pipTotals = new Map(state.playerOrder.map((id) => [id, pipTotal(state, id)]))
      const lowest = Math.min(...pipTotals.values())
      const tied = state.playerOrder.filter((id) => pipTotals.get(id) === lowest)
      const winnerId = tied.length === 1 ? tied[0] : pickClosestAfter(state.playerOrder, state.roundStarter, tied)
      return finishRound(state, winnerId, 'blocked')
    }
  }

  return { ...state, currentTurn: nextPlayer(state.playerOrder, state.currentTurn) }
}

// ---- AI ----
// easy: 낼 수 있는 수 중 무작위
// medium: 핀 합이 가장 큰 타일 우선 (블록 시 손해를 줄이는 흔한 전략)
// hard: 공개 정보(자기 손패 + 보드)만으로 상대가 이어받기 어려운 끝값을 남기는 수

const TOTAL_TILES_PER_VALUE = 7

function pickRandom(moves) {
  return moves[Math.floor(Math.random() * moves.length)]
}

function tilePips(tile) {
  return tile.a + tile.b
}

function pickHighestPipSum(moves) {
  const maxSum = Math.max(...moves.map((m) => tilePips(m.tile)))
  return pickRandom(moves.filter((m) => tilePips(m.tile) === maxSum))
}

function countOccurrences(value, tiles) {
  return tiles.filter((t) => t.a === value || t.b === value).length
}

function remainingUnseen(value, hand, board) {
  const boardTiles = board.chain.map((p) => p.tile)
  return TOTAL_TILES_PER_VALUE - countOccurrences(value, hand) - countOccurrences(value, boardTiles)
}

function pickMostBlocking(moves, hand, board) {
  const scored = moves.map((move) => {
    const resultBoard = applyMove(board, move)
    const remainingHand = hand.filter((t) => !(t.a === move.tile.a && t.b === move.tile.b))
    const leftScore = resultBoard.leftEnd === null ? 0 : remainingUnseen(resultBoard.leftEnd, remainingHand, resultBoard)
    const rightScore = resultBoard.rightEnd === null ? 0 : remainingUnseen(resultBoard.rightEnd, remainingHand, resultBoard)
    return { move, score: leftScore + rightScore }
  })
  const minScore = Math.min(...scored.map((s) => s.score))
  return pickRandom(scored.filter((s) => s.score === minScore).map((s) => s.move))
}

export function chooseAiMove(hand, board, difficulty = 'easy') {
  const moves = getValidMoves(hand, board)
  if (moves.length === 0) return null
  if (difficulty === 'medium') return pickHighestPipSum(moves)
  if (difficulty === 'hard') return pickMostBlocking(moves, hand, board)
  return pickRandom(moves)
}
