// The Neon Freeway simulation: the player's car, the traffic, the energy cells and
// the score, advanced in fixed steps. It knows nothing about drawing or sound; each
// step returns the events it caused, and the shell turns them into noise and sparks.

import {
  LANE_WIDTH, METERS_PER_PIXEL, ORB, PLAYER, ROAD, SCORE, SECTOR_METERS, SPEED, TRAFFIC, laneCenter,
} from './config.js';
import { chance, integer, makeRandom, pick, range } from './random.js';

export const EVENT_CRASH = 1;
export const EVENT_ORB = 2;
export const EVENT_NEAR_MISS = 4;
export const EVENT_SECTOR = 8;
export const EVENT_OVER = 16;

/** A fresh run's whole state; reset() deals it again from a seed. */
export function createWorld(seed) {
  return {
    next: makeRandom(seed),
    time: 0,
    scroll: 0,
    distance: 0,
    score: 0,
    combo: 0,
    bestCombo: 0,
    nearMisses: 0,
    cells: 0,
    sector: 1,
    hull: PLAYER.hull,
    speed: SPEED.start,
    nitro: 55,
    nitroActive: false,
    invulnerable: 0,
    shake: 0,
    over: false,
    player: { x: laneCenter(1) + LANE_WIDTH / 2, y: PLAYER.startY, width: PLAYER.width, height: PLAYER.height },
    traffic: [],
    orbs: [],
    floaters: [],
    spawnTimer: 0.6,
    orbTimer: 1.4,
    events: [],
  };
}

/** Start the world over from a seed, as a new run or a staged scene. */
export function resetWorld(world, seed) {
  const fresh = createWorld(seed);
  for (const key of Object.keys(fresh)) world[key] = fresh[key];
  return world;
}

/** Do two boxes overlap, shrunk a little so a near thing is not a hit? */
function overlaps(a, b, shrink) {
  const aw = a.width * shrink;
  const ah = a.height * shrink;
  const bw = b.width * shrink;
  const bh = b.height * shrink;
  return Math.abs(a.x - b.x) * 2 < aw + bw && Math.abs(a.y - b.y) * 2 < ah + bh;
}

/** Note an event for the shell, with where it happened. */
function emit(world, type, x, y) {
  world.events.push({ type, x, y });
}

/** A floating score note that drifts up and fades in the renderer. */
function floater(world, x, y, text) {
  world.floaters.push({ x, y, text, age: 0 });
}

/** The road speed the current sector cruises at, before the player's own input. */
function sectorCruise(world) {
  return Math.min(SPEED.max, SPEED.cruise + (world.sector - 1) * SPEED.perSector);
}

/** The seconds between traffic spawns in the current sector. */
function spawnGap(world) {
  return Math.max(TRAFFIC.spawnFloor, TRAFFIC.spawnStart - (world.sector - 1) * TRAFFIC.spawnPerSector);
}

/** Deal one traffic vehicle above the screen, in a lane with room to arrive. */
function spawnTraffic(world) {
  const truck = chance(world.next, TRAFFIC.truckChance);
  const height = truck ? TRAFFIC.truckHeight : TRAFFIC.height;
  const lane = integer(world.next, 0, ROAD.lanes - 1);
  const x = laneCenter(lane) + range(world.next, -26, 26);
  const y = -height / 2 - range(world.next, 0, 130);
  for (const other of world.traffic) {
    if (Math.abs(other.x - x) < TRAFFIC.width && other.y < height) return;
  }
  world.traffic.push({
    x, y,
    width: TRAFFIC.width,
    height,
    speed: range(world.next, TRAFFIC.minSpeed, TRAFFIC.maxSpeed) * (truck ? 0.82 : 1),
    paint: pick(world.next, ['#22d3ee', '#7c5cff', '#ffb020', '#3ddc84', '#e8e8f2', '#ff6b4a']),
    truck,
    passed: false,
  });
}

/** Deal one energy cell, sometimes the first of a short line down a lane. */
function spawnOrb(world) {
  const lane = integer(world.next, 0, ROAD.lanes - 1);
  const x = laneCenter(lane);
  const count = chance(world.next, 0.4) ? 3 : 1;
  for (let i = 0; i < count; i += 1) {
    world.orbs.push({ x, y: -30 - i * 74, radius: ORB.radius, taken: false });
  }
}

/**
 * Advance the world one fixed step under the given driving input
 * ({steer: -1..1, gas, brake, nitro}) and return the events it caused.
 */
export function stepWorld(world, dt, input) {
  world.events.length = 0;
  updateFloaters(world, dt);
  if (world.over) return world.events;
  world.time += dt;

  // Road speed: ease toward the sector cruise, the player's throttle or the brake,
  // with nitro stacked on top while the meter lasts.
  let target = sectorCruise(world);
  if (input.gas) target = SPEED.max;
  if (input.brake) target = SPEED.start * 0.72;
  world.nitroActive = Boolean(input.nitro) && world.nitro > 0.5 && !input.brake;
  if (world.nitroActive) {
    target += SPEED.nitroBoost;
    world.nitro = Math.max(0, world.nitro - 26 * dt);
  } else {
    world.nitro = Math.min(100, world.nitro + 1.7 * dt);
  }
  const rate = target > world.speed ? 250 : 430;
  world.speed += Math.max(-rate * dt, Math.min(rate * dt, target - world.speed));

  // The player's car: steer across the road, lean up or down its band.
  const player = world.player;
  const grip = world.speed > SPEED.cruise + 130 ? 1.12 : 1;
  player.x += input.steer * PLAYER.steerRate * grip * dt;
  player.x = Math.max(ROAD.left + player.width / 2 + 6, Math.min(ROAD.right - player.width / 2 - 6, player.x));
  if (input.gas) player.y -= PLAYER.riseRate * 0.55 * dt;
  if (input.brake) player.y += PLAYER.riseRate * 0.55 * dt;
  if (!input.gas && !input.brake) player.y += (PLAYER.startY - player.y) * Math.min(1, 2.6 * dt);
  player.y = Math.max(PLAYER.minY, Math.min(PLAYER.maxY, player.y));

  // Distance and the score it carries, multiplied a little by the combo.
  const travel = world.speed * dt;
  world.scroll += travel;
  const meters = travel * METERS_PER_PIXEL;
  world.distance += meters;
  world.score += meters * SCORE.perMeter * (1 + world.combo * 0.08);
  const sector = Math.floor(world.distance / SECTOR_METERS) + 1;
  if (sector > world.sector) {
    world.sector = sector;
    emit(world, EVENT_SECTOR, player.x, player.y - 90);
    floater(world, player.x, player.y - 110, 'SECTOR ' + sector);
  }

  // New arrivals.
  world.spawnTimer -= dt;
  if (world.spawnTimer <= 0) {
    spawnTraffic(world);
    world.spawnTimer = spawnGap(world) * range(world.next, 0.72, 1.3);
  }
  world.orbTimer -= dt;
  if (world.orbTimer <= 0) {
    spawnOrb(world);
    world.orbTimer = range(world.next, 1.5, 3.1);
  }

  stepTraffic(world, dt);
  stepOrbs(world, dt);
  world.invulnerable = Math.max(0, world.invulnerable - dt);
  world.shake = Math.max(0, world.shake - 42 * dt);
  return world.events;
}

/** Move the traffic, and settle passes, near misses and crashes against the player. */
function stepTraffic(world, dt) {
  const player = world.player;
  const kept = [];
  for (const car of world.traffic) {
    car.y += (world.speed - car.speed) * dt;
    if (car.y - car.height / 2 > 880) continue;
    if (!car.passed && car.y - car.height / 2 > player.y + player.height / 2) {
      car.passed = true;
      const edgeGap = Math.abs(car.x - player.x) - (car.width + player.width) / 2;
      if (!car.counted && edgeGap > -4 && edgeGap < 36) {
        car.counted = true;
        world.combo = Math.min(SCORE.comboCap, world.combo + 1);
        world.bestCombo = Math.max(world.bestCombo, world.combo);
        world.nearMisses += 1;
        world.nitro = Math.min(100, world.nitro + 9);
        const points = SCORE.nearMiss + world.combo * 20;
        world.score += points;
        emit(world, EVENT_NEAR_MISS, player.x, player.y - 80);
        floater(world, player.x, player.y - 96, 'NEAR MISS +' + points);
      }
    }
    if (world.invulnerable <= 0 && overlaps(player, car, 0.78)) {
      car.counted = true;
      world.hull -= 1;
      world.combo = 0;
      world.speed = Math.max(SPEED.crashFloor, world.speed * 0.38);
      world.invulnerable = 1.6;
      world.shake = 15;
      emit(world, EVENT_CRASH, (player.x + car.x) / 2, (player.y + car.y) / 2);
      if (world.hull <= 0) {
        world.over = true;
        emit(world, EVENT_OVER, player.x, player.y);
      }
    }
    kept.push(car);
  }
  world.traffic = kept;
}

/** Move the cells with the road and collect the ones the player touches. */
function stepOrbs(world, dt) {
  const player = world.player;
  const kept = [];
  for (const orb of world.orbs) {
    orb.y += world.speed * dt;
    if (orb.y - orb.radius > 830) continue;
    const box = { x: orb.x, y: orb.y, width: orb.radius * 2, height: orb.radius * 2 };
    if (overlaps(player, box, 0.95)) {
      world.cells += 1;
      world.score += ORB.score;
      world.nitro = Math.min(100, world.nitro + ORB.nitro);
      emit(world, EVENT_ORB, orb.x, orb.y);
      floater(world, orb.x, orb.y - 24, '+' + ORB.score);
      continue;
    }
    kept.push(orb);
  }
  world.orbs = kept;
}

/** Age the floating score notes and drop the faded ones. */
function updateFloaters(world, dt) {
  const kept = [];
  for (const note of world.floaters) {
    note.age += dt;
    note.y -= 36 * dt;
    if (note.age < 1.1) kept.push(note);
  }
  world.floaters = kept;
}
