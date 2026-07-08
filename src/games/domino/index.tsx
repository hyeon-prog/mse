import type { GameModule } from "../../types/game";
import { Domino } from "./Domino";
import { DominoErrorBoundary } from "./DominoErrorBoundary";

function DominoWithBoundary() {
  return (
    <DominoErrorBoundary>
      <Domino />
    </DominoErrorBoundary>
  );
}

export const domino: GameModule = {
  id: "domino",
  title: "도미노",
  description: "표준 블록 도미노 28피스로 AI와 겨루거나 온라인으로 친구와 대결하세요",
  icon: "🁻",
  accentVar: "--accent-domino",
  Component: DominoWithBoundary,
  inProgress: true,
};
