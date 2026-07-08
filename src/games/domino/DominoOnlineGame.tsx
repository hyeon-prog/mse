import { useCallback, useEffect, useState } from "react";
import { GameShell } from "../../components/GameShell";
import { DominoTile } from "./DominoTile";
import { canPlay, getValidMoves } from "./engine/board";
import type { BoardEnd, Tile } from "./engine/types";
import {
  appendOwnHand,
  removeOwnTile,
  sendDraw,
  sendPass,
  sendPlay,
  startNextRoundOnline,
  submitLeaderboardScore,
  subscribeOwnHand,
} from "./multiplayer/room";
import type { RoomState } from "./multiplayer/types";
import "./Domino.css";
import "./DominoLobby.css";

interface DominoOnlineGameProps {
  room: RoomState;
  roomId: string;
  myUid: string;
  myNickname: string;
  onExit: () => void;
}

function playerLabel(room: RoomState, uid: string): string {
  return room.players[uid]?.nickname ?? "???";
}

export function DominoOnlineGame({ room, roomId, myUid, myNickname, onExit }: DominoOnlineGameProps) {
  const [myHand, setMyHand] = useState<Tile[]>([]);
  const [pendingTile, setPendingTile] = useState<Tile | null>(null);
  const [startingNextRound, setStartingNextRound] = useState(false);
  const pub = room.public;

  useEffect(() => subscribeOwnHand(roomId, myUid, setMyHand), [roomId, myUid]);

  // 내 턴이고 낼 수 없으면 자동으로 뽑거나 패스한다
  useEffect(() => {
    if (!pub || pub.status !== "playing" || pub.currentTurn !== myUid) return;
    if (canPlay(myHand, pub.board)) return;

    if (pub.boneyard.length > 0) {
      let hand = myHand;
      let boneyard = pub.boneyard;
      const drawn: Tile[] = [];
      while (!canPlay(hand, pub.board) && boneyard.length > 0) {
        const tile = boneyard[0];
        drawn.push(tile);
        hand = [...hand, tile];
        boneyard = boneyard.slice(1);
      }
      appendOwnHand(roomId, myUid, drawn).then(() => sendDraw(roomId, myUid, drawn));
    } else {
      sendPass(roomId, myUid);
    }
  }, [pub, myHand, myUid, roomId]);

  useEffect(() => {
    if (pub?.status === "match-over" && pub.matchWinnerId === myUid) {
      submitLeaderboardScore(myUid, myNickname, pub.scores[myUid]);
    }
  }, [pub?.status, pub?.matchWinnerId, myUid, myNickname, pub?.scores]);

  const handleTileClick = useCallback(
    (tile: Tile) => {
      if (!pub || pub.status !== "playing" || pub.currentTurn !== myUid) return;
      const moves = getValidMoves(myHand, pub.board).filter((m) => m.tile.a === tile.a && m.tile.b === tile.b);
      if (moves.length === 0) return;
      if (moves.length === 1) {
        removeOwnTile(roomId, myUid, tile).then(() => sendPlay(roomId, myUid, moves[0]));
        return;
      }
      setPendingTile(tile);
    },
    [pub, myHand, myUid, roomId]
  );

  const handleChooseEnd = useCallback(
    (end: BoardEnd) => {
      if (!pendingTile) return;
      const move = { tile: pendingTile, end };
      removeOwnTile(roomId, myUid, pendingTile).then(() => sendPlay(roomId, myUid, move));
      setPendingTile(null);
    },
    [pendingTile, roomId, myUid]
  );

  const handleNextRound = useCallback(() => {
    setStartingNextRound(true);
    startNextRoundOnline(roomId).finally(() => setStartingNextRound(false));
  }, [roomId]);

  if (!pub) {
    return <p className="domino-status-bar">게임을 준비하는 중...</p>;
  }

  const isMyTurn = pub.status === "playing" && pub.currentTurn === myUid;
  const myValidTileKeys = new Set(
    isMyTurn ? getValidMoves(myHand, pub.board).map((m) => `${m.tile.a}-${m.tile.b}`) : []
  );
  const opponents = pub.playerOrder.filter((id) => id !== myUid);
  const isHost = room.hostId === myUid;

  return (
    <GameShell
      title="도미노 (온라인)"
      accentVar="--accent-domino"
      score={pub.scores[myUid] ?? 0}
      highScore={0}
      controlsHint="손패에서 타일을 클릭해 보드 양 끝에 맞춰 놓으세요"
    >
      <div className="domino-board">
        <div className="domino-status-bar">
          <span>턴: {playerLabel(room, pub.currentTurn)}</span>
          <span>보유고 {pub.boneyard.length}장</span>
          <span className="domino-status-bar__scores">
            {pub.playerOrder.map((id) => (
              <span key={id}>
                {playerLabel(room, id)} {pub.scores[id]}
              </span>
            ))}
          </span>
        </div>

        <div className="domino-opponents">
          {opponents.map((id) => (
            <div
              key={id}
              className={pub.currentTurn === id ? "domino-opponent domino-opponent--active" : "domino-opponent"}
            >
              <span className="domino-opponent__label">{playerLabel(room, id)}</span>
              <div className="domino-opponent__hand">
                {Array.from({ length: pub.handCounts[id] ?? 0 }, (_, i) => (
                  <DominoTile key={i} tile={{ a: 0, b: 0 }} faceDown />
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="domino-chain">
          {pub.board.chain.length === 0 && <p className="domino-chain__empty">첫 타일을 놓아보세요</p>}
          {pub.board.chain.map((placed, i) => (
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
          {myHand.map((tile, i) => (
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

        {pub.status === "round-over" && pub.lastRoundResult && (
          <div className="domino-round-end">
            <p>
              {playerLabel(room, pub.lastRoundResult.winnerId)}가 이번 라운드 승리! (+
              {pub.lastRoundResult.pointsAwarded}점)
            </p>
            {isHost ? (
              <button onClick={handleNextRound} disabled={startingNextRound}>
                {startingNextRound ? "준비하는 중..." : "다음 라운드"}
              </button>
            ) : (
              <p className="domino-lobby__waiting">호스트가 다음 라운드를 준비하는 중...</p>
            )}
          </div>
        )}

        {pub.status === "match-over" && (
          <div className="domino-match-end">
            <p>{playerLabel(room, pub.matchWinnerId ?? myUid)}가 매치에서 승리했습니다!</p>
            <button onClick={onExit}>메뉴로 돌아가기</button>
          </div>
        )}
      </div>
    </GameShell>
  );
}
