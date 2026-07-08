import { useState } from "react";
import type { RoomState } from "./multiplayer/types";
import "./DominoLobby.css";

interface DominoLobbyProps {
  room: RoomState;
  roomId: string;
  myUid: string;
  onStart: () => void;
  starting: boolean;
  onLeave: () => void;
}

export function DominoLobby({ room, roomId, myUid, onStart, starting, onLeave }: DominoLobbyProps) {
  const [copied, setCopied] = useState(false);
  const players = Object.entries(room.players).sort((a, b) => a[1].seat - b[1].seat);
  const isHost = room.hostId === myUid;
  const shareUrl = `${window.location.origin}${window.location.pathname}?room=${roomId}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(shareUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="domino-lobby">
      <h2 className="domino-lobby__code">방 코드: {roomId}</h2>
      <div className="domino-lobby__share">
        <input readOnly value={shareUrl} className="domino-lobby__link" />
        <button onClick={handleCopy}>{copied ? "복사됨!" : "링크 복사"}</button>
      </div>

      <ul className="domino-lobby__players">
        {players.map(([uid, player]) => (
          <li key={uid}>
            {player.nickname} {uid === room.hostId && <span className="domino-lobby__host-tag">방장</span>}
          </li>
        ))}
      </ul>

      {isHost ? (
        <button className="domino-lobby__start" disabled={players.length < 2 || starting} onClick={onStart}>
          {starting ? "시작하는 중..." : `게임 시작 (${players.length}/4명)`}
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
