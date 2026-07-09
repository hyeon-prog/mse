import {
  addDoc,
  collection,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  Timestamp,
  where,
} from 'firebase/firestore'
import { db } from '../firebase.js'
import { getSelectedUniversity } from './university.js'

const scoresRef = collection(db, 'scores')

export const PERIODS = ['daily', 'weekly', 'monthly', 'all']

function getPeriodStart(period) {
  const now = new Date()
  if (period === 'daily') {
    return new Date(now.getFullYear(), now.getMonth(), now.getDate())
  }
  if (period === 'weekly') {
    const mondayOffset = (now.getDay() + 6) % 7
    return new Date(now.getFullYear(), now.getMonth(), now.getDate() - mondayOffset)
  }
  if (period === 'monthly') {
    return new Date(now.getFullYear(), now.getMonth(), 1)
  }
  return null
}

// 랭킹은 학교 구분 없이 전체 공개로 보여주고, 각 기록에 붙은 university 필드로 소속만 표시한다.
export function subscribeScores(gameId, period, onUpdate, onError, { sortDirection = 'desc' } = {}) {
  const startDate = getPeriodStart(period)
  const filters = [where('gameId', '==', gameId)]
  const q = startDate
    ? query(scoresRef, ...filters, where('createdAt', '>=', Timestamp.fromDate(startDate)), orderBy('createdAt', 'desc'), limit(200))
    : query(scoresRef, ...filters, orderBy('score', sortDirection), limit(10))

  return onSnapshot(
    q,
    (snapshot) => {
      let scores = snapshot.docs.map((doc) => doc.data())
      if (startDate) {
        scores = scores
          .sort((a, b) => (sortDirection === 'asc' ? a.score - b.score : b.score - a.score))
          .slice(0, 10)
      }
      onUpdate(scores)
    },
    (error) => {
      console.error('leaderboard subscription failed', error)
      onError?.(error)
    },
  )
}

export async function addScore(gameId, name, score) {
  const university = getSelectedUniversity()
  await addDoc(scoresRef, {
    gameId,
    name: (name || '익명').slice(0, 12),
    score,
    createdAt: serverTimestamp(),
    ...(university ? { university } : {}),
  })
}
