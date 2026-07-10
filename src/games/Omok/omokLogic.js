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

/**
 * 방금 놓은 돌(row,col)을 기준으로 4방향 중 승리 조건을 만족하는지 확인,
 * 이어진 좌표도 함께 반환합니다.
 * 흑(선공)은 렌주 룰에 따라 정확히 5개일 때만 승리 — 6개 이상(장목)은 승리로
 * 인정하지 않습니다(다른 방향에서 정확히 5를 만들었다면 그건 별개로 승리).
 * 백은 5개 이상이면 그대로 승리.
 */
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

    const isWinningLength = player === BLACK ? line.length === 5 : line.length >= 5
    if (isWinningLength) return { win: true, line }
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

/**
 * 렌주(連珠) 룰의 금수(禁手) 판정. 자유오목은 먼저 두는 흑이 압도적으로
 * 유리해서(이론상 필승) 이를 보정하려고 흑에게만 아래 세 가지를 금지한다.
 * 백에게는 적용되지 않는다.
 *  - 장목(overline): 6개 이상 이어짐 — 승리로도 인정 안 되고 두는 것 자체가 금지
 *  - 44(사사금지): 한 수로 동시에 4(한쪽이라도 열려서 다음 수에 5가 되는 4)를 두 곳 이상 만드는 수
 *  - 33(삼삼금지): 한 수로 동시에 열린 3(양끝이 다 열려 막지 않으면 열린 4가 되는 3)을 두 곳 이상 만드는 수
 * 단, 그 수 자체가 정확히 5개를 완성해 이기는 수라면 위 제한과 무관하게 항상 허용된다
 * (호출부에서 checkWin으로 먼저 승리 여부를 확인한 뒤 이 함수를 쓴다).
 * 대회급 렌주 심판이 다루는 모든 예외(금수로만 이뤄진 3 제외 등)까지는 아니지만
 * 캐주얼 플레이에는 충분한 수준의 표준 33/44/장목 판정이다.
 */
export function isForbiddenMove(board, row, col, player) {
  if (player !== BLACK) return false
  if (board[row][col] !== EMPTY) return false

  const lines = DIRECTIONS.map(([dr, dc]) => countLine(board, row, col, player, dr, dc))

  if (lines.some(({ count }) => count >= 6)) return true
  if (lines.filter(({ count, openEnds }) => count === 4 && openEnds >= 1).length >= 2) return true
  if (lines.filter(({ count, openEnds }) => count === 3 && openEnds === 2).length >= 2) return true
  return false
}

/** isForbiddenMove와 같은 판정 기준으로, 어떤 금수인지 이유를 알려준다(UI 안내용). */
export function forbiddenReason(board, row, col, player) {
  if (player !== BLACK || board[row][col] !== EMPTY) return null
  const lines = DIRECTIONS.map(([dr, dc]) => countLine(board, row, col, player, dr, dc))

  if (lines.some(({ count }) => count >= 6)) return 'overline'
  if (lines.filter(({ count, openEnds }) => count === 4 && openEnds >= 1).length >= 2) return 'double-four'
  if (lines.filter(({ count, openEnds }) => count === 3 && openEnds === 2).length >= 2) return 'double-three'
  return null
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
 * 위협 점수(evaluateCellFor 결과)가 클수록 "반드시 막아야 하는" 수에 가깝다.
 * 상대가 다음 수에 이기거나(열린4 이상) 그에 준하는 위협이면 거의 그대로 반영해서
 * 반드시 막지만, 그 정도가 아닌 애매한 위협(막힌 4, 보통 3 등)에는 덜 얽매이게 해서
 * CPU가 자기 공격(내 줄 만들기)을 우선하도록 한다 — 예전엔 방어 가중치가 0.9로 공격과
 * 거의 동률이라, 상대 돌 주변만 반응하며 자기 공격을 잘 못 만드는 "너무 수비적인" 느낌이 있었다.
 */
function defenseWeight(threatScore) {
  if (threatScore >= 6000) return 1 // 다음 수에 상대가 이기거나 거의 확실히 이기는 상황 — 반드시 막는다
  if (threatScore >= 1000) return 0.5 // 열린 3 등 강한 위협 — 신경 쓰되 내 공격과 저울질한다
  if (threatScore >= 100) return 0.25 // 약한 위협 — 크게 얽매이지 않는다
  return 0.12
}

/**
 * 간단한 휴리스틱 CPU: 모든 빈 칸에 대해 "내가 놓으면 얼마나 유리한지"(공격)와
 * "상대가 놓으면 얼마나 위협적인지"(방어)를 함께 채점해서 가장 높은 칸을 고릅니다.
 * 방어 점수는 위협 수준에 따라 가중치를 다르게 줘서(defenseWeight), 진짜 막아야
 * 하는 수는 여전히 최우선이지만 애매한 위협까지 다 받아주다 수비적으로만 흐르지
 * 않고 공격도 적극적으로 노리도록 균형을 맞췄다.
 */
export function pickAiMove(board, aiPlayer, humanPlayer) {
  let best = null
  let bestScore = -Infinity

  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      if (board[r][c] !== EMPTY) continue
      const offense = evaluateCellFor(board, r, c, aiPlayer)
      const defense = evaluateCellFor(board, r, c, humanPlayer)
      const score = offense + defense * defenseWeight(defense) + Math.random() * 0.5
      if (score > bestScore) {
        bestScore = score
        best = [r, c]
      }
    }
  }

  return best
}
