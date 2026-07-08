# Bounce Ball (바운스볼) — Design

## Summary

A new minigame added to the mini-game platform: an obstacle-dodging falling-ball
game (Helix Jump style). The ball stays at a fixed vertical screen position;
obstacle rows scroll upward over time and the player moves the ball
left/right between lanes to dodge them. Speed increases as the run continues.
Score is the number of rows survived, saved to the shared Firestore
leaderboard alongside Tetris/2048/AppleGame.

## Architecture

Follows the existing per-game module pattern used by every other game in
`src/games/<Name>/`:

- `bounceBallLogic.js` — pure functions, no React/DOM. Board is a fixed number
  of lanes (5) and a rolling window of visible rows. No physics, no canvas —
  same "array of cells" simulation style as `tetrisLogic.js` and
  `minesweeperLogic.js`.
- `BounceBall.jsx` — component: keyboard input, interval-driven tick loop
  (same shape as `Tetris.jsx`'s `useEffect` tick), rendering via CSS grid,
  game-over overlay with name entry that calls the shared `addScore`.
- `BounceBall.css` — styled with the same retro pixel-art conventions as
  `Tetris.css` (`--pixel-shadow` box-shadows, `--font-pixel` for HUD/labels,
  hard-edged borders, `border-radius: 0`).

Registered in `gameConfig.js` exactly like the other four games — no routing
changes needed since `GamePage`/`GameList`/`Lobby` all read from that config
dynamically.

## Data flow / game loop

- State: `{ lanes, ballLane, rows, score, status }` where `rows` is an array
  of row objects `{ blockedLanes: Set<number> }`, ordered nearest-to-ball
  first.
- On each tick (interval, same pattern as Tetris's speed-scales-with-progress
  approach — `Math.max(minMs, baseMs - score * stepMs)`):
  1. Shift `rows` — drop the row nearest the ball ("consumed" row) and check
     if `ballLane` is in that row's `blockedLanes`. If so → collision →
     `status = 'over'`.
  2. Otherwise increment `score`, push a freshly generated row at the far
     end.
- Row generation always leaves at least one lane open (guarantees the level
  is theoretically dodgeable every row, since the player can react one row
  at a time — no lookahead pathing needed, matching the simplicity of
  existing game logic).
- Arrow Left/Right move `ballLane` by ±1 immediately (clamped to
  `[0, lanes - 1]`), same key-handling pattern as `Tetris.jsx`'s
  `keydown` listener.

## Error handling

- Board never fully blocks a row (generation-time invariant) — no
  "unfair death" edge case to special-case.
- Score save reuses `addScore()`'s existing async try/catch UI feedback
  pattern already used in `Tetris.jsx`/`Game2048.jsx`/`AppleGame.jsx`
  (`saving` / `saveError` state, disabled button while saving).

## Testing

No automated test suite exists in this repo (none of the other games have
one). Verification is manual: run `npm run dev`, play a full round (dodge
several rows, get hit, confirm score/name save flow), same as prior game
additions in this project.
