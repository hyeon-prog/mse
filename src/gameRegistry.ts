import type { GameModule } from "./types/game";
import { game2048 } from "./games/game2048";
import { appleGame } from "./games/appleGame";
import { tetris } from "./games/tetris";

/**
 * 로비와 라우팅이 참조하는 단일 진실 공급원(single source of truth).
 *
 * 새 게임을 추가하려면:
 *   1. src/games/<내게임>/ 폴더를 만들고 GameModule 형태의 객체를 export
 *   2. 이 배열에 한 줄 추가
 * 이 파일 수정은 "새 게임 추가" 한 줄짜리 변경이라 여러 명이 동시에
 * 작업해도 충돌이 거의 나지 않습니다 (각자 배열 끝에 자기 줄만 추가).
 */
export const games: GameModule[] = [game2048, appleGame, tetris];

export function getGameById(id: string): GameModule | undefined {
  return games.find((g) => g.id === id);
}
