import { useParams, Link, Navigate } from 'react-router-dom'
import { getGameById } from '../games/gameConfig.js'

export default function GamePage() {
  const { gameId } = useParams()
  const game = getGameById(gameId)

  if (!game) {
    return <Navigate to="/games" replace />
  }

  const GameComponent = game.component

  return (
    <section className="game-page">
      <div className="game-page-header">
        <h1>
          {game.icon} {game.name}
        </h1>
        <Link to="/games" className="game-page-back">
          ← 목록으로
        </Link>
      </div>
      <GameComponent />
    </section>
  )
}
