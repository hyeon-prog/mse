export const LANES = 5
export const VISIBLE_ROWS = 8
const BASE_INTERVAL_MS = 700
const MIN_INTERVAL_MS = 200
const SPEEDUP_PER_ROW_MS = 15
const BLOCK_CHANCE = 0.5

function randomRow() {
  const blockedLanes = new Set()
  for (let lane = 0; lane < LANES; lane++) {
    if (Math.random() < BLOCK_CHANCE) blockedLanes.add(lane)
  }
  if (blockedLanes.size >= LANES) {
    blockedLanes.delete(Math.floor(Math.random() * LANES))
  }
  return { blockedLanes }
}

export function createInitialRows() {
  return Array.from({ length: VISIBLE_ROWS }, randomRow)
}

export function isBlocked(row, lane) {
  return row.blockedLanes.has(lane)
}

export function advance(rows) {
  return [...rows.slice(1), randomRow()]
}

export function tickIntervalMs(score) {
  return Math.max(MIN_INTERVAL_MS, BASE_INTERVAL_MS - score * SPEEDUP_PER_ROW_MS)
}

export function clampLane(lane) {
  return Math.max(0, Math.min(LANES - 1, lane))
}
