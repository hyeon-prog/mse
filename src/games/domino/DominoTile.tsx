import type { Tile } from "./engine/types";
import "./DominoTile.css";

const PIP_LAYOUTS: Record<number, number[]> = {
  0: [],
  1: [4],
  2: [0, 8],
  3: [0, 4, 8],
  4: [0, 2, 6, 8],
  5: [0, 2, 4, 6, 8],
  6: [0, 2, 3, 5, 6, 8],
};

function PipFace({ value }: { value: number }) {
  const active = new Set(PIP_LAYOUTS[value] ?? []);
  return (
    <div className="domino-tile__face">
      {Array.from({ length: 9 }, (_, i) => (
        <span
          key={i}
          className={active.has(i) ? "domino-tile__pip domino-tile__pip--on" : "domino-tile__pip"}
        />
      ))}
    </div>
  );
}

interface DominoTileProps {
  tile: Tile;
  orientation?: "horizontal" | "vertical";
  flipped?: boolean;
  faceDown?: boolean;
  className?: string;
}

export function DominoTile({
  tile,
  orientation = "horizontal",
  flipped = false,
  faceDown = false,
  className,
}: DominoTileProps) {
  const classes = [
    "domino-tile",
    `domino-tile--${orientation}`,
    faceDown ? "domino-tile--face-down" : "",
    className ?? "",
  ]
    .filter(Boolean)
    .join(" ");

  if (faceDown) {
    return <div className={classes} aria-hidden="true" />;
  }

  const [first, second] = flipped ? [tile.b, tile.a] : [tile.a, tile.b];

  return (
    <div className={classes}>
      <PipFace value={first} />
      <span className="domino-tile__divider" />
      <PipFace value={second} />
    </div>
  );
}
