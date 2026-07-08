const STORAGE_KEY = 'mse-minesweeper-records'

function readAll() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {}
  } catch {
    return {}
  }
}

export function getBestTime(difficulty) {
  const all = readAll()
  return all[difficulty] ?? null
}

export function saveBestTimeIfBetter(difficulty, seconds) {
  const all = readAll()
  const current = all[difficulty]
  if (current == null || seconds < current) {
    all[difficulty] = seconds
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all))
    return seconds
  }
  return current
}
