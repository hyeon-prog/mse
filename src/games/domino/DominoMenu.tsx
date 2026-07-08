import { useState, type CSSProperties } from "react";
import type { MatchMode } from "./engine/types";
import "./DominoMenu.css";

interface DominoMenuProps {
  onStart: (mode: MatchMode, targetScore: number) => void;
}

const DEFAULT_TARGET_SCORE = 100;
const WING_FEATHER_COUNT = 6;

function featherStyle(index: number): CSSProperties {
  return { "--feather-index": index } as CSSProperties;
}

export function DominoMenu({ onStart }: DominoMenuProps) {
  const [mode, setMode] = useState<MatchMode>("target-score");
  const [targetScore, setTargetScore] = useState(DEFAULT_TARGET_SCORE);

  return (
    <div className="domino-menu">
      <div className="domino-menu__panel">
        <span className="domino-menu__corner domino-menu__corner--left" aria-hidden="true">
          ☥
        </span>
        <span className="domino-menu__corner domino-menu__corner--right" aria-hidden="true">
          ☥
        </span>

        <p className="domino-menu__eyebrow">MINI GAME ARCADE · DOMINO</p>
        <h1 className="domino-menu__title">도미노</h1>
        <div className="domino-menu__rule" aria-hidden="true" />

        <div className="domino-menu__winged-disk" aria-hidden="true">
          <div className="domino-menu__wing domino-menu__wing--left">
            {Array.from({ length: WING_FEATHER_COUNT }, (_, i) => (
              <span key={i} style={featherStyle(i)} />
            ))}
          </div>
          <div className="domino-menu__sun" />
          <div className="domino-menu__wing domino-menu__wing--right">
            {Array.from({ length: WING_FEATHER_COUNT }, (_, i) => (
              <span key={i} style={featherStyle(i)} />
            ))}
          </div>
        </div>

        <p className="domino-menu__subtitle">
          이집트 카페에서 즐기던 표준 블록 도미노(더블식스), AI와 1:1로 대결하세요
        </p>

        <div className="domino-menu__field">
          <span className="domino-menu__label">종료 방식</span>
          <div className="domino-menu__options">
            <label
              className={
                mode === "single-round"
                  ? "domino-menu__option domino-menu__option--active"
                  : "domino-menu__option"
              }
            >
              <input
                type="radio"
                name="mode"
                value="single-round"
                checked={mode === "single-round"}
                onChange={() => setMode("single-round")}
              />
              단판
            </label>
            <label
              className={
                mode === "target-score"
                  ? "domino-menu__option domino-menu__option--active"
                  : "domino-menu__option"
              }
            >
              <input
                type="radio"
                name="mode"
                value="target-score"
                checked={mode === "target-score"}
                onChange={() => setMode("target-score")}
              />
              목표점수
            </label>
          </div>
        </div>

        {mode === "target-score" && (
          <label className="domino-menu__field">
            <span className="domino-menu__label">목표 점수</span>
            <input
              type="number"
              min={10}
              step={10}
              value={targetScore}
              onChange={(e) => setTargetScore(Math.max(10, Number(e.target.value) || DEFAULT_TARGET_SCORE))}
              className="domino-menu__number"
            />
          </label>
        )}

        <button className="domino-menu__start" onClick={() => onStart(mode, targetScore)}>
          <span aria-hidden="true">☥</span> 게임 시작 <span aria-hidden="true">☥</span>
        </button>

        <div className="domino-menu__frieze" aria-hidden="true">
          {Array.from({ length: 9 }, (_, i) => (
            <span key={i} />
          ))}
        </div>
      </div>
    </div>
  );
}
