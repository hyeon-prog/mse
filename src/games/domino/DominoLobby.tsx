import { useState } from "react";
import type { LobbySnapshot } from "./multiplayer/protocol";
import "./DominoLobby.css";

interface DominoLobbyProps {
  lobby: LobbySnapshot;
  myPlayerId: string;
  starting: boolean;
  onStart: () => void;
  onLeave: () => void;
}

export function DominoLobby({ lobby, myPlayerId, starting, onStart, onLeave }: DominoLobbyProps) {
  const [copied, setCopied] = useState(false);
  const isHost = lobby.hostPlayerId === myPlayerId;
  const shareUrl = `${window.location.origin}${window.location.pathname}?room=${lobby.roomCode}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(shareUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="domino-lobby">
      <h2 className="domino-lobby__code">방 코드: {lobby.roomCode}</h2>
      <div className="domino-lobby__share">
        <input readOnly value={shareUrl} className="domino-lobby__link" />
        <button onClick={handleCopy}>{copied ? "복사됨!" : "링크 복사"}</button>
      </div>

      <ul className="domino-lobby__players">
        {lobby.players.map((player) => (
          <li key={player.playerId}>
            {player.nickname}
            {player.playerId === lobby.hostPlayerId && <span className="domino-lobby__host-tag">방장</span>}
            {!player.connected && <span className="domino-lobby__host-tag">연결 끊김</span>}
          </li>
        ))}
      </ul>

      {isHost ? (
        <button
          className="domino-lobby__start"
          disabled={lobby.players.length < 2 || starting}
          onClick={onStart}
        >
          {starting ? "시작하는 중..." : `게임 시작 (${lobby.players.length}/4명)`}
        </button>
      ) : (
        <p className="domino-lobby__waiting">호스트가 게임을 시작하기를 기다리는 중...</p>
      )}

      <button className="domino-lobby__leave" onClick={onLeave}>
        나가기
      </button>
    </div>
  );
}
