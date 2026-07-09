import { getRecords } from "./records";
import "./DominoLobby.css";
import "./DominoLeaderboard.css";

export function DominoLeaderboard({ onBack }: { onBack: () => void }) {
  const records = getRecords();

  return (
    <div className="domino-leaderboard">
      <h2>온라인 전적 (이 기기)</h2>
      {records.length === 0 && (
        <p className="domino-leaderboard__empty">아직 기록이 없습니다. 온라인 매치를 플레이해보세요!</p>
      )}
      {records.length > 0 && (
        <ol className="domino-leaderboard__list">
          {records.map((record, i) => (
            <li key={`${record.date}-${i}`}>
              <span className="domino-leaderboard__rank">{i + 1}</span>
              <span className="domino-leaderboard__name">
                {record.nickname} {record.won ? "🏆" : ""}
              </span>
              <span className="domino-leaderboard__score">{record.score}</span>
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
