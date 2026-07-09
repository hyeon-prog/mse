import { Link } from 'react-router-dom'
import { games } from '../games/gameConfig.js'

export default function GameList() {
  return (
    <section className="game-list">
      <h1>게임 목록</h1>
      <div className="game-grid">
        {games.map((game) => (
          <Link key={game.id} to={`/games/${game.id}`} className="game-card">
            <span className="game-card-screen">
              <span className="game-card-icon">{game.icon}</span>
            </span>
            <h2>{game.name}</h2>
            <p>{game.description}</p>
          </Link>
        ))}
      </div>
    </section>
  )
}
