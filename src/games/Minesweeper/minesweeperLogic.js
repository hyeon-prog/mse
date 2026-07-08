export const DIFFICULTIES = {
  easy: { label: '초급', rows: 9, cols: 9, mines: 10 },
  medium: { label: '중급', rows: 16, cols: 16, mines: 40 },
  hard: { label: '고급', rows: 16, cols: 30, mines: 99 },
}

function createEmptyBoard(rows, cols) {
  return Array.from({ length: rows }, () =>
    Array.from({ length: cols }, () => ({
      mine: false,
      adjacent: 0,
      revealed: false,
      flagged: false,
    })),
  )
}

function forEachNeighbor(rows, cols, r, c, fn) {
  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      if (dr === 0 && dc === 0) continue
      const nr = r + dr
      const nc = c + dc
      if (nr >= 0 && nr < rows && nc >= 0 && nc < cols) fn(nr, nc)
    }
  }
}

export function createBoard(rows, cols, mineCount, safeR, safeC) {
  const board = createEmptyBoard(rows, cols)
  const forbidden = new Set([`${safeR},${safeC}`])
  forEachNeighbor(rows, cols, safeR, safeC, (nr, nc) => forbidden.add(`${nr},${nc}`))

  let placed = 0
  while (placed < mineCount) {
    const r = Math.floor(Math.random() * rows)
    const c = Math.floor(Math.random() * cols)
    if (forbidden.has(`${r},${c}`) || board[r][c].mine) continue
    board[r][c].mine = true
    placed++
  }

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (board[r][c].mine) continue
      let count = 0
      forEachNeighbor(rows, cols, r, c, (nr, nc) => {
        if (board[nr][nc].mine) count++
      })
      board[r][c].adjacent = count
    }
  }

  return board
}

export function revealCell(board, r, c) {
  const rows = board.length
  const cols = board[0].length
  const next = board.map((row) => row.map((cell) => ({ ...cell })))

  const stack = [[r, c]]
  while (stack.length > 0) {
    const [cr, cc] = stack.pop()
    const cell = next[cr][cc]
    if (cell.revealed || cell.flagged) continue
    cell.revealed = true
    if (!cell.mine && cell.adjacent === 0) {
      forEachNeighbor(rows, cols, cr, cc, (nr, nc) => {
        if (!next[nr][nc].revealed && !next[nr][nc].flagged) stack.push([nr, nc])
      })
    }
  }

  return next
}

export function toggleFlag(board, r, c) {
  const next = board.map((row) => row.map((cell) => ({ ...cell })))
  const cell = next[r][c]
  if (!cell.revealed) cell.flagged = !cell.flagged
  return next
}

export function revealAllMines(board) {
  return board.map((row) =>
    row.map((cell) => (cell.mine ? { ...cell, revealed: true } : cell)),
  )
}

export function checkWin(board) {
  return board.every((row) => row.every((cell) => cell.mine || cell.revealed))
}

export function countFlags(board) {
  let count = 0
  board.forEach((row) => row.forEach((cell) => { if (cell.flagged) count++ }))
  return count
}
