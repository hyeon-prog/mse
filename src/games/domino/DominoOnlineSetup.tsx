import { useState } from "react";
import type { MatchMode } from "./engine/types";
import "./DominoOnlineSetup.css";

interface DominoOnlineSetupProps {
  initialRoomCode: string;
  busy: boolean;
  errorMessage: string | null;
  onCreateRoom: (nickname: string, mode: MatchMode, targetScore: number) => void;
  onJoinRoom: (nickname: string, roomCode: string) => void;
  onBack: () => void;
}

const DEFAULT_TARGET_SCORE = 100;

export function DominoOnlineSetup({
  initialRoomCode,
  busy,
  errorMessage,
  onCreateRoom,
  onJoinRoom,
  onBack,
}: DominoOnlineSetupProps) {
  const [tab, setTab] = useState<"create" | "join">(initialRoomCode ? "join" : "create");
  const [nickname, setNickname] = useState("");
  const [roomCode, setRoomCode] = useState(initialRoomCode);
  const [mode, setMode] = useState<MatchMode>("target-score");
  const [targetScore, setTargetScore] = useState(DEFAULT_TARGET_SCORE);

  const trimmedNickname = nickname.trim() || "익명";

  return (
    <div className="domino-menu">
      <div className="domino-menu__panel">
        <p className="domino-menu__eyebrow">☥ ONLINE MULTIPLAYER ☥</p>
        <h1 className="domino-menu__title" style={{ fontSize: "1.8rem" }}>
          온라인 멀티플레이
        </h1>

        <label className="domino-menu__field">
          <span className="domino-menu__label">닉네임</span>
          <input
            className="domino-menu__number"
            value={nickname}
            maxLength={12}
            onChange={(e) => setNickname(e.target.value)}
            placeholder="닉네임을 입력하세요"
          />
        </label>

        <div className="domino-menu__options">
          <button
            className={tab === "create" ? "domino-menu__option domino-menu__option--active" : "domino-menu__option"}
            onClick={() => setTab("create")}
            type="button"
          >
            방 만들기
          </button>
          <button
            className={tab === "join" ? "domino-menu__option domino-menu__option--active" : "domino-menu__option"}
            onClick={() => setTab("join")}
            type="button"
          >
            코드로 참가
          </button>
        </div>

        {tab === "create" ? (
          <>
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
            <button
              className="domino-menu__start"
              disabled={busy}
              onClick={() => onCreateRoom(trimmedNickname, mode, targetScore)}
            >
              방 만들기
            </button>
          </>
        ) : (
          <>
            <label className="domino-menu__field">
              <span className="domino-menu__label">방 코드</span>
              <input
                className="domino-menu__number"
                value={roomCode}
                maxLength={6}
                onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                placeholder="예: AB12CD"
              />
            </label>
            <button
              className="domino-menu__start"
              disabled={busy || roomCode.trim().length === 0}
              onClick={() => onJoinRoom(trimmedNickname, roomCode.trim())}
            >
              참가하기
            </button>
          </>
        )}

        {errorMessage && <p className="domino-online-setup__error">{errorMessage}</p>}

        <button className="domino-menu__option" style={{ width: "100%" }} onClick={onBack} type="button">
          ← 뒤로
        </button>
      </div>
    </div>
  );
}
