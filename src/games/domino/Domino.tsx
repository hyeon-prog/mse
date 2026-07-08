import { useCallback, useEffect, useState } from "react";
import { GameShell } from "../../components/GameShell";
import { useHighScore } from "../../hooks/useHighScore";
import { DominoMenu } from "./DominoMenu";
import { DominoTile } from "./DominoTile";
import { canPlay, getValidMoves } from "./engine/board";
import { chooseAiMove } from "./engine/ai";
import { createMatch, passTurn, playMove, resolveDrawPhase, startNextRound } from "./engine/match";
import type { BoardEnd, MatchMode, MatchState, PlayerId, Tile } from "./engine/types";
import "./Domino.css";

const AI_MOVE_DELAY_MS = 500;

export function Domino() {
  const [match, setMatch] = useState<MatchState | null>(null);
  const [pendingTile, setPendingTile] = useState<Tile | null>(null);
  const [highScore, submitScore] = useHighScore("domino");

  const startMatch = useCallback((mode: MatchMode, targetScore: number) => {
    const starter: PlayerId = Math.random() < 0.5 ? "human" : "ai";
    setMatch(createMatch(mode, targetScore, starter));
    setPendingTile(null);
  }, []);

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

    if (match.currentTurn === "ai") {
      const timer = setTimeout(() => {
        setMatch((current) => {
          if (!current || current.status !== "playing" || current.currentTurn !== "ai") return current;
          const move = chooseAiMove(current.hands.ai, current.board);
          return move ? playMove(current, move) : current;
        });
      }, AI_MOVE_DELAY_MS);
      return () => clearTimeout(timer);
    }
  }, [match]);

  useEffect(() => {
    if (match?.status === "match-over") {
      submitScore(match.scores.human);
    }
  }, [match?.status, match?.scores.human, submitScore]);

  const handleTileClick = useCallback(
    (tile: Tile) => {
      if (!match || match.status !== "playing" || match.currentTurn !== "human") return;
      const moves = getValidMoves(match.hands.human, match.board).filter(
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
    match.status === "playing" && match.currentTurn === "human"
      ? getValidMoves(match.hands.human, match.board).map((m) => `${m.tile.a}-${m.tile.b}`)
      : []
  );

  return (
    <GameShell
      title="도미노"
      accentVar="--accent-domino"
      score={match.scores.human}
      highScore={highScore}
      controlsHint="손패에서 타일을 클릭해 보드 양 끝에 맞춰 놓으세요"
    >
      <div className="domino-board">
        <div className="domino-status-bar">
          <span>턴: {match.currentTurn === "human" ? "나" : "AI"}</span>
          <span>
            내 타일 {match.hands.human.length}장 · AI {match.hands.ai.length}장 · 보유고 {match.boneyard.length}장
          </span>
          <span>
            나 {match.scores.human} : {match.scores.ai} AI
          </span>
        </div>

        <div className="domino-ai-hand">
          {match.hands.ai.map((_, i) => (
            <DominoTile key={i} tile={{ a: 0, b: 0 }} faceDown />
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
          {match.hands.human.map((tile, i) => (
            <button
              key={i}
              className="domino-human-hand__slot"
              onClick={() => handleTileClick(tile)}
              disabled={match.currentTurn !== "human" || !humanValidTileKeys.has(`${tile.a}-${tile.b}`)}
            >
              <DominoTile tile={tile} />
            </button>
          ))}
        </div>

        {match.status === "round-over" && match.lastRoundResult && (
          <div className="domino-round-end">
            <p>
              {match.lastRoundResult.winnerId === "human" ? "내가" : "AI가"} 이번 라운드 승리! (+
              {match.lastRoundResult.pointsAwarded}점)
            </p>
            <button onClick={() => setMatch(startNextRound(match))}>다음 라운드</button>
          </div>
        )}

        {match.status === "match-over" && (
          <div className="domino-match-end">
            <p>{match.matchWinnerId === "human" ? "내가 매치에서 승리했습니다!" : "AI가 매치에서 승리했습니다."}</p>
            <button onClick={() => setMatch(null)}>메뉴로 돌아가기</button>
          </div>
        )}
      </div>
    </GameShell>
  );
}
