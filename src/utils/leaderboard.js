import {
  addDoc,
  collection,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  where,
} from 'firebase/firestore'
import { db } from '../firebase.js'

const scoresRef = collection(db, 'scores')

export function subscribeScores(gameId, onUpdate, onError) {
  const q = query(scoresRef, where('gameId', '==', gameId), orderBy('score', 'desc'), limit(10))
  return onSnapshot(
    q,
    (snapshot) => {
      onUpdate(snapshot.docs.map((doc) => doc.data()))
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
