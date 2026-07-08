import type { GameModule } from "../../types/game";
import { Game2048 } from "./Game2048";

export const game2048: GameModule = {
  id: "2048",
  title: "2048",
  description: "같은 숫자 타일을 밀어 합쳐 2048을 만드세요",
  icon: "🔢",
  accentVar: "--accent-2048",
  Component: Game2048,
  inProgress: true,
};
