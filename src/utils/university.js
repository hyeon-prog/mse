import { addDoc, collection, getDocs, limit, orderBy, query, serverTimestamp, where } from 'firebase/firestore'
import { db } from '../firebase.js'
import { canonicalizeUniversityName } from './universityCanonical.js'

const STORAGE_KEY = 'mse-university'
const VERIFIED_KEY = 'mse-university-verified'
const roomsRef = collection(db, 'rooms')

export function normalize(name) {
  return name.trim().toLowerCase()
}

export function getSelectedUniversity() {
  return localStorage.getItem(STORAGE_KEY) || null
}

/** verified=true는 학교 이메일 인증(emailVerification.js)을 통해 자동 배정된 경우에만 표시한다. */
export function setSelectedUniversity(name, verified = false) {
  localStorage.setItem(STORAGE_KEY, name)
  if (verified) {
    localStorage.setItem(VERIFIED_KEY, '1')
  } else {
    localStorage.removeItem(VERIFIED_KEY)
  }
}

export function isSelectedUniversityVerified() {
  return localStorage.getItem(VERIFIED_KEY) === '1'
}

export function leaveUniversity() {
  localStorage.removeItem(STORAGE_KEY)
  localStorage.removeItem(VERIFIED_KEY)
}

export async function searchRooms(prefixText) {
  // 검색어도 "서울대"/"국립서울대학교" 같은 별칭을 정식 명칭으로 바꿔서 찾는다 —
  // 그래야 이미 "서울대학교"로 등록된 방을 별칭으로 검색해도 찾아진다.
  const prefix = normalize(canonicalizeUniversityName(prefixText))
  if (!prefix) return []
  const q = query(
    roomsRef,
    orderBy('normalizedName'),
    where('normalizedName', '>=', prefix),
    where('normalizedName', '<', prefix + ''),
    limit(10),
  )
  const snapshot = await getDocs(q)
  return snapshot.docs.map((doc) => doc.data().name)
}

export async function findExactRoom(name) {
  const target = normalize(canonicalizeUniversityName(name))
  const q = query(roomsRef, where('normalizedName', '==', target), limit(1))
  const snapshot = await getDocs(q)
  return snapshot.empty ? null : snapshot.docs[0].data().name
}

export async function createRoom(name) {
  // 별칭(약칭/국립 접두어 등)으로 들어와도 항상 하나의 정식 명칭으로만 방이 생성되게 한다.
  const canonical = canonicalizeUniversityName(name)
  const existing = await findExactRoom(canonical)
  if (existing) return existing
  await addDoc(roomsRef, {
    name: canonical,
    normalizedName: normalize(canonical),
    createdAt: serverTimestamp(),
  })
  return canonical
}
