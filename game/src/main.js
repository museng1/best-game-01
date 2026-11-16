// Neon Freeway's shell: owns the canvas, the screen state machine (title, countdown,
// play, pause, results), the sound and the particles, and steps the world at a fixed
// rate. With ?shot=<scene> it stages one deterministic frame for the screenshots.

import { STEP, VIEW } from './config.js';
import { attachInput, clearTaps, driveInput, wasTapped } from './input.js';
import { SoundEngine } from './audio.js';
import { Particles } from './particles.js';
import {
  EVENT_CRASH, EVENT_NEAR_MISS, EVENT_ORB, EVENT_OVER, EVENT_SECTOR,
  createWorld, resetWorld, stepWorld,
} from './world.js';
import { SCREEN_OVER, SCREEN_PLAY, SCREEN_TITLE, drawScene } from './render.js';
import { carefulInput, stageShot } from './shots.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
canvas.width = VIEW.width;
canvas.height = VIEW.height;
const statusLine = document.getElementById('status');

const sound = new SoundEngine();
const particles = new Particles();
const world = createWorld(20261115);
let screen = SCREEN_TITLE;
let countdown = 0;
let goFlash = 0;
let paused = false;
let muted = false;
let best = 0;
try {
  best = Number(window.localStorage.getItem('neon-freeway-best')) || 0;
} catch {
  best = 0;
}

/** Say a line where screen readers (and the page's status element) can find it. */
function announce(text) {
  if (statusLine) statusLine.textContent = text;
}

/** Keep the best score across visits, where storage is allowed. */
function saveBest() {
  if (world.score <= best) return;
  best = Math.floor(world.score);
  try {
    window.localStorage.setItem('neon-freeway-best', String(best));
  } catch {
    /* storage can be refused; the best then lasts the session */
  }
}

/** Begin a fresh run: a new world, a countdown, the engine started. */
function startRun() {
  resetWorld(world, (Math.random() * 1e9) | 0);
  screen = SCREEN_PLAY;
  countdown = 3;
  goFlash = 0;
  paused = false;
  sound.unlock();
  sound.startEngine();
  announce('Get ready. Three, two, one.');
}

/** Turn the world's events into sound and sparks during a real run. */
function handleEvents(events) {
  for (const event of events) {
    if (event.type === EVENT_CRASH) {
      particles.burst(event.x, event.y, Math.random);
      sound.crash();
    } else if (event.type === EVENT_ORB) {
      particles.sparkle(event.x, event.y, Math.random);
      sound.pickup();
    } else if (event.type === EVENT_NEAR_MISS) {
      sound.nearMiss();
    } else if (event.type === EVENT_SECTOR) {
      sound.sector();
    } else if (event.type === EVENT_OVER) {
      saveBest();
      sound.gameOver();
      sound.stopEngine();
      screen = SCREEN_OVER;
      announce('Wrecked. Score ' + Math.floor(world.score) + '. Press Enter to drive again.');
    }
  }
}

/** The attract mode behind the title: the careful pilot drives, wrecks reset it. */
function stepAttract() {
  const events = stepWorld(world, STEP, carefulInput(world));
  for (const event of events) {
    if (event.type === EVENT_ORB) particles.sparkle(event.x, event.y, Math.random);
    if (event.type === EVENT_CRASH) particles.burst(event.x, event.y, Math.random);
  }
  if (world.over) resetWorld(world, (Math.random() * 1e9) | 0);
}

/** One frame of the live game: fixed steps, taps, then the drawing. */
let lastTime = performance.now();
let accumulator = 0;
function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min(0.1, (now - lastTime) / 1000);
  lastTime = now;
  accumulator += dt;
  while (accumulator >= STEP) {
    accumulator -= STEP;
    if (screen === SCREEN_TITLE) {
      stepAttract();
    } else if (screen === SCREEN_PLAY && !paused) {
      if (countdown > 0) {
        const before = Math.ceil(countdown);
        countdown -= STEP;
        if (Math.ceil(countdown) !== before && countdown > 0) sound.countBeep(false);
        if (countdown <= 0) {
          countdown = 0;
          goFlash = 0.7;
          sound.countBeep(true);
        }
      } else {
        handleEvents(stepWorld(world, STEP, driveInput()));
        if (world.nitroActive && !world.over) {
          particles.exhaust(world.player.x, world.player.y + world.player.height / 2 + 6, Math.random);
        }
      }
    }
    particles.update(STEP);
  }
  goFlash = Math.max(0, goFlash - dt);

  if (wasTapped('KeyM')) muted = sound.toggleMute();
  if (screen === SCREEN_TITLE && wasTapped('Enter')) startRun();
  else if (screen === SCREEN_OVER && wasTapped('Enter', 'KeyR')) startRun();
  else if (screen === SCREEN_PLAY && wasTapped('KeyP', 'Escape')) {
    paused = !paused;
    if (paused) sound.stopEngine();
    else if (countdown <= 0) sound.startEngine();
    announce(paused ? 'Paused.' : 'Driving.');
  }
  clearTaps();

  if (screen === SCREEN_PLAY && !paused) sound.update(Math.min(1, world.speed / 1100));
  drawScene(ctx, world, {
    screen,
    best,
    countdown: countdown > 0 ? countdown : goFlash > 0 ? 0.5 : 0,
    paused,
    muted,
    particles,
  });
}

// Screenshot staging (?shot=start|play|rush|end&seed=n) or the live game.
const params = new URLSearchParams(window.location.search);
const shotName = params.get('shot');
if (shotName) {
  resetWorld(world, Number(params.get('seed') || 1));
  const staged = stageShot(shotName, world);
  screen = staged.screen;
  best = staged.best;
  // Freeze the frame on a tidy instant: prompt text mid-blink-on, no crash shake.
  world.time = 100.4;
  world.shake = 0;
  const drawStaged = () => drawScene(ctx, world, {
    screen, best, countdown: 0, paused: false, muted: false, particles,
  });
  drawStaged();
  requestAnimationFrame(() => {
    drawStaged();
    window.__shotReady = true;
  });
} else {
  attachInput(window);
  window.__NEON = { world, startRun, get screen() { return screen; } };
  announce('Neon Freeway. Press Enter to ride.');
  requestAnimationFrame(frame);
}
