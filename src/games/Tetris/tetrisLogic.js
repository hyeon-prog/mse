export const ROWS = 20
export const COLS = 10

export const SHAPES = {
  I: { color: '#4dd0e1', matrix: [[0,0,0,0],[1,1,1,1],[0,0,0,0],[0,0,0,0]] },
  O: { color: '#ffe066', matrix: [[1,1],[1,1]] },
  T: { color: '#c084fc', matrix: [[0,1,0],[1,1,1],[0,0,0]] },
  S: { color: '#69db7c', matrix: [[0,1,1],[1,1,0],[0,0,0]] },
  Z: { color: '#ff8787', matrix: [[1,1,0],[0,1,1],[0,0,0]] },
  J: { color: '#4dabf7', matrix: [[1,0,0],[1,1,1],[0,0,0]] },
  L: { color: '#ffa94d', matrix: [[0,0,1],[1,1,1],[0,0,0]] },
}

const TYPES = Object.keys(SHAPES)

export function randomType() {
  return TYPES[Math.floor(Math.random() * TYPES.length)]
}

export function createEmptyBoard() {
  return Array.from({ length: ROWS }, () => Array(COLS).fill(null))
}

export function rotateMatrix(matrix) {
  return matrix[0].map((_, i) => matrix.map((row) => row[i]).reverse())
}

export function spawnPiece(type) {
  const { matrix } = SHAPES[type]
  const col = Math.floor((COLS - matrix[0].length) / 2)
  return { type, matrix, row: 0, col }
}

export function hasCollision(board, piece, rowOffset = 0, colOffset = 0, matrix = piece.matrix) {
  for (let r = 0; r < matrix.length; r++) {
    for (let c = 0; c < matrix[r].length; c++) {
      if (!matrix[r][c]) continue
      const boardRow = piece.row + r + rowOffset
      const boardCol = piece.col + c + colOffset
      if (boardCol < 0 || boardCol >= COLS || boardRow >= ROWS) return true
      if (boardRow >= 0 && board[boardRow][boardCol]) return true
    }
  }
  return false
}

export function mergePiece(board, piece) {
  const next = board.map((row) => [...row])
  const color = SHAPES[piece.type].color
  piece.matrix.forEach((row, r) => {
    row.forEach((val, c) => {
      if (!val) return
      const boardRow = piece.row + r
      const boardCol = piece.col + c
      if (boardRow >= 0) next[boardRow][boardCol] = color
    })
  })
  return next
}

export function clearLines(board) {
  const remaining = board.filter((row) => row.some((cell) => !cell))
  const cleared = ROWS - remaining.length
  const newRows = Array.from({ length: cleared }, () => Array(COLS).fill(null))
  return { board: [...newRows, ...remaining], cleared }
}

const LINE_SCORES = [0, 100, 300, 500, 800]

export function scoreForLines(cleared, level) {
  return (LINE_SCORES[cleared] || 0) * level
}
