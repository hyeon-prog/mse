import type { GameModule } from "../../types/game";
import { AppleGame } from "./AppleGame";

export const appleGame: GameModule = {
  id: "apple-game",
  title: "사과게임",
  description: "드래그로 합이 10이 되는 사과를 찾아 제거하세요",
  icon: "🍎",
  accentVar: "--accent-apple",
  Component: AppleGame,
  inProgress: true,
};
