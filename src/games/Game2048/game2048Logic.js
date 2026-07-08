export const SIZE = 4

export function createEmptyGrid() {
  return Array.from({ length: SIZE }, () => Array(SIZE).fill(0))
}

export function addRandomTile(grid) {
  const empty = []
  grid.forEach((row, r) =>
    row.forEach((val, c) => {
      if (val === 0) empty.push([r, c])
    }),
  )
  if (empty.length === 0) return grid
  const [r, c] = empty[Math.floor(Math.random() * empty.length)]
  const next = grid.map((row) => [...row])
  next[r][c] = Math.random() < 0.9 ? 2 : 4
  return next
}

function slideRowLeft(row) {
  const values = row.filter((v) => v !== 0)
  let gained = 0
  const merged = []
  for (let i = 0; i < values.length; i++) {
    if (values[i] === values[i + 1]) {
      const mergedValue = values[i] * 2
      merged.push(mergedValue)
      gained += mergedValue
      i++
    } else {
      merged.push(values[i])
    }
  }
  while (merged.length < row.length) merged.push(0)
  return { row: merged, gained }
}

function transpose(grid) {
  return grid[0].map((_, c) => grid.map((row) => row[c]))
}

function reverseRows(grid) {
  return grid.map((row) => [...row].reverse())
}

export function move(grid, direction) {
  let working = grid.map((row) => [...row])
  let gained = 0

  if (direction === 'up' || direction === 'down') {
    working = transpose(working)
  }
  if (direction === 'right' || direction === 'down') {
    working = reverseRows(working)
  }

  working = working.map((row) => {
    const { row: newRow, gained: rowGained } = slideRowLeft(row)
    gained += rowGained
    return newRow
  })

  if (direction === 'right' || direction === 'down') {
    working = reverseRows(working)
  }
  if (direction === 'up' || direction === 'down') {
    working = transpose(working)
  }

  const changed = working.some((row, r) => row.some((val, c) => val !== grid[r][c]))
  return { grid: working, gained, changed }
}

export function canMove(grid) {
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      if (grid[r][c] === 0) return true
      if (c < SIZE - 1 && grid[r][c] === grid[r][c + 1]) return true
      if (r < SIZE - 1 && grid[r][c] === grid[r + 1][c]) return true
    }
  }
  return false
}
