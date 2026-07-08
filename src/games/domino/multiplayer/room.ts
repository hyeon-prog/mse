import {
  get,
  limitToLast,
  onValue,
  orderByChild,
  query,
  ref,
  runTransaction,
  set,
  update,
} from "firebase/database";
import { ensureSignedIn, getFirebaseDb } from "./firebase";
import { createDeck, shuffle } from "../engine/deck";
import {
  applyPublicDrawMany,
  applyPublicPass,
  applyPublicPlay,
  createPublicMatch,
  startNextPublicRound,
  type PublicMatchState,
} from "../engine/publicMatch";
import type { MatchMode, Move, PlayerId, Tile } from "../engine/types";
import type { LeaderboardEntry, RoomPlayer, RoomState } from "./types";

const ROOM_CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const MAX_PLAYERS = 4;
const HAND_SIZE = 7;

export class RoomError extends Error {
  code: "not-found" | "full" | "already-started";

  constructor(code: "not-found" | "full" | "already-started", message: string) {
    super(message);
    this.code = code;
  }
}

function generateRoomCode(): string {
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += ROOM_CODE_CHARS[Math.floor(Math.random() * ROOM_CODE_CHARS.length)];
  }
  return code;
}

function seatedPlayerOrder(players: Record<string, RoomPlayer>): PlayerId[] {
  return Object.entries(players)
    .sort((a, b) => a[1].seat - b[1].seat)
    .map(([uid]) => uid);
}

function dealFreshHands(playerOrder: PlayerId[]): { hands: Record<PlayerId, Tile[]>; boneyard: Tile[] } {
  const shuffled = shuffle(createDeck());
  const hands: Record<PlayerId, Tile[]> = {};
  let offset = 0;
  for (const id of playerOrder) {
    hands[id] = shuffled.slice(offset, offset + HAND_SIZE);
    offset += HAND_SIZE;
  }
  return { hands, boneyard: shuffled.slice(offset) };
}

export async function createRoom(nickname: string, mode: MatchMode, targetScore: number): Promise<string> {
  const uid = await ensureSignedIn();
  const db = getFirebaseDb();

  for (let attempt = 0; attempt < 5; attempt++) {
    const roomId = generateRoomCode();
    const roomRef = ref(db, `rooms/${roomId}`);
    const existing = await get(roomRef);
    if (existing.exists()) continue;

    const room: RoomState = {
      hostId: uid,
      mode,
      targetScore,
      players: { [uid]: { nickname, seat: 0 } },
      public: null,
    };
    await set(roomRef, room);
    return roomId;
  }
  throw new Error("방 코드를 생성하지 못했습니다. 다시 시도해주세요.");
}

export async function joinRoom(roomId: string, nickname: string): Promise<void> {
  const uid = await ensureSignedIn();
  const db = getFirebaseDb();
  const roomSnapshot = await get(ref(db, `rooms/${roomId}`));
  if (!roomSnapshot.exists()) throw new RoomError("not-found", "존재하지 않는 방입니다.");

  const room = roomSnapshot.val() as RoomState;
  if (room.public) throw new RoomError("already-started", "이미 시작된 방입니다.");
  if (room.players[uid]) return;

  const result = await runTransaction(
    ref(db, `rooms/${roomId}/players`),
    (players: Record<string, RoomPlayer> | null) => {
      const current = players ?? {};
      if (current[uid]) return current;
      const takenSeats = new Set(Object.values(current).map((p) => p.seat));
      if (takenSeats.size >= MAX_PLAYERS) return undefined;
      let seat = 0;
      while (takenSeats.has(seat)) seat++;
      return { ...current, [uid]: { nickname, seat } };
    }
  );

  if (!result.committed) throw new RoomError("full", "방이 가득 찼습니다.");
}

export function subscribeRoom(roomId: string, onChange: (room: RoomState | null) => void): () => void {
  const db = getFirebaseDb();
  return onValue(ref(db, `rooms/${roomId}`), (snapshot) => {
    onChange(snapshot.exists() ? (snapshot.val() as RoomState) : null);
  });
}

export function subscribeOwnHand(roomId: string, uid: string, onChange: (hand: Tile[]) => void): () => void {
  const db = getFirebaseDb();
  return onValue(ref(db, `rooms/${roomId}/hands/${uid}`), (snapshot) => {
    onChange((snapshot.val() as Tile[] | null) ?? []);
  });
}

export async function startGame(roomId: string): Promise<void> {
  const db = getFirebaseDb();
  const snapshot = await get(ref(db, `rooms/${roomId}`));
  if (!snapshot.exists()) return;
  const room = snapshot.val() as RoomState;
  const playerOrder = seatedPlayerOrder(room.players);
  const { hands, boneyard } = dealFreshHands(playerOrder);
  const starter = playerOrder[Math.floor(Math.random() * playerOrder.length)];
  const publicState = createPublicMatch(room.mode, room.targetScore, playerOrder, hands, boneyard, starter);

  const updates: Record<string, unknown> = { [`rooms/${roomId}/public`]: publicState };
  for (const id of playerOrder) {
    updates[`rooms/${roomId}/hands/${id}`] = hands[id];
  }
  await update(ref(db), updates);
}

export async function startNextRoundOnline(roomId: string): Promise<void> {
  const db = getFirebaseDb();
  const snapshot = await get(ref(db, `rooms/${roomId}`));
  if (!snapshot.exists()) return;
  const room = snapshot.val() as RoomState;
  if (!room.public) return;
  const playerOrder = room.public.playerOrder;
  const { hands, boneyard } = dealFreshHands(playerOrder);
  const publicState = startNextPublicRound(room.public, hands, boneyard);

  const updates: Record<string, unknown> = { [`rooms/${roomId}/public`]: publicState };
  for (const id of playerOrder) {
    updates[`rooms/${roomId}/hands/${id}`] = hands[id];
  }
  await update(ref(db), updates);
}

async function sendPublicUpdate(
  roomId: string,
  uid: string,
  updater: (state: PublicMatchState) => PublicMatchState | undefined
): Promise<boolean> {
  const db = getFirebaseDb();
  const result = await runTransaction(ref(db, `rooms/${roomId}/public`), (current: PublicMatchState | null) => {
    if (!current || current.currentTurn !== uid) return undefined;
    return updater(current);
  });
  return result.committed;
}

export function sendPlay(roomId: string, uid: string, move: Move): Promise<boolean> {
  return sendPublicUpdate(roomId, uid, (state) => applyPublicPlay(state, move));
}

export function sendDraw(roomId: string, uid: string, drawnTiles: Tile[]): Promise<boolean> {
  return sendPublicUpdate(roomId, uid, (state) => applyPublicDrawMany(state, drawnTiles));
}

export function sendPass(roomId: string, uid: string): Promise<boolean> {
  return sendPublicUpdate(roomId, uid, (state) => applyPublicPass(state));
}

export async function appendOwnHand(roomId: string, uid: string, drawnTiles: Tile[]): Promise<void> {
  if (drawnTiles.length === 0) return;
  const db = getFirebaseDb();
  const handRef = ref(db, `rooms/${roomId}/hands/${uid}`);
  const snapshot = await get(handRef);
  const currentHand = (snapshot.val() as Tile[] | null) ?? [];
  await set(handRef, [...currentHand, ...drawnTiles]);
}

export async function removeOwnTile(roomId: string, uid: string, tile: Tile): Promise<void> {
  const db = getFirebaseDb();
  const handRef = ref(db, `rooms/${roomId}/hands/${uid}`);
  const snapshot = await get(handRef);
  const currentHand = (snapshot.val() as Tile[] | null) ?? [];
  const index = currentHand.findIndex((t) => t.a === tile.a && t.b === tile.b);
  if (index === -1) return;
  await set(handRef, [...currentHand.slice(0, index), ...currentHand.slice(index + 1)]);
}

export async function submitLeaderboardScore(uid: string, nickname: string, score: number): Promise<void> {
  const db = getFirebaseDb();
  const entryRef = ref(db, `leaderboard/domino/${uid}`);
  const snapshot = await get(entryRef);
  const existing = snapshot.val() as LeaderboardEntry | null;
  if (existing && existing.bestScore >= score) return;
  await set(entryRef, { nickname, bestScore: score, updatedAt: Date.now() });
}

export function subscribeLeaderboard(
  onChange: (entries: (LeaderboardEntry & { uid: string })[]) => void
): () => void {
  const db = getFirebaseDb();
  const leaderboardQuery = query(ref(db, "leaderboard/domino"), orderByChild("bestScore"), limitToLast(20));
  return onValue(leaderboardQuery, (snapshot) => {
    const entries: (LeaderboardEntry & { uid: string })[] = [];
    snapshot.forEach((child) => {
      entries.push({ uid: child.key as string, ...(child.val() as LeaderboardEntry) });
      return false;
    });
    entries.reverse();
    onChange(entries);
  });
}
