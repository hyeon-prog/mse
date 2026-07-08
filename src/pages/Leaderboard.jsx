import { useEffect, useState } from 'react'
import { games } from '../games/gameConfig.js'
import { subscribeScores } from '../utils/leaderboard.js'

export default function Leaderboard() {
  const [activeGameId, setActiveGameId] = useState(games[0]?.id)
  const [scores, setScores] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    const unsubscribe = subscribeScores(activeGameId, (nextScores) => {
      setScores(nextScores)
      setLoading(false)
    })
    return unsubscribe
  }, [activeGameId])

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

      {loading ? (
        <p className="leaderboard-empty">불러오는 중...</p>
      ) : scores.length === 0 ? (
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
