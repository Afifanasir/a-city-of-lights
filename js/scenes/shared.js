// Pre-rendered soft radial sprite (for steam, mist, smoke, halos). Drawn with drawImage,
// which is far cheaper than building a gradient per particle per frame.
export function softSprite(size, rgb, falloff = [1, 0.45, 0]) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const g = c.getContext('2d');
  const grad = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  grad.addColorStop(0, `rgba(${rgb},${falloff[0]})`);
  grad.addColorStop(0.5, `rgba(${rgb},${falloff[1]})`);
  grad.addColorStop(1, `rgba(${rgb},${falloff[2]})`);
  g.fillStyle = grad;
  g.fillRect(0, 0, size, size);
  return c;
}

// Wispy smoke puff: dozens of small soft blobs scattered unevenly inside a circle,
// so a puff reads as cloudy vapour instead of a perfect round gradient.
export function smokeSprite(size, rgb, seed = 1) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const g = c.getContext('2d');
  let s = seed * 9301;
  const rnd = () => ((s = (s * 9301 + 49297) % 233280) / 233280);
  for (let i = 0; i < 46; i++) {
    const a = rnd() * Math.PI * 2, d = Math.sqrt(rnd()) * size * 0.32;
    const x = size / 2 + Math.cos(a) * d, y = size / 2 + Math.sin(a) * d * 0.85;
    const r = size * (0.08 + rnd() * 0.16);
    const grad = g.createRadialGradient(x, y, 0, x, y, r);
    const al = 0.1 + rnd() * 0.22;
    grad.addColorStop(0, `rgba(${rgb},${al})`);
    grad.addColorStop(1, `rgba(${rgb},0)`);
    g.fillStyle = grad;
    g.fillRect(x - r, y - r, r * 2, r * 2);
  }
  return c;
}
