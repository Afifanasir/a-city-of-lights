import { px } from '../fx.js';
import { softSprite } from './shared.js';

// Midnight in the Old Town — warm and calm. While music plays the square settles to a
// night base and its own lights carry it:
//   lanterns + café windows  glow softly on the kick, staggered so a warm pulse moves
//                            through the square
//   stall string lights      twinkle bulb by bulb on the beat
//   table candles            flicker gently on hi-hats; their flames move
//   cathedral + rose window  swell once per bar; the clock face glows every 4th beat
//   wet cobblestones         reflections glow softly with the lights above them
// Ambient: banners sway, clouds drift, stars twinkle; the bunting glows on the beat.

export function create(fx) {
  fx.night(0.25);
  const warm = { min: 0.45, soft: 0.3 };
  const inPoly = (X, Y, poly) => { let c = false; for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) { const [xi, yi] = poly[i], [xj, yj] = poly[j]; if ((yi > Y) !== (yj > Y) && X < (xj - xi) * (Y - yi) / (yj - yi) + xi) c = !c; } return c; };

  // ---- lanterns + café windows: a warm pulse moves through the square on the kick -------------
  const kick = (r, lag, o = {}) => fx.light(px(...r), { band: 'bass', mode: 'beat', lag, floor: 0.04, decay: 0.32, depth: 0.92, key: warm, zone: 10, spill: 8, spillMax: 0.5, up: 0.04, down: 0.25, ...o });
  kick([90, 92, 185, 222], 0, { zone: 24, spill: 12, spillMax: 0.6, peak: 1 }); // big wall lantern
  kick([65, 225, 282, 592], 0.06, { zone: 0, spill: 0, depth: 0.92, floor: 0.06, peak: 0.9 }); // café windows
  kick([368, 383, 402, 437], 0.12, { zone: 16, spill: 10, spillMax: 0.6, peak: 1, floor: 0.4, depth: 0.65, decay: 0.32, up: 0.12, down: 0.38 }); // lantern under the awning: soft warm breathing, never dark
  kick([362, 402, 488, 556], 0.14, { zone: 0, spill: 8, spillMax: 0.45, depth: 0.65, floor: 0.4, peak: 1, decay: 0.32, up: 0.12, down: 0.38 }); // shop window under the awning: soft warm breathing, never dark
  kick([583, 388, 612, 427], 0.18, { zone: 14, spill: 8, spillMax: 0.6, peak: 0.85 }); // lantern by the arch
  kick([618, 452, 700, 552], 0.22, { zone: 0, spill: 0, depth: 0.92, floor: 0.06, peak: 0.8 }); // arcade
  kick([1228, 615, 1297, 694], 0.26, { zone: 16, peak: 0.95 }); // stall lanterns
  kick([1240, 535, 1264, 574], 0.28, { zone: 10, peak: 0.75 });
  kick([1358, 28, 1397, 82], 0.32, { zone: 14, peak: 0.85 }); // street lamp top right
  kick([1250, 160, 1400, 350], 0.3, { zone: 0, spill: 0, depth: 0.92, floor: 0.06 }); // windows, right building

  // ---- upper-floor windows of the left building switch on the beat, a few at a time --------
  fx.field(px(0, 0, 700, 300), { band: 'mid', mode: 'twinkle', groups: 18, rest: 0.25, depth: 0.85, minLit: 0.35, up: 0.06, down: 0.4, stagger: 0.45, feather: 0.06,
    key: { min: 0.5, soft: 0.25, hue: 35, hueWidth: 30 }, exclude: [[85, 85, 190, 228], [318, 34, 412, 284], [578, 266, 634, 390], [60, 220, 288, 300]] });

  // ---- stall string lights twinkle bulb by bulb on the beat -------------------------------
  [[745, 455, 840, 560], [840, 455, 930, 560], [930, 455, 1060, 525]].forEach((r, i) => kick(r, 0.2 + i * 0.04, { zone: 10, spill: 6 })); // stalls at the back
  fx.field(px(1060, 455, 1400, 560), { band: 'mid', mode: 'twinkle', groups: 22, rest: 0.3, depth: 0.8, minLit: 0.35, up: 0.06, down: 0.4, stagger: 0.45,
    key: { min: 0.55, soft: 0.25 }, feather: 0.06, exclude: [[1228, 530, 1300, 700], [1365, 455, 1400, 500]] });

  // ---- cathedral swells once per bar; rose window a moment later; clock every 4th beat --------
  // church, the centrepiece: every beat its windows light in a wave rising up the spires;
  // every bar the rose window blooms and the portal glows
  fx.field(px(700, 40, 985, 400), { band: 'bass', mode: 'rise', dir: 'up', bins: 16, rest: 0.3, restGain: 0.1, speed: 2.2, width: 0.17, up: 0.03, down: 0.35, depth: 0.82, feather: 0.05,
    key: { min: 0.42, soft: 0.3, hue: 35, hueWidth: 35, exclude: [[843, 228, 922, 302], [838, 390, 932, 455]] } });
  fx.light(px(848, 232, 917, 298), { band: 'bass', mode: 'beat', every: 4, lag: 0.12, floor: 0.25, decay: 1.1, depth: 0.85, key: { min: 0.4, soft: 0.3 }, zone: 16, spill: 12, spillMax: 0.9, up: 0.05, down: 0.5, shape: 'ellipse' }); // rose window
  fx.light(px(840, 395, 930, 453), { band: 'bass', mode: 'beat', every: 4, lag: 0.2, floor: 0.3, decay: 1, depth: 0.8, key: warm, zone: 16, spill: 8, spillMax: 0.6, up: 0.05, down: 0.5 }); // portal
  fx.light(px(1155, 140, 1202, 184), { band: 'bass', mode: 'beat', every: 4, lag: 0.3, floor: 0.4, decay: 1, depth: 0.7, key: { min: 0.45, soft: 0.3 }, zone: 10, spill: 6, spillMax: 0.6, up: 0.1, down: 0.5, shape: 'ellipse' });

  // ---- candles flicker gently on hi-hats; their flames move ----------------------------------
  const CANDLES = [[293, 625, 322, 664], [325, 565, 352, 609], [375, 583, 394, 609], [528, 558, 544, 584], [100, 770, 170, 899]];
  CANDLES.forEach((r, i) => fx.light(px(...r), { band: 'treble', mode: 'flicker', base: 0.9, depth: 0.55, key: warm, zone: 14, spill: 6, spillMax: 0.5, flickStep: 0.07, delta: 0.1, cooldown: 1.6 + i * 0.4, fallbackEvery: 5 + i, delay: i * 0.05 }));
  const flameKey = (r, g, b) => { const v = Math.max(r, g, b) / 255; return Math.min(1, Math.max(0, (v - 0.82) / 0.12)) * (r >= b ? 1 : 0); };
  const flames = CANDLES.map((r, i) => ({ el: fx.cutout(px(...r), { pad: 3, alphaOf: flameKey, origin: '50% 75%' }), ph: i * 1.9 }));

  // ---- wet cobblestones: reflections flare with the lights above, gently rippling -------------
  // The painted reflections are held dark while music plays; a rippling copy above them carries
  // the visible reflection and follows the kick, so the street never splits into sections.
  const STREET = [[540, 560], [700, 550], [950, 560], [1400, 690], [1400, 905], [400, 905], [440, 820], [520, 700]];
  const STREET_HOLES = [[1225, 610, 1300, 700], [1060, 620, 1150, 720]];
  fx.light(px(400, 545, 1400, 905), { band: 'bass', adapt: false, gain: 0, floor: 0, depth: 0.9, res: 0.5,
    key: { min: 0.36, soft: 0.3, region: STREET, regionSoft: 10, exclude: STREET_HOLES } });
  const reflKey = (r, g, b) => Math.min(1, Math.max(0, (Math.max(r, g, b) / 255 - 0.34) / 0.15));
  const street = fx.cutout(px(400, 545, 1400, 905), { pad: 0, alphaOf: reflKey, res: 0.5, exclude: [
    [[400, 540], [540, 560], [520, 700], [440, 820], [400, 905], [380, 905], [380, 540]], // café furniture side
    [[540, 545], [1400, 545], [1400, 690], [950, 560], [700, 550]],                      // stalls above the street
    ...STREET_HOLES.map(([a, b, c, d]) => [[a, b], [c, b], [c, d], [a, d]]),
  ] });
  street.style.maskImage = street.style.webkitMaskImage = 'none';
  fx.root.append(street); // above the night base and the dimmed reflections
  const streetSrc = document.createElement('canvas');
  streetSrc.width = street.width; streetSrc.height = street.height;
  streetSrc.getContext('2d').drawImage(street, 0, 0);
  const sg = street.getContext('2d');
  // reflection streaks: each column follows the lights above its position (the lantern pulse
  // travels left → right), with its own small delay and strength
  const COLS = 32;
  const cols = Array.from({ length: COLS }, (_, i) => ({ env: 0, trig: [], gain: 1, base: 0.08 + (i / COLS) * 0.38 + Math.random() * 0.05 }));
  let sAct = 0, sClock = 0;
  const sWork = document.createElement('canvas');

  // ---- bunting + banners sway --------------------------------------------------------------
  const flagKey = (r, g, b) => {
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b), sat = mx ? (mx - mn) / mx : 0;
    if (mx === mn) return 0;
    let h = mx === r ? ((g - b) / (mx - mn)) % 6 : mx === g ? (b - r) / (mx - mn) + 2 : (r - g) / (mx - mn) + 4;
    h = (h * 60 + 360) % 360;
    return (h < 45 || h > 335) && sat > 0.45 && mx > 90 ? 1 : 0;
  };
  // bunting stays exactly as painted (no moving copy, so never a doubled layer); the flags only
  // catch the light, glowing a little warmer on the beat
  const BUNT = [[628, 324], [700, 352], [980, 340], [1150, 290], [1207, 260], [1207, 306], [1150, 336], [980, 388], [700, 398], [628, 372]];
  fx.light(px(626, 255, 1209, 400), { band: 'bass', mode: 'beat', floor: 0.55, decay: 0.4, depth: 0.5, key: { min: 0.35, soft: 0.3, hue: 15, hueWidth: 22, minSat: 0.5, region: BUNT, regionSoft: 4 }, spill: 4, spillMax: 0.35, up: 0.04, down: 0.3 });

  // banners: only the banner cloth moves (its outline is traced; windows around it stay put)
  const keyhole = poly => [[[0, 0], [1400, 0], [1400, 905], [0, 905], ...[...poly].reverse()]];
  const gold = (r, g, b) => r > 170 && g > 120 && b < 120 && r - b > 90;
  const banners = [
    [[322, 38, 408, 280], [[326, 42], [404, 42], [404, 250], [365, 278], [326, 250]], 0],
    [[582, 270, 630, 387], [[586, 274], [627, 274], [627, 366], [606, 385], [586, 366]], 1.7],
  ].map(([r, poly, ph]) => ({ el: fx.cutout(px(...r), { pad: 3, alphaOf: (R, G, B) => (flagKey(R, G, B) || gold(R, G, B) ? 1 : 0), origin: '50% 0%', exclude: keyhole(poly) }), ph }));

  // ---- clouds drift; stars twinkle ------------------------------------------------------------
  const cloudKey = (r, g, b) => {
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b), v = mx / 255, sat = mx ? (mx - mn) / mx : 0;
    if (v > 0.85 && sat < 0.25) return 0;
    return Math.min(1, Math.max(0, (v - 0.46) / 0.12)) * (b >= r + 15 ? 1 : 0); // brighter than the sky → cloud
  };
  const moonHole = [[[1025, 45], [1090, 45], [1090, 110], [1025, 110]]];
  const clouds = [[570, 0, 700, 250, 18, 0.22, 0], [985, 140, 1140, 228, 20, 0.18, 1.3], [1232, 40, 1400, 112, 18, 0.25, 2.4]]
    .map(([x0, y0, x1, y1, amp, sp, ph]) => ({ el: fx.cutout(px(x0, y0, x1, y1), { pad: 24, alphaOf: cloudKey, exclude: moonHole }), amp, sp, ph }));

  const starSprite = (() => {
    const n = 64, c = document.createElement('canvas'); c.width = c.height = n;
    const g = c.getContext('2d'), h = n / 2;
    const core = g.createRadialGradient(h, h, 0, h, h, h * 0.45);
    core.addColorStop(0, 'rgba(245,248,255,1)'); core.addColorStop(1, 'rgba(200,215,255,0)');
    g.fillStyle = core; g.fillRect(0, 0, n, n);
    for (const [w, l] of [[n, 2], [2, n]]) {
      const lg = w > l ? g.createLinearGradient(0, h, n, h) : g.createLinearGradient(h, 0, h, n);
      lg.addColorStop(0, 'rgba(220,230,255,0)'); lg.addColorStop(0.5, 'rgba(240,245,255,0.9)'); lg.addColorStop(1, 'rgba(220,230,255,0)');
      g.fillStyle = lg; g.fillRect(h - w / 2, h - l / 2, w, l);
    }
    return c;
  })();
  // star detector: local peaks in the sky only — the ring around each point must be night-sky
  // blue (not stone, roofs or windows), and nothing warm or bright may sit next to it
  const STEP = 1.6, X0 = 575, SW = Math.ceil(825 / STEP), SH = Math.ceil(260 / STEP);
  const lum = new Float32Array(SW * SH), blue = new Uint8Array(SW * SH);
  for (let j = 0; j < SH; j++) for (let i = 0; i < SW; i++) {
    const [r, g, b] = fx.colorAt((X0 + i * STEP) / 1400, (j * STEP) / 905);
    lum[j * SW + i] = 0.3 * r + 0.59 * g + 0.11 * b;
    blue[j * SW + i] = b > r + 20 && b > g ? 1 : 0;
  }
  const stars = [];
  for (let j = 3; j < SH - 3; j++) for (let i = 3; i < SW - 3; i++) {
    const k = j * SW + i, v = lum[k];
    let peak = true, bg = 0, n = 0, sky = 0;
    for (let dj = -3; dj <= 3 && peak; dj++) for (let di = -3; di <= 3; di++) {
      const q = k + dj * SW + di;
      if (Math.abs(dj) <= 1 && Math.abs(di) <= 1) { if (lum[q] > v) { peak = false; break; } }
      else { bg += lum[q]; sky += blue[q]; n++; }
    }
    if (!peak || v - bg / n < 22 || sky < n * 0.85) continue;
    const X = X0 + i * STEP, Y = j * STEP;
    if (Math.hypot(X - 1057, Y - 77) < 42) continue; // moon
    stars.push({ x: X / 1400, y: Y / 905, per: 1 + Math.random() * 2.5, ph: Math.random() * 6.28, s: 0.35 + 0.7 * Math.min(1, (v - bg / n) / 90) });
  }
  stars.sort((p, q) => q.s - p.s).splice(80);

  const { ctx, view } = fx.useCanvas();
  let t = 0;

  return {
    regions: [{ rect: px(400, 545, 1400, 905), band: 'bass', label: 'cobblestone reflections' }, { rect: px(575, 0, 1400, 260), band: 'treble', label: 'stars' }],
    update(a, dt) {
      fx.updateLights(a, dt);
      const m = a.motion;
      t += dt;

      // cobblestones: brightness follows the kick (a moment after the lanterns)
      sClock += dt;
      sAct += ((a.active ? 1 : 0) - sAct) * (1 - Math.exp(-dt / 0.5));
      if (a.hit && a.active) for (const c of cols) c.trig.push([sClock + c.base + Math.random() * 0.08, 0.25 + 0.75 * Math.random()]);
      const RW = street.width, RH = street.height, cw = RW / COLS;
      sg.clearRect(0, 0, RW, RH);
      // one smooth left-to-right brightness curve through the column levels — no hard edges
      const grad = sg.createLinearGradient(0, 0, RW, 0);
      cols.forEach((c, i) => {
        if (c.trig.length && sClock >= c.trig[0][0]) c.env = Math.max(c.env, c.trig.shift()[1]);
        c.env *= Math.exp(-dt / 0.32);
        const lvl = 1 - (1 - Math.min(1, 0.1 + 0.9 * c.env)) * sAct;
        grad.addColorStop((i + 0.5) / COLS, `rgba(0,0,0,${lvl.toFixed(3)})`);
      });
      sg.drawImage(streetSrc, 0, 0); // stone doesn't ripple: only brightness changes
      sg.globalCompositeOperation = 'destination-in';
      sg.fillStyle = grad; sg.fillRect(0, 0, RW, RH);
      sg.globalCompositeOperation = 'source-over';

      // candle flames: small irregular stretch and lean
      for (const f of flames) {
        const n1 = Math.sin(t * 7.3 + f.ph) * 0.6 + Math.sin(t * 13.1 + f.ph * 2) * 0.4;
        const n2 = Math.sin(t * 5.1 + f.ph * 3) * 0.7 + Math.sin(t * 11.7 + f.ph) * 0.3;
        f.el.style.transform = `skewX(${(n2 * 3 * m).toFixed(2)}deg) scale(${(1 - 0.04 * n1 * m).toFixed(3)}, ${(1 + 0.08 * n1 * m).toFixed(3)})`;
      }

      // bunting and banners sway in the breeze
      for (const b of banners) b.el.style.transform = `skewX(${(Math.sin(t * 0.7 + b.ph) * 2.6 * m).toFixed(2)}deg)`;
      for (const c of clouds) c.el.style.transform = `translate(${(Math.sin(t * c.sp + c.ph) * c.amp * m).toFixed(2)}px, ${(Math.sin(t * c.sp * 0.7 + c.ph) * 2 * m).toFixed(2)}px)`;

      // stars
      const { W, H } = view;
      ctx.clearRect(0, 0, W, H);
      ctx.globalCompositeOperation = 'lighter';
      for (const st of stars) {
        const tw = Math.max(0, Math.sin((t / st.per) * Math.PI * 2 + st.ph)) ** 2;
        const r = (0.003 + 0.006 * tw) * st.s * W;
        ctx.globalAlpha = (0.15 + (0.7 + 0.2 * a.treble) * tw) * (0.5 + 0.5 * st.s);
        ctx.drawImage(starSprite, st.x * W - r, st.y * H - r, r * 2, r * 2);
      }
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
    },
  };
}
