import { describe, expect, it } from "vitest";
import { createEmptyBoard } from "../engine/board";
import type { MatchState } from "../engine/types";
import {
  advanceMatch,
  applyPlayerMove,
  createHostRoom,
  deriveLobby,
  deriveView,
  joinSeat,
  setSeatConnected,
  startHostMatch,
  startHostNextRound,
  type HostRoom,
} from "./hostLogic";

function roomWith(players: string[], overrides: Partial<HostRoom> = {}): HostRoom {
  const base = createHostRoom("ABC123", players[0], `nick-${players[0]}`, "target-score", 100);
  let room = base;
  for (const p of players.slice(1)) {
    const result = joinSeat(room, p, `nick-${p}`);
    if (result.ok) room = result.room;
  }
  return { ...room, ...overrides };
}

function makeMatch(overrides: Partial<MatchState> = {}): MatchState {
  return {
    mode: "target-score",
    targetScore: 100,
    playerOrder: ["h", "g1"],
    hands: { h: [], g1: [] },
    scores: { h: 0, g1: 0 },
    board: createEmptyBoard(),
    boneyard: [],
    currentTurn: "h",
    roundStarter: "h",
    status: "playing",
    lastRoundResult: null,
    matchWinnerId: null,
    ...overrides,
  };
}

describe("joinSeat", () => {
  it("빈 자리에 새 참가자를 앉힌다", () => {
    const room = roomWith(["h"]);
    const result = joinSeat(room, "g1", "손님1");
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.room.seats).toHaveLength(2);
      expect(result.room.seats[1]).toEqual({ playerId: "g1", nickname: "손님1", connected: true });
    }
  });

  it("4명이 차면 거절한다", () => {
    const room = roomWith(["h", "g1", "g2", "g3"]);
    const result = joinSeat(room, "g4", "손님4");
    expect(result).toEqual({ ok: false, reason: "full" });
  });

  it("게임이 시작된 방에 새 참가자는 못 들어온다", () => {
    const room = startHostMatch(roomWith(["h", "g1"]));
    const result = joinSeat(room, "g2", "손님2");
    expect(result).toEqual({ ok: false, reason: "started" });
  });

  it("같은 playerId는 게임 중이어도 재접속으로 복귀한다", () => {
    let room = startHostMatch(roomWith(["h", "g1"]));
    room = setSeatConnected(room, "g1", false);
    const result = joinSeat(room, "g1", "손님1(재접속)");
    expect(result.ok).toBe(true);
    if (result.ok) {
      const seat = result.room.seats.find((s) => s.playerId === "g1");
      expect(seat?.connected).toBe(true);
      expect(seat?.nickname).toBe("손님1(재접속)");
      expect(result.room.match).not.toBeNull();
    }
  });
});

describe("startHostMatch", () => {
  it("좌석 순서대로 7장씩 분배하고 진행 가능한 상태로 만든다", () => {
    const room = startHostMatch(roomWith(["h", "g1", "g2"]));
    expect(room.match).not.toBeNull();
    expect(room.match?.playerOrder).toEqual(["h", "g1", "g2"]);
    expect(room.match?.status).toBe("playing");
    // 시작 직후에는 아무도 뽑기 전이므로 첫 턴 플레이어는 반드시 낼 수 있다
    // (빈 보드에서는 어떤 타일이든 낼 수 있음)
    expect(room.match?.hands[room.match.currentTurn].length).toBeGreaterThanOrEqual(7);
  });

  it("2명 미만이면 시작하지 않는다", () => {
    const room = startHostMatch(roomWith(["h"]));
    expect(room.match).toBeNull();
  });
});

describe("advanceMatch", () => {
  it("현재 턴이 낼 수 없으면 자동으로 뽑아서 낼 수 있게 만든다", () => {
    const match = makeMatch({
      hands: { h: [{ a: 5, b: 5 }], g1: [{ a: 1, b: 3 }] },
      board: { chain: [{ tile: { a: 1, b: 2 }, flipped: false }], leftEnd: 1, rightEnd: 2 },
      boneyard: [{ a: 2, b: 6 }],
      currentTurn: "h",
    });
    const result = advanceMatch(match);
    expect(result.hands.h).toEqual([{ a: 5, b: 5 }, { a: 2, b: 6 }]);
    expect(result.currentTurn).toBe("h");
    expect(result.status).toBe("playing");
  });

  it("보유고가 비고 아무도 못 내면 블록으로 라운드를 끝낸다", () => {
    const match = makeMatch({
      hands: { h: [{ a: 5, b: 5 }], g1: [{ a: 6, b: 6 }] },
      board: { chain: [{ tile: { a: 1, b: 2 }, flipped: false }], leftEnd: 1, rightEnd: 2 },
      boneyard: [],
      currentTurn: "h",
    });
    const result = advanceMatch(match);
    expect(result.status).toBe("round-over");
    expect(result.lastRoundResult?.reason).toBe("blocked");
    expect(result.lastRoundResult?.winnerId).toBe("h"); // 10 < 12
  });
});

describe("applyPlayerMove", () => {
  const baseRoom = (): HostRoom =>
    roomWith(["h", "g1"], {
      match: makeMatch({
        hands: { h: [{ a: 1, b: 2 }, { a: 4, b: 4 }], g1: [{ a: 2, b: 3 }] },
        board: { chain: [{ tile: { a: 2, b: 5 }, flipped: false }], leftEnd: 2, rightEnd: 5 },
        currentTurn: "h",
      }),
    });

  it("유효한 착수를 적용하고 턴을 넘긴다", () => {
    const room = baseRoom();
    const result = applyPlayerMove(room, "h", { tile: { a: 1, b: 2 }, end: "left" });
    expect(result).not.toBe(room);
    expect(result.match?.currentTurn).toBe("g1");
    expect(result.match?.hands.h).toEqual([{ a: 4, b: 4 }]);
  });

  it("자기 턴이 아니면 같은 참조를 반환한다(무시)", () => {
    const room = baseRoom();
    const result = applyPlayerMove(room, "g1", { tile: { a: 2, b: 3 }, end: "left" });
    expect(result).toBe(room);
  });

  it("규칙에 안 맞는 타일이면 같은 참조를 반환한다(무시)", () => {
    const room = baseRoom();
    const result = applyPlayerMove(room, "h", { tile: { a: 4, b: 4 }, end: "left" });
    expect(result).toBe(room);
  });
});

describe("startHostNextRound", () => {
  it("라운드 종료 상태에서만 다음 라운드를 연다", () => {
    const playing = roomWith(["h", "g1"], { match: makeMatch() });
    expect(startHostNextRound(playing)).toBe(playing);

    const over = roomWith(["h", "g1"], {
      match: makeMatch({
        status: "round-over",
        lastRoundResult: { winnerId: "g1", reason: "emptied-hand", pointsAwarded: 5 },
        scores: { h: 0, g1: 5 },
      }),
    });
    const result = startHostNextRound(over);
    expect(result.match?.status).toBe("playing");
    expect(result.match?.scores).toEqual({ h: 0, g1: 5 });
    expect(result.match?.roundStarter).toBe("g1");
  });
});

describe("deriveView / deriveLobby", () => {
  it("자기 손패만 실제 타일이 담기고 나머지는 개수만 공개된다", () => {
    const room = roomWith(["h", "g1"], {
      match: makeMatch({
        hands: { h: [{ a: 1, b: 2 }], g1: [{ a: 3, b: 4 }, { a: 5, b: 6 }] },
        boneyard: [{ a: 0, b: 0 }],
      }),
    });
    const view = deriveView(room, "g1");
    expect(view?.yourHand).toEqual([{ a: 3, b: 4 }, { a: 5, b: 6 }]);
    expect(view?.handCounts).toEqual({ h: 1, g1: 2 });
    expect(view?.boneyardCount).toBe(1);
    expect(JSON.stringify(view)).not.toContain('"boneyard"');
  });

  it("대기실 스냅샷은 참가자 목록과 방 설정을 담는다", () => {
    const lobby = deriveLobby(roomWith(["h", "g1"]));
    expect(lobby.roomCode).toBe("ABC123");
    expect(lobby.players.map((p) => p.playerId)).toEqual(["h", "g1"]);
    expect(lobby.hostPlayerId).toBe("h");
  });
});
