# Domino Tutorial — Design

## Purpose

The Domino start screen currently has a single sentence of description and no
explanation of the rules. First-time players have to learn by trial and
error. Add an on-demand, animated step-by-step tutorial that teaches the core
rules through motion instead of a wall of text, without adding friction for
players who already know the game.

## Non-goals

- No tutorial for other games (2048, Tetris, Apple Game, Angry Birds, etc.) —
  Domino only, for now.
- No forced/auto-shown tutorial on first visit — it only appears when the
  player clicks a button.
- No new animation library or dependency — reuse the project's existing
  CSS-keyframe approach (see `dominoDrawIn`, `popIn`, `navPop` in
  `src/index.css` / `Domino.css`).

## Entry point

In `Domino.jsx`, the pre-match select screen (`!match` branch) gets a new
`튜토리얼 보기` button (`btn btn-secondary`), placed directly under the
existing one-line description and above the option groups (player count /
difficulty / end condition). Clicking it sets `showTutorial = true` and
renders `<DominoTutorial onClose={() => setShowTutorial(false)} />`.

Players who don't click it see no change at all — same options, same
`게임 시작` / `온라인 멀티플레이` buttons, same flow.

## Component

New file: `src/games/Domino/DominoTutorial.jsx`.

Props: `{ onClose }`.

Internal state: `step` (0–3, `useState(0)`).

Renders a full-screen dimming modal reusing the existing `.domino-overlay`
pattern (already used for round/match results), with new tutorial-specific
inner markup and styles appended to `Domino.css` (this project keeps one CSS
file per game; no new CSS file).

Closes on: X button, backdrop click, and `Escape` key.

## Steps (content)

Four steps, matching the previously-agreed scope. Each step is a short title
+ one-line caption + a looping animated visual built from the existing
`DominoTile` component (no new illustrations):

1. **타일이란** — One large tile (e.g. 6|4) flips face-up; a number label
   over the left half highlights, then the right half highlights.
   Caption: "타일 하나에는 두 개의 숫자(점)가 있어요."
2. **놓는 방법** — A 2-tile chain is already on the table; a new tile slides
   in from below and snaps onto the end whose number matches, with a
   highlight ring around the matching pair.
   Caption: "체인 끝의 숫자와 같은 쪽을 이어붙여요."
3. **못 낼 때** — A tile animates out of a face-down "보유고" stack into the
   hand (draw). The stack animates down to empty, then a "패스" label with an
   arrow slides toward the next player position.
   Caption: "낼 수 없으면 뽑고, 보유고도 없으면 패스해요."
4. **승리 조건** — The hand's tiles disappear one at a time down to zero,
   with a "도미노!" pop-in text, followed by a small score counting up from
   0 to an example value.
   Caption: "손패를 먼저 비우면 승리! 막히면 점수로 승부를 가려요."

Each step's animated visual uses `animation-iteration-count: infinite` on its
CSS keyframes so it loops for as long as that step is shown; switching steps
unmounts the previous step's visual (conditional render on `step`), which
naturally stops its animation. The project's existing
`prefers-reduced-motion` rule in `src/index.css` (forces near-zero animation
duration) applies automatically since no new animation mechanism is
introduced.

## Navigation

- 4 dot indicators at the top of the modal body; clicking a dot jumps to that
  step directly.
- "이전" / "다음" buttons at the bottom (`btn-secondary` / `btn-primary`).
  "이전" is disabled/hidden on step 0.
- On the last step, "다음" is replaced with "시작하기", which closes the
  modal (calls `onClose`).

## Accessibility / consistency

- Reuse `.domino-overlay` dimming + `.domino-result`-style panel look so the
  modal matches the existing round/match-over overlays visually.
- Buttons use the existing shared `.btn` / `.btn-primary` / `.btn-secondary`
  classes — no new button styles.
- Respect `prefers-reduced-motion` (already global, no extra work needed).
- Modal is keyboard-dismissible (`Escape`) in addition to mouse interactions.

## Testing plan

No existing test coverage targets UI/presentation in this codebase (the
project's `vitest` suite covers `dominoLogic.js` game-rule functions only).
This feature is purely presentational, so verification is manual:
`npm run dev`, open the Domino game, click "튜토리얼 보기", step through all
4 steps (via dots and via 다음/이전), confirm each animation loops correctly,
and confirm all three close methods (X, backdrop, Esc) work and correctly
restore the select screen. Also confirm `npm run build` still passes.
