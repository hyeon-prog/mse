import { Link } from 'react-router-dom'
import { games } from '../games/gameConfig.js'
import Button from '../components/Button.jsx'

export default function Lobby() {
  return (
    <section className="lobby">
      <h1>AltTab에 오신 것을 환영합니다</h1>
      <p className="lobby-subtitle">
        가볍게 즐기는 미니게임 모음. 게임을 즐기고 랭킹에 도전해보세요!
      </p>
      <div className="lobby-actions">
        <Link to="/games">
          <Button>게임 목록 보기</Button>
        </Link>
        <Link to="/leaderboard">
          <Button variant="secondary">랭킹 보기</Button>
        </Link>
      </div>

      <div className="lobby-preview">
        {games.map((game) => (
          <Link key={game.id} to={`/games/${game.id}`} className="lobby-card">
            <span className="lobby-card-screen">
              <span className="lobby-card-icon">{game.icon}</span>
            </span>
            <span className="lobby-card-name">{game.name}</span>
          </Link>
        ))}
      </div>
    </section>
  )
}
