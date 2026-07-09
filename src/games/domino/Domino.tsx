import { useCallback, useEffect, useRef, useState } from "react";
import { DominoLeaderboard } from "./DominoLeaderboard";
import { DominoLobby } from "./DominoLobby";
import { DominoLocalGame } from "./DominoLocalGame";
import { DominoOnlineGame } from "./DominoOnlineGame";
import { DominoOnlineSetup } from "./DominoOnlineSetup";
import { hostRoom, joinRoomByCode, type OnlineSession } from "./multiplayer/session";
import type { LobbySnapshot, PlayerView } from "./multiplayer/protocol";
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
  const [lobby, setLobby] = useState<LobbySnapshot | null>(null);
  const [view, setView] = useState<PlayerView | null>(null);
  const sessionRef = useRef<OnlineSession | null>(null);

  const goHome = useCallback(() => {
    sessionRef.current?.close();
    sessionRef.current = null;
    setScreen("home");
    setLobby(null);
    setView(null);
    setErrorMessage(null);
    window.history.replaceState(null, "", window.location.pathname);
  }, []);

  useEffect(() => {
    return () => {
      sessionRef.current?.close();
      sessionRef.current = null;
    };
  }, []);

  const sessionEvents = useCallback(() => {
    return {
      onLobby: (snapshot: LobbySnapshot) => setLobby(snapshot),
      onView: (playerView: PlayerView) => setView(playerView),
      onError: (message: string) => {
        sessionRef.current = null;
        setLobby(null);
        setView(null);
        setErrorMessage(message);
        setScreen("online-setup");
      },
      onClosed: () => {
        // 호스트가 방을 닫았거나 연결이 끊긴 경우
        setLobby(null);
        setView(null);
        setErrorMessage("방과의 연결이 끊어졌습니다.");
        setScreen((current) => (current === "online-room" ? "online-setup" : current));
        sessionRef.current = null;
      },
    };
  }, []);

  const handleCreateRoom = useCallback(
    async (nickname: string, mode: MatchMode, targetScore: number) => {
      setBusy(true);
      setErrorMessage(null);
      try {
        sessionRef.current = await hostRoom(nickname, mode, targetScore, sessionEvents());
        setScreen("online-room");
      } catch {
        setErrorMessage("방을 만들지 못했습니다. 잠시 후 다시 시도해주세요.");
      } finally {
        setBusy(false);
      }
    },
    [sessionEvents]
  );

  const handleJoinRoom = useCallback(
    async (nickname: string, roomCode: string) => {
      setBusy(true);
      setErrorMessage(null);
      try {
        sessionRef.current = await joinRoomByCode(roomCode, nickname, sessionEvents());
        setScreen("online-room");
      } catch {
        setErrorMessage("방에 참가하지 못했습니다. 잠시 후 다시 시도해주세요.");
      } finally {
        setBusy(false);
      }
    },
    [sessionEvents]
  );

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
          <button
            className="domino-menu__option"
            style={{ width: "100%" }}
            onClick={() => setScreen("leaderboard")}
          >
            전적 보기
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
  const session = sessionRef.current;
  if (!session) {
    return (
      <div className="domino-menu">
        <div className="domino-menu__panel">
          <p className="domino-menu__subtitle">연결하는 중...</p>
        </div>
      </div>
    );
  }

  if (view) {
    return (
      <DominoOnlineGame
        view={view}
        myPlayerId={session.myPlayerId}
        onPlay={(move) => session.play(move)}
        onNextRound={() => session.nextRound()}
        onExit={goHome}
      />
    );
  }

  if (lobby) {
    return (
      <DominoLobby
        lobby={lobby}
        myPlayerId={session.myPlayerId}
        starting={busy}
        onStart={() => session.start()}
        onLeave={goHome}
      />
    );
  }

  return (
    <div className="domino-menu">
      <div className="domino-menu__panel">
        <p className="domino-menu__subtitle">연결하는 중...</p>
      </div>
    </div>
  );
}
