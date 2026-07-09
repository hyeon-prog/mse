import { addDoc, collection, getDocs, limit, orderBy, query, serverTimestamp, where } from 'firebase/firestore'
import { db } from '../firebase.js'

const STORAGE_KEY = 'mse-university'
const roomsRef = collection(db, 'rooms')

export function normalize(name) {
  return name.trim().toLowerCase()
}

export function getSelectedUniversity() {
  return localStorage.getItem(STORAGE_KEY) || null
}

export function setSelectedUniversity(name) {
  localStorage.setItem(STORAGE_KEY, name)
}

export function leaveUniversity() {
  localStorage.removeItem(STORAGE_KEY)
}

export async function searchRooms(prefixText) {
  const prefix = normalize(prefixText)
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
  const target = normalize(name)
  const q = query(roomsRef, where('normalizedName', '==', target), limit(1))
  const snapshot = await getDocs(q)
  return snapshot.empty ? null : snapshot.docs[0].data().name
}

export async function createRoom(name) {
  const trimmed = name.trim()
  const existing = await findExactRoom(trimmed)
  if (existing) return existing
  await addDoc(roomsRef, {
    name: trimmed,
    normalizedName: normalize(trimmed),
    createdAt: serverTimestamp(),
  })
  return trimmed
}
