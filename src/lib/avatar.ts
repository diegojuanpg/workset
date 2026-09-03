// Deterministic Workset avatar: pixelated gradient SVG from a seed (user id).
// A grid of cells interpolates between two palette colors with per-cell jitter —
// echoes the pixel brand mark. No storage; rendered as a data URI.

const PALETTE = [
  "#ff4d4d",
  "#f5a623",
  "#f8e71c",
  "#7ed321",
  "#50e3c2",
  "#4a90d9",
  "#bd10e0",
  "#ff0080",
];

const GRID = 6;
const CELL = 16;

function hash(seed: string): number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return h;
}

// Small deterministic PRNG (LCG) so every cell gets stable jitter.
function makeRandom(state: number): () => number {
  let s = state >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function lerpChannel(a: number, b: number, t: number): number {
  return Math.round(a + (b - a) * t);
}

function mix(c1: string, c2: string, t: number): string {
  const r = lerpChannel(parseInt(c1.slice(1, 3), 16), parseInt(c2.slice(1, 3), 16), t);
  const g = lerpChannel(parseInt(c1.slice(3, 5), 16), parseInt(c2.slice(3, 5), 16), t);
  const b = lerpChannel(parseInt(c1.slice(5, 7), 16), parseInt(c2.slice(5, 7), 16), t);
  return `#${((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1)}`;
}

// Same seed always yields the same URI, and every render of a roster row asks for it again —
// 36 rects, a string build and an encodeURIComponent each time. Keyed by athlete/user id, so the
// map is bounded by the roster.
// ponytail: unbounded Map, swap for an LRU if a seed space ever outgrows one coach's roster.
const cache = new Map<string, string>();

export function generatedAvatarDataUri(seed: string): string {
  const cached = cache.get(seed);
  if (cached !== undefined) return cached;

  const h = hash(seed);
  const i1 = h % PALETTE.length;
  // Always two distinct palette colors so the gradient reads on any background.
  const i2 = (i1 + 1 + ((h >>> 3) % (PALETTE.length - 1))) % PALETTE.length;
  const c1 = PALETTE[i1];
  const c2 = PALETTE[i2];
  const random = makeRandom(h);
  // Diagonal direction flips per user so grids don't all flow the same way.
  const flip = (h >>> 5) % 2 === 1;

  let rects = "";
  for (let y = 0; y < GRID; y++) {
    for (let x = 0; x < GRID; x++) {
      const gx = flip ? GRID - 1 - x : x;
      const base = (gx + y) / (2 * (GRID - 1));
      const jitter = (random() - 0.5) * 0.35;
      const t = Math.min(1, Math.max(0, base + jitter));
      rects += `<rect x="${x * CELL}" y="${y * CELL}" width="${CELL}" height="${CELL}" fill="${mix(c1, c2, t)}"/>`;
    }
  }

  const size = GRID * CELL;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" shape-rendering="crispEdges">${rects}</svg>`;
  const uri = `data:image/svg+xml,${encodeURIComponent(svg)}`;
  cache.set(seed, uri);
  return uri;
}
