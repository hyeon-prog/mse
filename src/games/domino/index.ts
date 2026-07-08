import type { GameModule } from "../../types/game";
import { Domino } from "./Domino";

export const domino: GameModule = {
  id: "domino",
  title: "도미노",
  description: "표준 블록 도미노 28피스로 AI와 1:1 대결을 펼쳐보세요",
  icon: "🁻",
  accentVar: "--accent-domino",
  Component: Domino,
  inProgress: true,
};
