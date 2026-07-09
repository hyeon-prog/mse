export const BOARD_SIZE = 15
export const EMPTY = 0
export const BLACK = 1
export const WHITE = 2

const DIRECTIONS = [
  [0, 1],
  [1, 0],
  [1, 1],
  [1, -1],
]

export const STAR_POINTS = [
  [3, 3],
  [3, 11],
  [7, 7],
  [11, 3],
  [11, 11],
]

function inBounds(r, c) {
  return r >= 0 && r < BOARD_SIZE && c >= 0 && c < BOARD_SIZE
}

export function createEmptyBoard() {
  return Array.from({ length: BOARD_SIZE }, () => Array(BOARD_SIZE).fill(EMPTY))
}

export function cloneBoardWithMove(board, row, col, player) {
  const next = board.map((r) => r.slice())
  next[row][col] = player
  return next
}

export function isBoardFull(board) {
  return board.every((row) => row.every((cell) => cell !== EMPTY))
}

/** 방금 놓은 돌(row,col)을 기준으로 4방향 중 5개 이상 이어졌는지 확인, 이어진 좌표도 함께 반환합니다. */
export function checkWin(board, row, col, player) {
  for (const [dr, dc] of DIRECTIONS) {
    const line = [[row, col]]

    let r = row + dr
    let c = col + dc
    while (inBounds(r, c) && board[r][c] === player) {
      line.push([r, c])
      r += dr
      c += dc
    }

    r = row - dr
    c = col - dc
    while (inBounds(r, c) && board[r][c] === player) {
      line.unshift([r, c])
      r -= dr
      c -= dc
    }

    if (line.length >= 5) return { win: true, line }
  }
  return { win: false, line: [] }
}

/** (row,col)에 player 돌을 놓았다고 가정했을 때, 한 방향 축으로 이어지는 연속 개수와 열린 끝의 수. */
function countLine(board, row, col, player, dr, dc) {
  let count = 1
  let openEnds = 0

  let r = row + dr
  let c = col + dc
  while (inBounds(r, c) && board[r][c] === player) {
    count++
    r += dr
    c += dc
  }
  if (inBounds(r, c) && board[r][c] === EMPTY) openEnds++

  r = row - dr
  c = col - dc
  while (inBounds(r, c) && board[r][c] === player) {
    count++
    r -= dr
    c -= dc
  }
  if (inBounds(r, c) && board[r][c] === EMPTY) openEnds++

  return { count, openEnds }
}

function scoreForPattern(count, openEnds) {
  if (count >= 5) return 100000
  if (count === 4) return openEnds >= 2 ? 12000 : openEnds === 1 ? 6000 : 0
  if (count === 3) return openEnds === 2 ? 1200 : openEnds === 1 ? 250 : 0
  if (count === 2) return openEnds === 2 ? 100 : openEnds === 1 ? 20 : 0
  return openEnds === 2 ? 5 : 1
}

function evaluateCellFor(board, row, col, player) {
  let total = 0
  for (const [dr, dc] of DIRECTIONS) {
    const { count, openEnds } = countLine(board, row, col, player, dr, dc)
    total += scoreForPattern(count, openEnds)
  }
  return total
}

/**
 * 간단한 휴리스틱 CPU: 모든 빈 칸에 대해 "내가 놓으면 얼마나 유리한지"(공격)와
 * "상대가 놓으면 얼마나 위협적인지"(방어, 곧 상대의 승리/4연속을 막는 값)를 함께 채점해서
 * 가장 높은 칸을 고릅니다. 즉시 이기는 수와 막아야 하는 수는 점수 자체가 압도적으로 커서
 * 자연스럽게 최우선으로 선택됩니다.
 */
export function pickAiMove(board, aiPlayer, humanPlayer) {
  let best = null
  let bestScore = -Infinity

  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      if (board[r][c] !== EMPTY) continue
      const offense = evaluateCellFor(board, r, c, aiPlayer)
      const defense = evaluateCellFor(board, r, c, humanPlayer)
      const score = offense + defense * 0.9 + Math.random() * 0.5
      if (score > bestScore) {
        bestScore = score
        best = [r, c]
      }
    }
  }

  return best
}
