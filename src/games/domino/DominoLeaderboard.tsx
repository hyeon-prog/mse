import { useEffect, useState } from "react";
import { subscribeLeaderboard } from "./multiplayer/room";
import type { LeaderboardEntry } from "./multiplayer/types";
import "./DominoLobby.css";
import "./DominoLeaderboard.css";

type Entry = LeaderboardEntry & { uid: string };

export function DominoLeaderboard({ onBack }: { onBack: () => void }) {
  const [entries, setEntries] = useState<Entry[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    try {
      return subscribeLeaderboard(setEntries);
    } catch {
      setError("랭킹을 불러오지 못했습니다.");
      return undefined;
    }
  }, []);

  return (
    <div className="domino-leaderboard">
      <h2>온라인 랭킹</h2>
      {error && <p className="domino-leaderboard__error">{error}</p>}
      {!error && entries === null && <p className="domino-leaderboard__loading">불러오는 중...</p>}
      {!error && entries !== null && entries.length === 0 && (
        <p className="domino-leaderboard__empty">아직 기록이 없습니다. 온라인 매치를 플레이해보세요!</p>
      )}
      {entries && entries.length > 0 && (
        <ol className="domino-leaderboard__list">
          {entries.map((entry, i) => (
            <li key={entry.uid}>
              <span className="domino-leaderboard__rank">{i + 1}</span>
              <span className="domino-leaderboard__name">{entry.nickname}</span>
              <span className="domino-leaderboard__score">{entry.bestScore}</span>
            </li>
          ))}
        </ol>
      )}
      <button className="domino-lobby__leave" onClick={onBack}>
        ← 뒤로
      </button>
    </div>
  );
}
