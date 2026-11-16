// A small seeded random source (mulberry32): the same seed always deals the same
// traffic, so staged screenshots and test drives are reproducible.

/** Make a generator from a seed; each call returns a float in [0, 1). */
export function makeRandom(seed) {
  let state = seed >>> 0;
  return function next() {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** A float in [min, max) from the generator. */
export function range(next, min, max) {
  return min + next() * (max - min);
}

/** An integer in [min, max] (both ends included) from the generator. */
export function integer(next, min, max) {
  return min + Math.floor(next() * (max - min + 1));
}

/** One element of a list, chosen by the generator. */
export function pick(next, list) {
  return list[Math.floor(next() * list.length)];
}

/** True with the given probability, read from the generator. */
export function chance(next, probability) {
  return next() < probability;
}
