# Domino — Realistic Hand→Board Play Animation — Design

## Purpose

When a player plays a tile, it currently disappears from the hand array and
appears in the chain array on the same render — no animation, a visual
"teleport." The user wants it to feel like they're physically picking the
tile up and placing it: the tile should visibly travel from its exact
on-screen hand position to its exact landed position in the chain, and the
remaining hand tiles should smoothly slide over to close the gap. The
tutorial's step 2 (놓는 방법) should be reworked to preview this same motion
language instead of its current plain "rise into place."

## Non-goals

- No animation for AI opponents' plays, or for draw-from-boneyard — human
  player's own plays only.
- No new dependency (no framer-motion, no view-transitions API) — implement
  with plain React refs + `getBoundingClientRect` (the FLIP technique),
  consistent with the rest of the codebase's CSS-keyframe-only approach.
- `dominoLogic.js` (pure game-rule functions, covered by the existing vitest
  suite) is not touched — this is purely a rendering/animation change in
  `Domino.jsx` / `Domino.css`.

## Key correctness fix enabling this: stable tile keys

`.domino-hand` and `.domino-chain` currently render with `key={i}` (array
index). When a tile is removed from the middle of the hand, or a tile is
prepended to the chain (playing on the left end), every following item's
index shifts — so index-keyed React elements get their DOM node *reused for
a different tile* rather than truly added/removed/moved. That breaks any
attempt to reliably track "this specific tile's DOM node" across a render,
which the FLIP technique requires.

Fix: key both lists by tile identity, `` `${tile.a}-${tile.b}` ``. This is
safe because `createDeck()` generates each `{a,b}` pair (with `a <= b`)
exactly once — there are never two tiles with the same pip pair anywhere in
a match (hand, boneyard, or chain) at the same time.

## Real gameplay: flight + reflow

In `Domino.jsx`:

- Two ref maps, populated via ref callbacks on the hand buttons and on a
  thin wrapper div around each chain `DominoTile`: `handRefs` (tile-key →
  hand button node) and `chainRefs` (tile-key → chain wrapper node).
- `handleTileClick` (unambiguous move) and `handleChooseEnd` (after picking
  left/right for an ambiguous move): right before calling `setMatch`,
  capture the clicked tile's `getBoundingClientRect()` from `handRefs`, and
  snapshot the current rects of all *other* hand tiles (for the reflow
  step below). Store `{ key, startRect }` in a new `flight` state.
- A `useLayoutEffect` keyed on `flight`: once the chain has re-rendered,
  look up the same tile-key in `chainRefs`, read its landed rect, compute
  the delta between the hand-position snapshot and the landed position,
  and animate it — set `transform: translate(dx, dy)` with no transition
  (so it starts exactly where the hand tile was), force a reflow, then on
  the next frame transition `transform` back to `translate(0, 0)` over
  ~300ms ease-out. Clear the inline styles and `flight` state when done.
- A second `useLayoutEffect` keyed on `match`: for every hand tile whose
  rect changed since the pre-play snapshot, apply the same instant-offset→
  transition-to-zero treatment (~220ms), so the remaining tiles visibly
  slide into the gap. Guarded so it's a no-op when there's no snapshot
  (i.e., on turns where the human didn't just play — AI moves, draws).
- Ambiguous moves (`pendingTile` / left-right picker): the hand rect is
  captured at the original tile click (when the picker opens), stored, and
  reused once the player actually picks an end and the move is applied.

No changes to `.domino-hand-slot .domino-tile`'s existing `dominoDrawIn`
pop-in (still used only for tiles newly arriving via draw) — the flight
animation is separate and only touches the tile actually being played plus
its now-repositioned hand neighbors.

## Tutorial step 2 rework

`DominoTutorial.jsx`'s step 1 (index) visual currently animates a lone tile
rising into place next to a 2-tile chain via `tutorialSlideIn`. Rework:

- Add a small mock hand row (`내 손패` label + one tile) beneath the chain,
  representing where the tile "starts."
- Animate that same tile traveling from the hand row up to its slot next to
  the chain (a combined X+Y translate, not just a vertical rise), using the
  same easing/duration family as the real flight (~300ms ease-out portion
  of the loop), then hold, then fade back to the hand row to loop — keeping
  the existing `animation-iteration-count: infinite` looping structure.
- Purely a hand-authored CSS keyframe (fixed staged scene, no real
  `getBoundingClientRect` measurement needed here) — but visually consistent
  with what real play now looks like.

## Testing plan

No UI test coverage exists in this codebase (vitest only covers
`dominoLogic.js`). Verify manually / via Playwright:
`npm run dev`, open Domino, start a match, play a tile with a single valid
move and confirm it visibly flies from the hand slot to its chain position
and the hand closes the gap; play a tile with two valid ends and confirm
the same after picking left/right; confirm AI turns and draws are
unaffected (no animation, as before); confirm `npm run build` still passes;
re-check the tutorial's step 2 loop for the new hand→board travel.
