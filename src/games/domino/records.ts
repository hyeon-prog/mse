/**
 * 온라인 매치 전적을 이 기기(localStorage)에 저장한다.
 * 서버가 전혀 없는 P2P 구조라 "전 세계 공용 순위표"는 불가능하고,
 * 대신 내 기기에서 플레이한 온라인 매치 기록을 순위 형태로 보여준다.
 */

const STORAGE_KEY = "mini-game-platform:domino:online-records";
const MAX_RECORDS = 20;

export interface DominoRecord {
  nickname: string;
  score: number;
  won: boolean;
  date: string;
}

export function getRecords(): DominoRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? (JSON.parse(raw) as DominoRecord[]) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function addRecord(record: DominoRecord): void {
  const records = [...getRecords(), record]
    .sort((a, b) => b.score - a.score)
    .slice(0, MAX_RECORDS);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
}
