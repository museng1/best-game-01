// A tiny pooled particle system: crash sparks, nitro exhaust, cell sparkles and
// tyre smoke all live here, so the world only has to say where something happened.

const MAX_PARTICLES = 420;

export class Particles {
  constructor() {
    this.items = [];
  }

  /** Add one particle with the given motion, life and look. */
  spawn(x, y, vx, vy, life, size, color, drag = 0, gravity = 0) {
    if (this.items.length >= MAX_PARTICLES) this.items.shift();
    this.items.push({ x, y, vx, vy, life, age: 0, size, color, drag, gravity });
  }

  /** A fan of hot sparks where metal met metal. */
  burst(x, y, next) {
    for (let i = 0; i < 26; i += 1) {
      const angle = next() * Math.PI * 2;
      const speed = 90 + next() * 320;
      this.spawn(x, y, Math.cos(angle) * speed, Math.sin(angle) * speed,
        0.35 + next() * 0.5, 2 + next() * 3, next() < 0.5 ? '#ffd166' : '#ff6b4a', 2.2, 300);
    }
    for (let i = 0; i < 10; i += 1) {
      this.spawn(x + (next() - 0.5) * 30, y + (next() - 0.5) * 30,
        (next() - 0.5) * 60, -40 - next() * 80, 0.7 + next() * 0.6, 8 + next() * 12, 'rgba(120,124,150,0.5)', 1.2, -60);
    }
  }

  /** A ring of cyan sparkles when a cell is collected. */
  sparkle(x, y, next) {
    for (let i = 0; i < 14; i += 1) {
      const angle = (i / 14) * Math.PI * 2 + next() * 0.3;
      const speed = 70 + next() * 90;
      this.spawn(x, y, Math.cos(angle) * speed, Math.sin(angle) * speed,
        0.3 + next() * 0.25, 2 + next() * 2, '#22d3ee', 2.6, 0);
    }
  }

  /** Twin exhaust flames while the nitro burns. */
  exhaust(x, y, next) {
    for (let i = 0; i < 2; i += 1) {
      const side = i === 0 ? -13 : 13;
      this.spawn(x + side + (next() - 0.5) * 4, y, (next() - 0.5) * 30, 260 + next() * 120,
        0.16 + next() * 0.14, 5 + next() * 6, next() < 0.5 ? '#22d3ee' : '#ff2e88', 0.4, 0);
    }
  }

  /** Advance every live particle; dead ones are dropped. */
  update(dt) {
    const alive = [];
    for (const p of this.items) {
      p.age += dt;
      if (p.age >= p.life) continue;
      const dragFactor = Math.max(0, 1 - p.drag * dt);
      p.vx *= dragFactor;
      p.vy = p.vy * dragFactor + p.gravity * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      alive.push(p);
    }
    this.items = alive;
  }

  /** Draw every particle as a fading disc. */
  draw(ctx) {
    for (const p of this.items) {
      const fade = 1 - p.age / p.life;
      ctx.globalAlpha = Math.max(0, fade);
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * (0.5 + fade * 0.5), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
}
