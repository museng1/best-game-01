// Everything Neon Freeway draws: the night road and its city, the cars, the HUD and
// the screens (title, countdown, pause, results). The simulation lives in world.js;
// this file only reads its state and paints it, one clear helper per thing drawn.

import { COLORS, ROAD, VIEW, kmh, laneCenter } from './config.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_OVER = 'over';

/** A rounded rectangle path, the shape every car and panel is built from. */
function roundRect(ctx, x, y, width, height, radius) {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + width, y, x + width, y + height, r);
  ctx.arcTo(x + width, y + height, x, y + height, r);
  ctx.arcTo(x, y + height, x, y, r);
  ctx.arcTo(x, y, x + width, y, r);
  ctx.closePath();
}

/** Centred text with a soft neon glow, the game's one type treatment. */
function glowText(ctx, text, x, y, size, color, align = 'center') {
  ctx.font = '700 ' + size + 'px "Segoe UI", system-ui, sans-serif';
  ctx.textAlign = align;
  ctx.textBaseline = 'middle';
  ctx.shadowColor = color;
  ctx.shadowBlur = 18;
  ctx.fillStyle = color;
  ctx.fillText(text, x, y);
  ctx.shadowBlur = 0;
}

/** Plain centred text with no glow, for body copy and readouts. */
function plainText(ctx, text, x, y, size, color, align = 'center', weight = 600) {
  ctx.font = weight + ' ' + size + 'px "Segoe UI", system-ui, sans-serif';
  ctx.textAlign = align;
  ctx.textBaseline = 'middle';
  ctx.fillStyle = color;
  ctx.fillText(text, x, y);
}

/** A positive modulo, for hashing block indexes that run below zero. */
function mod(n, m) {
  return ((n % m) + m) % m;
}

/** The ground either side of the road: dark blocks with rooftops sliding past. */
function drawCity(ctx, world) {
  const gradient = ctx.createLinearGradient(0, 0, 0, VIEW.height);
  gradient.addColorStop(0, '#0a0618');
  gradient.addColorStop(0.55, '#100b26');
  gradient.addColorStop(1, '#07060e');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, VIEW.width, VIEW.height);
  drawBlockStrip(ctx, world.scroll, 10, ROAD.left - 24, COLORS.neonPink);
  drawBlockStrip(ctx, world.scroll, ROAD.right + 24, VIEW.width - 10, COLORS.neonCyan);
}

/** One strip of city blocks: rooftops with vents, lit dots and a neon sign or two. */
function drawBlockStrip(ctx, scroll, from, to, neon) {
  const unit = 168;
  const base = Math.floor(scroll / unit);
  const shift = scroll - base * unit;
  for (let i = -1; i * unit < VIEW.height + unit; i += 1) {
    const index = base + i;
    const y = i * unit - shift;
    const inset = 8 + mod(index * 37, 26);
    const x = from + inset;
    const width = to - from - inset * 2;
    if (width < 30) continue;
    ctx.fillStyle = '#12101f';
    ctx.fillRect(x, y + 7, width, unit - 14);
    ctx.fillStyle = '#1a1830';
    ctx.fillRect(x + 9, y + 16, width - 18, unit - 32);
    ctx.fillStyle = 'rgba(232,232,242,0.16)';
    for (let d = 0; d < 4; d += 1) {
      if (mod(index * 13 + d * 29, 3) === 0) continue;
      ctx.fillRect(x + 16 + mod(index * 17 + d * 41, Math.max(20, width - 40)), y + 26 + d * 30, 9, 9);
    }
    if (mod(index * 53, 4) === 0) {
      ctx.fillStyle = neon;
      ctx.globalAlpha = 0.75;
      ctx.fillRect(x + width - 5, y + 30, 3, unit - 60);
      ctx.globalAlpha = 1;
    }
  }
}

/** The asphalt: surface, glowing edges, lane dashes and roadside light posts. */
function drawRoad(ctx, world) {
  ctx.fillStyle = COLORS.asphalt;
  ctx.fillRect(ROAD.left, 0, ROAD.right - ROAD.left, VIEW.height);
  ctx.fillStyle = COLORS.asphaltEdge;
  ctx.fillRect(ROAD.left - 14, 0, 14, VIEW.height);
  ctx.fillRect(ROAD.right, 0, 14, VIEW.height);
  ctx.fillStyle = COLORS.neonPink;
  ctx.fillRect(ROAD.left - 3, 0, 3, VIEW.height);
  ctx.fillStyle = COLORS.neonCyan;
  ctx.fillRect(ROAD.right, 0, 3, VIEW.height);

  // Lane dashes, wrapped by the scroll so they pour toward the player.
  const dash = 54;
  const gap = 44;
  const cycle = dash + gap;
  const shift = world.scroll % cycle;
  ctx.fillStyle = COLORS.lanePaint;
  ctx.globalAlpha = 0.55;
  for (let lane = 1; lane < 4; lane += 1) {
    const x = laneCenter(lane) - (laneCenter(1) - laneCenter(0)) / 2 - 3;
    for (let y = -cycle + shift; y < VIEW.height + cycle; y += cycle) {
      ctx.fillRect(x, y, 6, dash);
    }
  }
  ctx.globalAlpha = 1;

  // Light posts on both kerbs.
  const postCycle = 118;
  const postShift = world.scroll % postCycle;
  for (let y = -postCycle + postShift; y < VIEW.height + postCycle; y += postCycle) {
    for (const x of [ROAD.left - 22, ROAD.right + 22]) {
      ctx.fillStyle = '#ffb020';
      ctx.shadowColor = '#ffb020';
      ctx.shadowBlur = 12;
      ctx.beginPath();
      ctx.arc(x, y, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
    }
  }
}

/** One energy cell: a pulsing cyan diamond in a soft halo. */
function drawOrb(ctx, orb, time) {
  const pulse = 1 + Math.sin(time * 5 + orb.x) * 0.12;
  const r = orb.radius * pulse;
  ctx.fillStyle = 'rgba(34,211,238,0.18)';
  ctx.beginPath();
  ctx.arc(orb.x, orb.y, r * 2.1, 0, Math.PI * 2);
  ctx.fill();
  ctx.save();
  ctx.translate(orb.x, orb.y);
  ctx.rotate(Math.PI / 4);
  ctx.fillStyle = COLORS.neonCyan;
  ctx.shadowColor = COLORS.neonCyan;
  ctx.shadowBlur = 14;
  ctx.fillRect(-r * 0.72, -r * 0.72, r * 1.44, r * 1.44);
  ctx.restore();
  ctx.shadowBlur = 0;
  ctx.fillStyle = '#e8fbff';
  ctx.beginPath();
  ctx.arc(orb.x, orb.y, 3.4, 0, Math.PI * 2);
  ctx.fill();
}

/**
 * One car seen from behind-above: body, cabin, glass, lights and wheels.
 * Traffic shows its tail-lights; the player's car adds a spoiler and a light bar.
 */
function drawCar(ctx, car, isPlayer, invulnerable, time) {
  const { x, y, width, height } = car;
  const left = x - width / 2;
  const top = y - height / 2;
  if (invulnerable && Math.floor(time * 14) % 2 === 0) ctx.globalAlpha = 0.35;
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  roundRect(ctx, left + 4, top + 7, width, height, 14);
  ctx.fill();
  ctx.fillStyle = car.paint;
  roundRect(ctx, left, top, width, height, 14);
  ctx.fill();
  // Cabin and glass.
  ctx.fillStyle = 'rgba(10,10,24,0.85)';
  roundRect(ctx, left + 8, top + height * 0.3, width - 16, height * 0.3, 8);
  ctx.fill();
  ctx.fillStyle = 'rgba(160,220,255,0.5)';
  roundRect(ctx, left + 11, top + height * 0.33, width - 22, height * 0.1, 5);
  ctx.fill();
  // Roof panel and centre stripe.
  ctx.fillStyle = 'rgba(255,255,255,0.13)';
  roundRect(ctx, left + 13, top + height * 0.62, width - 26, height * 0.2, 6);
  ctx.fill();
  // Wheels.
  ctx.fillStyle = '#0a0a12';
  const wheelW = 7;
  const wheelH = height * 0.18;
  for (const [wx, wy] of [[left - 3, top + height * 0.12], [left + width - wheelW + 3, top + height * 0.12], [left - 3, top + height * 0.7], [left + width - wheelW + 3, top + height * 0.7]]) {
    ctx.fillRect(wx, wy, wheelW, wheelH);
  }
  // Tail-lights: the end the player sees.
  ctx.fillStyle = '#ff2244';
  ctx.shadowColor = '#ff2244';
  ctx.shadowBlur = isPlayer ? 16 : 10;
  ctx.fillRect(left + 5, top + height - 9, width * 0.26, 5);
  ctx.fillRect(left + width * 0.69, top + height - 9, width * 0.26, 5);
  ctx.shadowBlur = 0;
  if (isPlayer) {
    ctx.fillStyle = '#0d0d18';
    ctx.fillRect(left - 3, top + height - 22, width + 6, 7);
    ctx.fillStyle = COLORS.neonPink;
    ctx.fillRect(left + 4, top + height - 4, width - 8, 3);
  }
  ctx.globalAlpha = 1;
}

/** The floating score notes the world leaves behind. */
function drawFloaters(ctx, world) {
  for (const note of world.floaters) {
    ctx.globalAlpha = Math.max(0, 1 - note.age / 1.1);
    plainText(ctx, note.text, note.x, note.y, 21, '#ffe066');
  }
  ctx.globalAlpha = 1;
}

/** The heads-up display: score, sector and distance, speed, hull and nitro. */
function drawHud(ctx, world, view) {
  ctx.fillStyle = 'rgba(5,4,14,0.55)';
  ctx.fillRect(0, 0, VIEW.width, 64);
  plainText(ctx, 'SCORE', 36, 22, 15, '#8f9bb3', 'left');
  plainText(ctx, String(Math.floor(world.score)).padStart(6, '0'), 36, 46, 27, '#ffffff', 'left');
  plainText(ctx, 'SECTOR ' + world.sector, VIEW.width / 2, 22, 15, '#8f9bb3');
  plainText(ctx, Math.floor(world.distance) + ' m', VIEW.width / 2, 46, 24, '#ffffff');
  if (world.combo >= 2) {
    glowText(ctx, 'COMBO ×' + world.combo, VIEW.width / 2, 84, 22, '#ffe066');
  }
  plainText(ctx, 'SPEED', VIEW.width - 36, 22, 15, '#8f9bb3', 'right');
  plainText(ctx, kmh(world.speed) + ' km/h', VIEW.width - 36, 46, 27, world.nitroActive ? '#22d3ee' : '#ffffff', 'right');

  // Hull pips, bottom left: one lit wedge per point of hull left.
  plainText(ctx, 'HULL', 36, VIEW.height - 52, 14, '#8f9bb3', 'left');
  for (let i = 0; i < 3; i += 1) {
    ctx.fillStyle = i < world.hull ? COLORS.neonPink : 'rgba(255,46,136,0.18)';
    roundRect(ctx, 36 + i * 30, VIEW.height - 40, 24, 14, 4);
    ctx.fill();
  }
  // Nitro meter, bottom right.
  plainText(ctx, 'NITRO — SHIFT', VIEW.width - 36, VIEW.height - 52, 14, '#8f9bb3', 'right');
  ctx.fillStyle = 'rgba(34,211,238,0.16)';
  roundRect(ctx, VIEW.width - 236, VIEW.height - 40, 200, 14, 7);
  ctx.fill();
  ctx.fillStyle = COLORS.neonCyan;
  if (world.nitro > 0.5) {
    roundRect(ctx, VIEW.width - 236, VIEW.height - 40, Math.max(14, 200 * world.nitro / 100), 14, 7);
    ctx.fill();
  }
  if (view.muted) plainText(ctx, 'SOUND OFF (M)', VIEW.width / 2, VIEW.height - 30, 14, '#8f9bb3');
}

/** The title screen over the attract-mode road. */
function drawTitle(ctx, world, view) {
  ctx.fillStyle = 'rgba(4,3,12,0.45)';
  ctx.fillRect(0, 0, VIEW.width, VIEW.height);
  glowText(ctx, 'NEON', VIEW.width / 2, 148, 92, COLORS.neonCyan);
  glowText(ctx, 'FREEWAY', VIEW.width / 2, 232, 92, COLORS.neonPink);
  plainText(ctx, 'Thread the midnight traffic. Graze it, don\'t kiss it.', VIEW.width / 2, 292, 22, '#e8e8f2');
  const lines = [
    '← →  or  A D — steer        ↑ W — floor it        ↓ S — brake',
    'SHIFT or SPACE — nitro (near misses and cells refill it)',
    'Graze a car for a NEAR MISS combo — three hits and you\'re wrecked',
    'Every 1000 m the freeway gets faster and thicker. How far can you get?',
  ];
  lines.forEach((line, i) => plainText(ctx, line, VIEW.width / 2, 356 + i * 30, 19, '#aab4cc'));
  if (world.time % 1.25 < 0.8) {
    glowText(ctx, 'PRESS ENTER TO RIDE', VIEW.width / 2, 520, 30, '#ffe066');
  }
  if (view.best > 0) plainText(ctx, 'BEST  ' + Math.floor(view.best), VIEW.width / 2, 566, 20, '#8f9bb3');
  plainText(ctx, 'P — pause · M — sound · a make.fun best-game-01 entry', VIEW.width / 2, VIEW.height - 28, 15, '#5d6680');
}

/** The results screen: what the run earned, and the way back in. */
function drawOver(ctx, world, view) {
  ctx.fillStyle = 'rgba(4,3,12,0.62)';
  ctx.fillRect(0, 0, VIEW.width, VIEW.height);
  glowText(ctx, 'WRECKED', VIEW.width / 2, 150, 76, '#ff2244');
  const rows = [
    ['SCORE', String(Math.floor(world.score))],
    ['DISTANCE', Math.floor(world.distance) + ' m'],
    ['SECTOR REACHED', String(world.sector)],
    ['NEAR MISSES', String(world.nearMisses)],
    ['CELLS COLLECTED', String(world.cells)],
    ['BEST COMBO', '×' + world.bestCombo],
    ['ALL-TIME BEST', String(Math.floor(Math.max(view.best, world.score)))],
  ];
  rows.forEach(([label, value], i) => {
    plainText(ctx, label, VIEW.width / 2 - 170, 226 + i * 40, 20, '#8f9bb3', 'left');
    plainText(ctx, value, VIEW.width / 2 + 170, 226 + i * 40, 22, '#ffffff', 'right');
  });
  if (world.time % 1.25 < 0.8) {
    glowText(ctx, 'PRESS ENTER OR R TO DRIVE AGAIN', VIEW.width / 2, 560, 26, '#ffe066');
  }
}

/** Paint one whole frame: the world, then the HUD or the screen over it. */
export function drawScene(ctx, world, view) {
  ctx.save();
  if (world.shake > 0.2) {
    ctx.translate(Math.sin(world.time * 91) * world.shake * 0.45, Math.cos(world.time * 83) * world.shake * 0.45);
  }
  drawCity(ctx, world);
  drawRoad(ctx, world);
  for (const orb of world.orbs) drawOrb(ctx, orb, world.time);
  for (const car of world.traffic) drawCar(ctx, car, false, false, world.time);
  drawCar(ctx, { ...world.player, paint: COLORS.playerPaint }, true, world.invulnerable > 0, world.time);
  if (view.particles) view.particles.draw(ctx);
  drawFloaters(ctx, world);
  ctx.restore();

  if (view.screen === SCREEN_TITLE) drawTitle(ctx, world, view);
  if (view.screen === SCREEN_OVER) drawOver(ctx, world, view);
  if (view.screen === SCREEN_PLAY) {
    drawHud(ctx, world, view);
    if (view.countdown > 0) {
      glowText(ctx, view.countdown >= 1 ? String(Math.ceil(view.countdown)) : 'GO!', VIEW.width / 2, 300, 110, '#ffe066');
    }
    if (view.paused) {
      ctx.fillStyle = 'rgba(4,3,12,0.55)';
      ctx.fillRect(0, 0, VIEW.width, VIEW.height);
      glowText(ctx, 'PAUSED', VIEW.width / 2, 360, 54, '#ffffff');
      plainText(ctx, 'P to resume', VIEW.width / 2, 420, 22, '#aab4cc');
    }
  }
}
