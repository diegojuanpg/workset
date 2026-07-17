// Deterministic Vercel-style avatar: pixelated gradient SVG from a seed (user id).
// No storage — rendered as a data URI wherever avatar_url is null.

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

function hash(seed: string): number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return h;
}

export function generatedAvatarDataUri(seed: string): string {
  const h = hash(seed);
  const c1 = PALETTE[h % PALETTE.length];
  const c2 = PALETTE[(h >> 3) % PALETTE.length];
  const angle = h % 360;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 80"><defs><linearGradient id="g" gradientTransform="rotate(${angle} .5 .5)"><stop offset="0%" stop-color="${c1}"/><stop offset="100%" stop-color="${c2}"/></linearGradient></defs><rect width="80" height="80" fill="url(#g)"/></svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}
