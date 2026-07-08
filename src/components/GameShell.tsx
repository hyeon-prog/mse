import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import "./GameShell.css";

interface GameShellProps {
  title: string;
  accentVar: `--accent-${string}`;
  score: number;
  highScore: number;
  /** 조작법 한 줄 안내. 예: "방향키로 타일을 밀어보세요" */
  controlsHint?: string;
  /** 실제 게임 보드/캔버스 */
  children: ReactNode;
}

/**
 * 모든 게임 화면이 공유하는 뼈대.
 * 담당자는 이 컴포넌트를 그대로 감싸서 쓰고, `children`에 자기 게임의
 * 보드 UI만 채워 넣으면 헤더·점수판·뒤로가기·색상 테마가 자동으로 맞춰집니다.
 */
export function GameShell({ title, accentVar, score, highScore, controlsHint, children }: GameShellProps) {
  return (
    <div className="game-shell" style={{ ["--shell-accent" as string]: `var(${accentVar})` }}>
      <header className="game-shell__header">
        <Link to="/" className="game-shell__back" aria-label="로비로 돌아가기">
          ← 로비
        </Link>
        <h1 className="game-shell__title">{title}</h1>
        <div className="game-shell__scores mono">
          <div>
            <span className="game-shell__score-label">SCORE</span>
            <span className="game-shell__score-value">{score}</span>
          </div>
          <div>
            <span className="game-shell__score-label">BEST</span>
            <span className="game-shell__score-value">{highScore}</span>
          </div>
        </div>
      </header>

      <main className="game-shell__stage">{children}</main>

      {controlsHint && <p className="game-shell__hint">{controlsHint}</p>}
    </div>
  );
}
