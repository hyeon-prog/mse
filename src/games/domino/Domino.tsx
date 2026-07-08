import { useCallback, useEffect, useState } from "react";
import { DominoLeaderboard } from "./DominoLeaderboard";
import { DominoLobby } from "./DominoLobby";
import { DominoLocalGame } from "./DominoLocalGame";
import { DominoOnlineGame } from "./DominoOnlineGame";
import { DominoOnlineSetup } from "./DominoOnlineSetup";
import { ensureSignedIn } from "./multiplayer/firebase";
import { createRoom, joinRoom, RoomError, startGame, subscribeRoom } from "./multiplayer/room";
import type { RoomState } from "./multiplayer/types";
import type { MatchMode } from "./engine/types";
import "./DominoMenu.css";

type Screen = "home" | "single" | "online-setup" | "online-room" | "leaderboard";

function initialRoomCodeFromUrl(): string {
  return new URLSearchParams(window.location.search).get("room")?.toUpperCase() ?? "";
}

export function Domino() {
  const [screen, setScreen] = useState<Screen>(() => (initialRoomCodeFromUrl() ? "online-setup" : "home"));
  const [busy, setBusy] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [roomId, setRoomId] = useState<string | null>(null);
  const [nickname, setNickname] = useState("");
  const [room, setRoom] = useState<RoomState | null>(null);
  const [myUid, setMyUid] = useState<string | null>(null);

  useEffect(() => {
    if (!roomId) return;
    return subscribeRoom(roomId, setRoom);
  }, [roomId]);

  const goHome = useCallback(() => {
    setScreen("home");
    setRoomId(null);
    setRoom(null);
    setErrorMessage(null);
    window.history.replaceState(null, "", window.location.pathname);
  }, []);

  const handleCreateRoom = useCallback(async (nick: string, mode: MatchMode, targetScore: number) => {
    setBusy(true);
    setErrorMessage(null);
    try {
      const uid = await ensureSignedIn();
      const newRoomId = await createRoom(nick, mode, targetScore);
      setMyUid(uid);
      setNickname(nick);
      setRoomId(newRoomId);
      setScreen("online-room");
    } catch {
      setErrorMessage("방을 만들지 못했습니다. 잠시 후 다시 시도해주세요.");
    } finally {
      setBusy(false);
    }
  }, []);

  const handleJoinRoom = useCallback(async (nick: string, code: string) => {
    setBusy(true);
    setErrorMessage(null);
    try {
      const uid = await ensureSignedIn();
      await joinRoom(code, nick);
      setMyUid(uid);
      setNickname(nick);
      setRoomId(code);
      setScreen("online-room");
    } catch (error) {
      if (error instanceof RoomError) {
        setErrorMessage(error.message);
      } else {
        setErrorMessage("방에 참가하지 못했습니다. 잠시 후 다시 시도해주세요.");
      }
    } finally {
      setBusy(false);
    }
  }, []);

  if (screen === "home") {
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
          <p className="domino-menu__subtitle">이집트 카페에서 즐기던 표준 블록 도미노(더블식스)</p>
          <button className="domino-menu__start" onClick={() => setScreen("single")}>
            싱글 플레이 (vs AI)
          </button>
          <button className="domino-menu__start" onClick={() => setScreen("online-setup")}>
            온라인 멀티플레이
          </button>
          <button className="domino-menu__option" style={{ width: "100%" }} onClick={() => setScreen("leaderboard")}>
            랭킹 보기
          </button>
        </div>
      </div>
    );
  }

  if (screen === "single") {
    return <DominoLocalGame onExit={goHome} />;
  }

  if (screen === "leaderboard") {
    return <DominoLeaderboard onBack={goHome} />;
  }

  if (screen === "online-setup") {
    return (
      <DominoOnlineSetup
        initialRoomCode={initialRoomCodeFromUrl()}
        busy={busy}
        errorMessage={errorMessage}
        onCreateRoom={handleCreateRoom}
        onJoinRoom={handleJoinRoom}
        onBack={goHome}
      />
    );
  }

  // screen === "online-room"
  if (!roomId || !room || !myUid) {
    return <p className="domino-status-bar">연결하는 중...</p>;
  }

  if (!room.public) {
    return (
      <DominoLobby
        room={room}
        roomId={roomId}
        myUid={myUid}
        starting={busy}
        onLeave={goHome}
        onStart={async () => {
          setBusy(true);
          await startGame(roomId);
          setBusy(false);
        }}
      />
    );
  }

  return <DominoOnlineGame room={room} roomId={roomId} myUid={myUid} myNickname={nickname} onExit={goHome} />;
}
