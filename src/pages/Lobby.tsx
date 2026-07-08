import { games } from "../gameRegistry";
import { GameCard } from "../components/GameCard";
import "./Lobby.css";

export function Lobby() {
  return (
    <div className="lobby">
      <header className="lobby__header">
        <p className="lobby__eyebrow mono">MINI GAME ARCADE</p>
        <h1 className="lobby__title">선반 위의 게임을 골라보세요</h1>
        <p className="lobby__subtitle">2048 · 사과게임 · 테트리스</p>
      </header>

      <div className="lobby__shelf">
        {games.map((game) => (
          <GameCard key={game.id} {...game} />
        ))}
      </div>
    </div>
  );
}
