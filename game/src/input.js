// Keyboard state for the game: which keys are held, and which were newly pressed
// since the last frame, so menus can react to a tap while driving reads the held set.

const held = new Set();
const tapped = new Set();

/** Keys the game uses; the page must not scroll or browse away on them. */
const GAME_KEYS = new Set([
  'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Space',
  'KeyA', 'KeyD', 'KeyW', 'KeyS', 'ShiftLeft', 'ShiftRight',
  'Enter', 'KeyR', 'KeyP', 'KeyM', 'Escape',
]);

/** Start listening on a window; safe to call once at boot. */
export function attachInput(target) {
  target.addEventListener('keydown', (event) => {
    if (GAME_KEYS.has(event.code)) event.preventDefault();
    if (!event.repeat) tapped.add(event.code);
    held.add(event.code);
  });
  target.addEventListener('keyup', (event) => {
    held.delete(event.code);
  });
  target.addEventListener('blur', () => {
    held.clear();
    tapped.clear();
  });
}

/** True while any of the given key codes is held down. */
export function isDown(...codes) {
  return codes.some((code) => held.has(code));
}

/** True if any of the given codes was tapped since the last clearTaps. */
export function wasTapped(...codes) {
  return codes.some((code) => tapped.has(code));
}

/** Forget the taps of the frame that just ended. */
export function clearTaps() {
  tapped.clear();
}

/** The driving input for one step, read from the held keys. */
export function driveInput() {
  return {
    steer: (isDown('ArrowRight', 'KeyD') ? 1 : 0) - (isDown('ArrowLeft', 'KeyA') ? 1 : 0),
    gas: isDown('ArrowUp', 'KeyW'),
    brake: isDown('ArrowDown', 'KeyS'),
    nitro: isDown('ShiftLeft', 'ShiftRight', 'Space'),
  };
}
