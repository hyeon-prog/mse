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

export function subscribeScores(gameId, period, onUpdate, onError) {
  const startDate = getPeriodStart(period)
  const q = startDate
    ? query(
        scoresRef,
        where('gameId', '==', gameId),
        where('createdAt', '>=', Timestamp.fromDate(startDate)),
        orderBy('createdAt', 'desc'),
        limit(200),
      )
    : query(scoresRef, where('gameId', '==', gameId), orderBy('score', 'desc'), limit(10))

  return onSnapshot(
    q,
    (snapshot) => {
      let scores = snapshot.docs.map((doc) => doc.data())
      if (startDate) {
        scores = scores.sort((a, b) => b.score - a.score).slice(0, 10)
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
  await addDoc(scoresRef, {
    gameId,
    name: (name || '익명').slice(0, 12),
    score,
    createdAt: serverTimestamp(),
  })
}
