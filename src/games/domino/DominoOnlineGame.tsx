import { useCallback, useEffect, useRef, useState } from "react";
import { GameShell } from "../../components/GameShell";
import { useHighScore } from "../../hooks/useHighScore";
import { DominoTile } from "./DominoTile";
import { getValidMoves } from "./engine/board";
import type { BoardEnd, Move, Tile } from "./engine/types";
import type { PlayerView } from "./multiplayer/protocol";
import { addRecord } from "./records";
import "./Domino.css";
import "./DominoLobby.css";

interface DominoOnlineGameProps {
  view: PlayerView;
  myPlayerId: string;
  onPlay: (move: Move) => void;
  onNextRound: () => void;
  onExit: () => void;
}

export function DominoOnlineGame({ view, myPlayerId, onPlay, onNextRound, onExit }: DominoOnlineGameProps) {
  const [pendingTile, setPendingTile] = useState<Tile | null>(null);
  const [highScore, submitScore] = useHighScore("domino");
  const recordedRef = useRef(false);

  const isHost = view.hostPlayerId === myPlayerId;
  const isMyTurn = view.status === "playing" && view.currentTurn === myPlayerId;
  const label = useCallback(
    (id: string) => (id === myPlayerId ? "나" : (view.nicknames[id] ?? "???")),
    [view.nicknames, myPlayerId]
  );

  useEffect(() => {
    if (view.status === "match-over" && !recordedRef.current) {
      recordedRef.current = true;
      const myScore = view.scores[myPlayerId] ?? 0;
      addRecord({
        nickname: view.nicknames[myPlayerId] ?? "익명",
        score: myScore,
        won: view.matchWinnerId === myPlayerId,
        date: new Date().toISOString(),
      });
      submitScore(myScore);
    }
    if (view.status === "playing") {
      recordedRef.current = false;
    }
  }, [view.status, view.scores, view.nicknames, view.matchWinnerId, myPlayerId, submitScore]);

  const handleTileClick = useCallback(
    (tile: Tile) => {
      if (!isMyTurn) return;
      const moves = getValidMoves(view.yourHand, view.board).filter(
        (m) => m.tile.a === tile.a && m.tile.b === tile.b
      );
      if (moves.length === 0) return;
      if (moves.length === 1) {
        onPlay(moves[0]);
        return;
      }
      setPendingTile(tile);
    },
    [isMyTurn, view.yourHand, view.board, onPlay]
  );

  const handleChooseEnd = useCallback(
    (end: BoardEnd) => {
      if (!pendingTile) return;
      onPlay({ tile: pendingTile, end });
      setPendingTile(null);
    },
    [pendingTile, onPlay]
  );

  const myValidTileKeys = new Set(
    isMyTurn ? getValidMoves(view.yourHand, view.board).map((m) => `${m.tile.a}-${m.tile.b}`) : []
  );
  const opponents = view.playerOrder.filter((id) => id !== myPlayerId);

  return (
    <GameShell
      title="도미노 (온라인)"
      accentVar="--accent-domino"
      score={view.scores[myPlayerId] ?? 0}
      highScore={highScore}
      controlsHint="손패에서 타일을 클릭해 보드 양 끝에 맞춰 놓으세요"
    >
      <div className="domino-board">
        <div className="domino-status-bar">
          <span>턴: {label(view.currentTurn)}</span>
          <span>보유고 {view.boneyardCount}장</span>
          <span className="domino-status-bar__scores">
            {view.playerOrder.map((id) => (
              <span key={id}>
                {label(id)} {view.scores[id]}
              </span>
            ))}
          </span>
        </div>

        <div className="domino-opponents">
          {opponents.map((id) => (
            <div
              key={id}
              className={view.currentTurn === id ? "domino-opponent domino-opponent--active" : "domino-opponent"}
            >
              <span className="domino-opponent__label">{label(id)}</span>
              <div className="domino-opponent__hand">
                {Array.from({ length: view.handCounts[id] ?? 0 }, (_, i) => (
                  <DominoTile key={i} tile={{ a: 0, b: 0 }} faceDown />
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="domino-chain">
          {view.board.chain.length === 0 && <p className="domino-chain__empty">첫 타일을 놓아보세요</p>}
          {view.board.chain.map((placed, i) => (
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
          {view.yourHand.map((tile, i) => (
            <button
              key={i}
              className="domino-human-hand__slot"
              onClick={() => handleTileClick(tile)}
              disabled={!isMyTurn || !myValidTileKeys.has(`${tile.a}-${tile.b}`)}
            >
              <DominoTile tile={tile} />
            </button>
          ))}
        </div>

        {view.status === "round-over" && view.lastRoundResult && (
          <div className="domino-round-end">
            <p>
              {label(view.lastRoundResult.winnerId)}가 이번 라운드 승리! (+
              {view.lastRoundResult.pointsAwarded}점)
            </p>
            {isHost ? (
              <button onClick={onNextRound}>다음 라운드</button>
            ) : (
              <p className="domino-lobby__waiting">호스트가 다음 라운드를 시작하기를 기다리는 중...</p>
            )}
          </div>
        )}

        {view.status === "match-over" && (
          <div className="domino-match-end">
            <p>{label(view.matchWinnerId ?? myPlayerId)}가 매치에서 승리했습니다!</p>
            <button onClick={onExit}>메뉴로 돌아가기</button>
          </div>
        )}
      </div>
    </GameShell>
  );
}
