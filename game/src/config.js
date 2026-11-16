// Neon Freeway tuning: every number the rest of the game reads lives here, so the
// simulation, the renderer and the screenshot staging all agree on the same world.

/** The canvas is a fixed stage; CSS stretches it to the window. */
export const VIEW = { width: 1280, height: 800 };

/** The simulation advances in fixed steps, so a run replays step for step. */
export const STEP = 1 / 60;

/** The road the player may drive on, and the lanes traffic settles into. */
export const ROAD = { left: 330, right: 950, lanes: 4 };
export const LANE_WIDTH = (ROAD.right - ROAD.left) / ROAD.lanes;

/** The centre line of a lane, counting from 0 at the left. */
export function laneCenter(lane) {
  return ROAD.left + LANE_WIDTH * (lane + 0.5);
}

/** The player's car: its size, its band of the screen and how hard it steers. */
export const PLAYER = {
  width: 62,
  height: 108,
  startY: 640,
  minY: 452,
  maxY: 700,
  steerRate: 620,
  riseRate: 300,
  hull: 3,
};

/** Road speed in pixels a second: where a run starts, cruises and tops out. */
export const SPEED = {
  start: 320,
  cruise: 545,
  max: 850,
  perSector: 44,
  nitroBoost: 265,
  crashFloor: 210,
};

/** Traffic: car and truck sizes, their own road speeds, and how the flow thickens. */
export const TRAFFIC = {
  width: 62,
  height: 108,
  truckHeight: 176,
  minSpeed: 118,
  maxSpeed: 246,
  truckChance: 0.16,
  spawnStart: 1.02,
  spawnFloor: 0.4,
  spawnPerSector: 0.055,
};

/** Energy cells: what one is worth in points and in nitro. */
export const ORB = { radius: 13, score: 150, nitro: 17 };

/** Scoring: the worth of a metre, a near miss and a cell, and the combo cap. */
export const SCORE = { perMeter: 1, nearMiss: 120, comboCap: 12 };

/** Distance is counted in metres; this many pixels of road make one. */
export const METERS_PER_PIXEL = 0.045;

/** A new sector (faster, denser) every this many metres. */
export const SECTOR_METERS = 1000;

/** The displayed speedometer reading for a road speed. */
export function kmh(speed) {
  return Math.round(speed * 0.16);
}

/** The night palette: road, neon and the paint jobs traffic wears. */
export const COLORS = {
  sky: '#07060e',
  asphalt: '#171824',
  asphaltEdge: '#23233a',
  lanePaint: '#8f9bb3',
  neonPink: '#ff2e88',
  neonCyan: '#22d3ee',
  neonAmber: '#ffb020',
  playerPaint: '#ff2e88',
  trafficPaints: ['#22d3ee', '#7c5cff', '#ffb020', '#3ddc84', '#e8e8f2', '#ff6b4a'],
};
