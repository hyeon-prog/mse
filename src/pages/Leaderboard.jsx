import { useState } from 'react'
import { games } from '../games/gameConfig.js'
import { getScores } from '../utils/leaderboard.js'

export default function Leaderboard() {
  const [activeGameId, setActiveGameId] = useState(games[0]?.id)
  const scores = getScores(activeGameId)

  return (
    <section className="leaderboard">
      <h1>랭킹</h1>
      <div className="leaderboard-tabs">
        {games.map((game) => (
          <button
            key={game.id}
            className={'leaderboard-tab' + (game.id === activeGameId ? ' active' : '')}
            onClick={() => setActiveGameId(game.id)}
          >
            {game.icon} {game.name}
          </button>
        ))}
      </div>

      {scores.length === 0 ? (
        <p className="leaderboard-empty">아직 기록이 없습니다. 게임을 플레이해서 첫 기록을 남겨보세요!</p>
      ) : (
        <ol className="leaderboard-list">
          {scores.map((entry, i) => (
            <li key={i} className="leaderboard-row">
              <span className="leaderboard-rank">{i + 1}</span>
              <span className="leaderboard-name">{entry.name}</span>
              <span className="leaderboard-score">{entry.score}</span>
            </li>
          ))}
        </ol>
      )}
    </section>
  )
}
