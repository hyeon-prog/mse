import type { GameModule } from "../../types/game";
import { Tetris } from "./Tetris";

export const tetris: GameModule = {
  id: "tetris",
  title: "테트리스",
  description: "떨어지는 블록을 쌓아 줄을 채우고 없애세요",
  icon: "🧱",
  accentVar: "--accent-tetris",
  Component: Tetris,
  inProgress: true,
};
