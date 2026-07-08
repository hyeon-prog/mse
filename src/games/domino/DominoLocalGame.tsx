import { useCallback, useEffect, useState } from "react";
import { GameShell } from "../../components/GameShell";
import { useHighScore } from "../../hooks/useHighScore";
import { DominoMenu } from "./DominoMenu";
import { DominoTile } from "./DominoTile";
import { canPlay, getValidMoves } from "./engine/board";
import { chooseAiMove, type AiDifficulty } from "./engine/ai";
import { HUMAN_ID, aiId, createMatch, passTurn, playMove, resolveDrawPhase, startNextRound } from "./engine/match";
import type { BoardEnd, MatchMode, MatchState, PlayerId, Tile } from "./engine/types";
import "./Domino.css";

const AI_MOVE_DELAY_MS = 500;

function playerLabel(id: PlayerId): string {
  if (id === HUMAN_ID) return "나";
  const [, n] = id.split("-");
  return `AI ${n}`;
}

export function DominoLocalGame({ onExit }: { onExit: () => void }) {
  const [match, setMatch] = useState<MatchState | null>(null);
  const [difficulty, setDifficulty] = useState<AiDifficulty>("medium");
  const [pendingTile, setPendingTile] = useState<Tile | null>(null);
  const [highScore, submitScore] = useHighScore("domino");

  const startMatch = useCallback(
    (mode: MatchMode, targetScore: number, playerCount: number, chosenDifficulty: AiDifficulty) => {
      const playerOrder: PlayerId[] = [
        HUMAN_ID,
        ...Array.from({ length: playerCount - 1 }, (_, i) => aiId(i + 1)),
      ];
      setDifficulty(chosenDifficulty);
      setMatch(createMatch(mode, targetScore, playerOrder));
      setPendingTile(null);
    },
    []
  );

  useEffect(() => {
    if (!match || match.status !== "playing") return;

    const drawn = resolveDrawPhase(match);
    if (drawn !== match) {
      setMatch(drawn);
      return;
    }

    if (!canPlay(match.hands[match.currentTurn], match.board)) {
      setMatch(passTurn(match));
      return;
    }

    if (match.currentTurn !== HUMAN_ID) {
      const timer = setTimeout(() => {
        setMatch((current) => {
          if (!current || current.status !== "playing" || current.currentTurn === HUMAN_ID) return current;
          const move = chooseAiMove(current.hands[current.currentTurn], current.board, difficulty);
          return move ? playMove(current, move) : current;
        });
      }, AI_MOVE_DELAY_MS);
      return () => clearTimeout(timer);
    }
  }, [match, difficulty]);

  useEffect(() => {
    if (match?.status === "match-over") {
      submitScore(match.scores[HUMAN_ID]);
    }
  }, [match?.status, match?.scores, submitScore]);

  const handleTileClick = useCallback(
    (tile: Tile) => {
      if (!match || match.status !== "playing" || match.currentTurn !== HUMAN_ID) return;
      const moves = getValidMoves(match.hands[HUMAN_ID], match.board).filter(
        (m) => m.tile.a === tile.a && m.tile.b === tile.b
      );
      if (moves.length === 0) return;
      if (moves.length === 1) {
        setMatch(playMove(match, moves[0]));
        return;
      }
      setPendingTile(tile);
    },
    [match]
  );

  const handleChooseEnd = useCallback(
    (end: BoardEnd) => {
      if (!match || !pendingTile) return;
      setMatch(playMove(match, { tile: pendingTile, end }));
      setPendingTile(null);
    },
    [match, pendingTile]
  );

  if (!match) {
    return <DominoMenu onStart={startMatch} />;
  }

  const humanValidTileKeys = new Set(
    match.status === "playing" && match.currentTurn === HUMAN_ID
      ? getValidMoves(match.hands[HUMAN_ID], match.board).map((m) => `${m.tile.a}-${m.tile.b}`)
      : []
  );
  const opponents = match.playerOrder.filter((id) => id !== HUMAN_ID);

  return (
    <GameShell
      title="도미노"
      accentVar="--accent-domino"
      score={match.scores[HUMAN_ID]}
      highScore={highScore}
      controlsHint="손패에서 타일을 클릭해 보드 양 끝에 맞춰 놓으세요"
    >
      <div className="domino-board">
        <div className="domino-status-bar">
          <span>턴: {playerLabel(match.currentTurn)}</span>
          <span>보유고 {match.boneyard.length}장</span>
          <span className="domino-status-bar__scores">
            {match.playerOrder.map((id) => (
              <span key={id}>
                {playerLabel(id)} {match.scores[id]}
              </span>
            ))}
          </span>
        </div>

        <div className="domino-opponents">
          {opponents.map((id) => (
            <div
              key={id}
              className={
                match.currentTurn === id ? "domino-opponent domino-opponent--active" : "domino-opponent"
              }
            >
              <span className="domino-opponent__label">{playerLabel(id)}</span>
              <div className="domino-opponent__hand">
                {match.hands[id].map((_, i) => (
                  <DominoTile key={i} tile={{ a: 0, b: 0 }} faceDown />
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="domino-chain">
          {match.board.chain.length === 0 && <p className="domino-chain__empty">첫 타일을 놓아보세요</p>}
          {match.board.chain.map((placed, i) => (
            <DominoTile
              key={i}
              tile={placed.tile}
              flipped={placed.flipped}
              orientation={placed.tile.a === placed.tile.b ? "vertical" : "horizontal"}
            />
          ))}
        </div>

        {pendingTile && (
          <div className="domino-end-picker">
            <p>어느 쪽에 놓을까요?</p>
            <button onClick={() => handleChooseEnd("left")}>왼쪽</button>
            <button onClick={() => handleChooseEnd("right")}>오른쪽</button>
            <button onClick={() => setPendingTile(null)}>취소</button>
          </div>
        )}

        <div className="domino-human-hand">
          {match.hands[HUMAN_ID].map((tile, i) => (
            <button
              key={i}
              className="domino-human-hand__slot"
              onClick={() => handleTileClick(tile)}
              disabled={match.currentTurn !== HUMAN_ID || !humanValidTileKeys.has(`${tile.a}-${tile.b}`)}
            >
              <DominoTile tile={tile} />
            </button>
          ))}
        </div>

        {match.status === "round-over" && match.lastRoundResult && (
          <div className="domino-round-end">
            <p>
              {playerLabel(match.lastRoundResult.winnerId)}가 이번 라운드 승리! (+
              {match.lastRoundResult.pointsAwarded}점)
            </p>
            <button onClick={() => setMatch(startNextRound(match))}>다음 라운드</button>
          </div>
        )}

        {match.status === "match-over" && (
          <div className="domino-match-end">
            <p>{playerLabel(match.matchWinnerId ?? HUMAN_ID)}가 매치에서 승리했습니다!</p>
            <button
              onClick={() => {
                setMatch(null);
                onExit();
              }}
            >
              메뉴로 돌아가기
            </button>
          </div>
        )}
      </div>
    </GameShell>
  );
}
