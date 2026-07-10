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
import { getSelectedUniversity, isSelectedUniversityVerified } from './university.js'

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

// 학교 필터 없이 넉넉히(최대 SUBSCRIBE_LIMIT개) 가져온 뒤, 화면(Leaderboard.jsx)에서
// "전체 랭킹" / "우리 학교" 범위와 상위 몇 등까지 보여줄지를 클라이언트에서 걸러낸다.
// university 필드로 서버 쿼리를 걸려면 Firestore 복합 인덱스가 새로 필요해지므로,
// 기존처럼 gameId(+기간)만으로 쿼리하고 나머지는 클라이언트에서 처리한다.
const SUBSCRIBE_LIMIT = 200

export function subscribeScores(gameId, period, onUpdate, onError, { sortDirection = 'desc' } = {}) {
  const startDate = getPeriodStart(period)
  const filters = [where('gameId', '==', gameId)]
  const q = startDate
    ? query(scoresRef, ...filters, where('createdAt', '>=', Timestamp.fromDate(startDate)), orderBy('createdAt', 'desc'), limit(SUBSCRIBE_LIMIT))
    : query(scoresRef, ...filters, orderBy('score', sortDirection), limit(SUBSCRIBE_LIMIT))

  return onSnapshot(
    q,
    (snapshot) => {
      let scores = snapshot.docs.map((doc) => doc.data())
      if (startDate) {
        scores = scores.sort((a, b) => (sortDirection === 'asc' ? a.score - b.score : b.score - a.score))
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
    ...(university ? { university, verified: isSelectedUniversityVerified() } : {}),
  })
}
