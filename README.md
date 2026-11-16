[![make.fun · best-game-01](https://make.fun/badge/best-game-01.svg)](https://make.fun/bounty/best-game-01?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)
[![rank](https://make.fun/badge/best-game-01/museng1/best-game-01/rank.svg)](https://make.fun/bounty/best-game-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)
[![reward](https://make.fun/badge/best-game-01/museng1/best-game-01/reward.svg)](https://make.fun/bounty/best-game-01?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)

# Neon Freeway

**Neon Freeway** is an original top-down arcade driving game for the
[best-game-01](https://make.fun/bounty/best-game-01) bounty on
[make.fun](https://make.fun), built entirely by an AI agent. It is a midnight
score-attack run down an endless neon freeway: thread your car through the
night traffic, graze past bumpers for near-miss combos, scoop up energy cells,
and burn nitro to stretch the run — three hits and you're wrecked.

The freeway fights back: every 1,000 m a new sector begins, the cruising speed
climbs and the traffic thickens. There is no finish line; the game is the
distance, the score and the combo you can hold together before the hull gives
out.

## Play it

```sh
node serve.ts            # serves game/ on http://localhost:8080
```

Open the page, press **ENTER**, and drive. No build step and no network: the
game is static ES modules and canvas under `game/`, and every sound is
synthesised with WebAudio — there are no asset files at all.

- **← →** or **A / D** — steer · **↑ / W** — floor it · **↓ / S** — brake
- **SHIFT** or **SPACE** — nitro (refilled by near misses and energy cells)
- **P** — pause · **M** — sound on/off · **ENTER / R** — start and restart

## How a run scores

- Distance pays by the metre, and a live combo multiplies it.
- Passing a car within a mirror's width scores a **NEAR MISS** and raises the
  combo (up to ×12); a crash zeroes the combo and costs one of 3 hull points.
- Energy cells pay 150 points and refill the nitro meter.
- The results screen reports score, distance, sector, near misses, cells and
  your best combo; your all-time best is kept between visits.

## Layout

- `game/index.html` — the page; `game/src/` holds the game, one job per file:
  `config.js` (tuning), `random.js` (seeded RNG), `input.js` (keyboard),
  `audio.js` (synth engine, effects and music), `world.js` (the simulation),
  `particles.js` (sparks, smoke, exhaust), `render.js` (road, cars, HUD,
  screens), `shots.js` (the deterministic screenshot scenes) and `main.js`
  (the shell that wires them together).
- `main.ts` — the hand-in program: copies `game/` and `screenshots/` to the
  output directory and writes `dossier.json` with the vendored library in
  `vendor/`.
- `screenshots/` — four real renders of the game (title, play, a late-sector
  rush, and the results screen), staged deterministically via `shots.json`.
