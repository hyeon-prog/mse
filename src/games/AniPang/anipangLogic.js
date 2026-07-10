export const ROWS = 8
export const COLS = 8
export const TYPES = ['🐶', '🐱', '🐰', '🐻', '🐼', '🦊']
export const GAME_DURATION = 60

function randomType(exclude = []) {
  const options = TYPES.filter((t) => !exclude.includes(t))
  return options[Math.floor(Math.random() * options.length)]
}

export function createBoard() {
  const board = Array.from({ length: ROWS }, () => Array(COLS).fill(null))
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const exclude = []
      if (c >= 2 && board[r][c - 1] === board[r][c - 2]) exclude.push(board[r][c - 1])
      if (r >= 2 && board[r - 1][c] === board[r - 2][c]) exclude.push(board[r - 1][c])
      board[r][c] = randomType(exclude)
    }
  }
  return board
}

export function isAdjacent(a, b) {
  return Math.abs(a.r - b.r) + Math.abs(a.c - b.c) === 1
}

export function swapCells(board, r1, c1, r2, c2) {
  const next = board.map((row) => [...row])
  const temp = next[r1][c1]
  next[r1][c1] = next[r2][c2]
  next[r2][c2] = temp
  return next
}

export function findMatches(board) {
  const matched = new Set()

  for (let r = 0; r < ROWS; r++) {
    let runLength = 1
    for (let c = 1; c <= COLS; c++) {
      const same = c < COLS && board[r][c] !== null && board[r][c] === board[r][c - 1]
      if (same) {
        runLength++
      } else {
        if (runLength >= 3) {
          for (let k = c - runLength; k < c; k++) matched.add(`${r},${k}`)
        }
        runLength = 1
      }
    }
  }

  for (let c = 0; c < COLS; c++) {
    let runLength = 1
    for (let r = 1; r <= ROWS; r++) {
      const same = r < ROWS && board[r][c] !== null && board[r][c] === board[r - 1][c]
      if (same) {
        runLength++
      } else {
        if (runLength >= 3) {
          for (let k = r - runLength; k < r; k++) matched.add(`${k},${c}`)
        }
        runLength = 1
      }
    }
  }

  return matched
}

export function clearMatches(board, matched) {
  const next = board.map((row) => [...row])
  matched.forEach((key) => {
    const [r, c] = key.split(',').map(Number)
    next[r][c] = null
  })
  return next
}

export function collapse(board) {
  const next = Array.from({ length: ROWS }, () => Array(COLS).fill(null))
  for (let c = 0; c < COLS; c++) {
    const stack = []
    for (let r = ROWS - 1; r >= 0; r--) {
      if (board[r][c] !== null) stack.push(board[r][c])
    }
    for (let r = ROWS - 1; r >= 0; r--) {
      next[r][c] = stack.shift() ?? randomType()
    }
  }
  return next
}

/**
 * collapse()와 같은 중력 규칙으로 다음 보드를 계산하되, 각 칸이 몇 줄을
 * 내려왔는지(fallDistances)도 함께 반환한다 - 낙하 애니메이션의 시작 오프셋으로 쓰인다.
 * 기존 타일은 실제로 이동한 줄 수만큼, 새로 채워진 타일은 그 칸 위쪽에서 한 줄씩
 * 이어져 내려오는 것처럼 보이도록 해당 칸에 필요한 새 타일 개수만큼을 낙하 거리로 준다.
 */
export function collapseWithFall(board) {
  const next = Array.from({ length: ROWS }, () => Array(COLS).fill(null))
  const fallDistances = {}
  for (let c = 0; c < COLS; c++) {
    const survivorRows = []
    for (let r = 0; r < ROWS; r++) {
      if (board[r][c] !== null) survivorRows.push(r)
    }
    const survivorCount = survivorRows.length
    for (let i = 0; i < survivorCount; i++) {
      const newRow = ROWS - survivorCount + i
      next[newRow][c] = board[survivorRows[i]][c]
      const dist = newRow - survivorRows[i]
      if (dist > 0) fallDistances[`${newRow}-${c}`] = dist
    }
    const newCount = ROWS - survivorCount
    for (let j = 0; j < newCount; j++) {
      next[j][c] = randomType()
      fallDistances[`${j}-${c}`] = newCount
    }
  }
  return { board: next, fallDistances }
}

export function wouldMatch(board, r1, c1, r2, c2) {
  return findMatches(swapCells(board, r1, c1, r2, c2)).size > 0
}

export function resolveCascades(board) {
  let current = board
  let score = 0
  let combo = 0
  while (true) {
    const matched = findMatches(current)
    if (matched.size === 0) break
    combo++
    score += matched.size * 10 * combo
    current = collapse(clearMatches(current, matched))
  }
  return { board: current, score, combo }
}
