import { Link } from "react-router-dom";
import type { GameModule } from "../types/game";
import "./GameCard.css";

export function GameCard({ id, title, description, icon, accentVar, inProgress }: GameModule) {
  return (
    <Link to={`/${id}`} className="game-card" style={{ ["--card-accent" as string]: `var(${accentVar})` }}>
      <div className="game-card__label">
        <span className="game-card__icon" aria-hidden>
          {icon}
        </span>
        {inProgress && <span className="game-card__badge">준비 중</span>}
      </div>
      <h3 className="game-card__title">{title}</h3>
      <p className="game-card__desc">{description}</p>
      <span className="game-card__cta">플레이 →</span>
    </Link>
  );
}
