const STORAGE_KEY = 'mse-leaderboard'

function readAll() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {}
  } catch {
    return {}
  }
}

function writeAll(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
}

export function getScores(gameId) {
  const all = readAll()
  return (all[gameId] || []).sort((a, b) => b.score - a.score).slice(0, 10)
}

export function addScore(gameId, name, score) {
  const all = readAll()
  const list = all[gameId] || []
  list.push({ name: name || '익명', score, date: new Date().toISOString() })
  all[gameId] = list.sort((a, b) => b.score - a.score).slice(0, 10)
  writeAll(all)
  return all[gameId]
}
