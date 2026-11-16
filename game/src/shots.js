// The screenshot scenes behind ?shot=start|play|rush|end. Each one drives the real
// simulation forward from a seeded world with an autopilot, so the frame is what a
// real run looks like and the same seed always deals the same frame.

import { PLAYER, ROAD, STEP } from './config.js';
import { EVENT_OVER, stepWorld } from './world.js';
import { SCREEN_OVER, SCREEN_PLAY, SCREEN_TITLE } from './render.js';

const SAMPLE = 1 / 30;
const MARGIN = 16;

/** Seconds until steering `steer` runs the player into a traffic car; Infinity if never. */
function timeToHit(world, steer, horizon) {
  const player = world.player;
  for (let t = SAMPLE; t <= horizon; t += SAMPLE) {
    const x = Math.max(ROAD.left + player.width / 2 + 6,
      Math.min(ROAD.right - player.width / 2 - 6, player.x + steer * PLAYER.steerRate * t));
    for (const car of world.traffic) {
      const cy = car.y + (world.speed - car.speed) * t;
      const closeY = Math.abs(cy - player.y) * 2 < (car.height + player.height) * 0.82;
      const closeX = Math.abs(car.x - x) * 2 < (car.width + player.width) * 0.82 + MARGIN * 2;
      if (closeY && closeX) return t;
    }
  }
  return Infinity;
}

/**
 * One autopilot input: of the safe ways to steer, the one toward the lowest cell;
 * brake when every way is blocked soon. A shorter horizon drives worse.
 */
export function pilotInput(world, horizon) {
  const player = world.player;
  let targetX = player.x;
  let lowest = null;
  for (const orb of world.orbs) {
    if (orb.y < player.y && (lowest === null || orb.y > lowest.y)) lowest = orb;
  }
  if (lowest) targetX = lowest.x;
  const wanted = targetX > player.x + 10 ? 1 : targetX < player.x - 10 ? -1 : 0;
  let best = wanted;
  let bestTime = timeToHit(world, wanted, horizon);
  for (const direction of [0, -1, 1]) {
    const time = timeToHit(world, direction, horizon);
    if (time > bestTime) {
      bestTime = time;
      best = direction;
    }
  }
  return {
    steer: best,
    gas: false,
    brake: bestTime < horizon * 0.55,
    nitro: world.nitro > 55 && bestTime === Infinity,
  };
}

/** The careful driver: looks well ahead, the one the title and play scenes use. */
export function carefulInput(world) {
  return pilotInput(world, 0.85);
}

/**
 * The doomed driver of the end scene: it drifts toward the nearest car ahead
 * instead of away from it, so the run ends the way runs do — in the scenery's
 * opinion, three honest collisions under the game's own rules.
 */
export function recklessInput(world) {
  const player = world.player;
  let nearest = null;
  for (const car of world.traffic) {
    if (car.y < player.y && (nearest === null || car.y > nearest.y)) nearest = car;
  }
  const targetX = nearest === null ? player.x : nearest.x;
  return {
    steer: targetX > player.x + 6 ? 1 : targetX < player.x - 6 ? -1 : 0,
    gas: true,
    brake: false,
    nitro: false,
  };
}

/** Drive the world with a pilot for `seconds` of game time, or until the run ends. */
function driveFor(world, seconds, pilot) {
  const steps = Math.floor(seconds / STEP);
  for (let i = 0; i < steps; i += 1) {
    const events = stepWorld(world, STEP, pilot(world));
    if (events.some((event) => event.type === EVENT_OVER)) break;
  }
}

/**
 * Set the already-reset `world` to the named scene and return the screen to draw
 * over it and the best score to show. Unknown names stage the title.
 */
export function stageShot(name, world) {
  if (name === 'play') {
    driveFor(world, 26, carefulInput);
    return { screen: world.over ? SCREEN_OVER : SCREEN_PLAY, best: 0 };
  }
  if (name === 'rush') {
    driveFor(world, 48, (w) => ({ ...carefulInput(w), gas: true }));
    return { screen: world.over ? SCREEN_OVER : SCREEN_PLAY, best: 0 };
  }
  if (name === 'end') {
    // A respectable run first, then the doomed driver takes the wheel.
    driveFor(world, 40, carefulInput);
    driveFor(world, 300, recklessInput);
    return { screen: SCREEN_OVER, best: Math.floor(world.score) };
  }
  driveFor(world, 5, carefulInput);
  return { screen: SCREEN_TITLE, best: 0 };
}
