import { px } from '../fx.js';
import { softSprite } from './shared.js';

// The Electric Skyline. While music plays the waterfront settles to a soft night base
// and its own lights carry the scene:
//   bridge cables        on every beat a pulse of light runs along the cable bulbs,
//                        from the tower outward (both spans)
//   bridge deck          glows on the kick; tower columns swell with the melody
//   skyline windows      whole windows switch on the beat, a few at a time
//   tower tops           take turns flashing on the beat; the spire climbs once per bar;
//                        two crowns flicker on hi-hats
//   promenade lamps      a beat chase walks down the promenade, near → far
//   floor + river        reflections pulse on the kick (lamps, ferry, pier cut out)
// Ambient: ferry bobs, clouds drift, traffic runs over the bridge, water shimmers.

export function create(fx) {
  fx.night(0.2);
  const warm = { min: 0.5, soft: 0.28 };
  const bulbs = { min: 0.55, soft: 0.25, hue: 38, hueWidth: 28 };

  // ---- bridge cables: light runs from the tower outward on every beat -------------------
  // tight band around the cables only; stops where they pass in front of the skyline
  const LEFT_SPAN = [[868, 352], [905, 315], [1000, 200], [1060, 125], [1100, 72], [1138, 80],
    [1138, 188], [1060, 288], [1000, 333], [940, 350], [880, 364]]; // lower edge stays above the deck
  const RIGHT_SPAN = [[1135, 55], [1400, 108], [1400, 152], [1135, 98]];
  const cable = { band: 'bass', mode: 'rise', beats: false, interval: 0.85, bins: 48, rest: 0.18, restGain: 0.15, speed: 0.95, width: 0.06, up: 0.03, down: 0.18, depth: 0.9, feather: 0.03 }; // bright pulses of light flowing outward along the cables, continuously
  fx.field(px(860, 60, 1145, 425), { ...cable, dir: 'left', feather: 0.1, key: { ...bulbs, min: 0.62, region: LEFT_SPAN, regionSoft: 5 } });
  fx.field(px(1130, 50, 1400, 158), { ...cable, dir: 'right', key: { ...bulbs, region: RIGHT_SPAN, regionSoft: 5 } });

  // the bridge itself (deck, tower columns, base) is ONE light, so the structure pulses as a
  // whole on the kick — never split into separately lit sections
  const BRIDGE = [[420, 505], [700, 440], [850, 395], [1100, 322], [1100, 190], [1325, 190], [1325, 262], [1400, 240], [1400, 360],
    [1340, 378], [1340, 560], [1095, 560], [1095, 430], [850, 455], [700, 478], [700, 560], [420, 565]];
  const towerGold = { min: 0.42, soft: 0.3, hue: 38, hueWidth: 32 };
  fx.light(px(415, 185, 1400, 570), { band: 'bass', mode: 'beat', floor: 0.3, decay: 0.4, depth: 0.85, res: 0.6,
    key: { ...towerGold, region: BRIDGE, regionSoft: 8, exclude: [[1095, 60, 1142, 300]] }, zone: 0, zoneKey: { min: 0.35, soft: 0.3, region: BRIDGE },
    up: 0.02, down: 0.18 }); // no spill: a blurred copy of the whole bridge would add its own bands

  // ---- skyline: windows on the beat, tops take turns, spire climbs per bar -----------------
  // every skyscraper is its own light; on each beat one of three scattered groups lights up
  const TOWERS = [[220, 230, 252, 400], [272, 207, 330, 375], [352, 320, 445, 453], [442, 247, 515, 453], [505, 300, 568, 453],
    [580, 222, 628, 385], [652, 267, 692, 350], [728, 125, 782, 340], [820, 295, 866, 400], [870, 212, 922, 395]];
  const TGROUP = [0, 1, 2, 0, 1, 2, 0, 1, 2, 0];
  // the two towers behind the bridge stop above the cables (soft edge), so cable bulbs never
  // flash or bloom with them
  const TOWER_SHAPE = { 8: [[818, 292], [868, 292], [868, 366], [818, 384]], 9: [[866, 208], [924, 208], [924, 324], [866, 364]] };
  TOWERS.forEach((r, i) => fx.light(px(...r), { band: 'beat', mode: 'chase', group: 'skyline', idx: TGROUP[i], rest: 0.25, depth: 0.88,
    key: { min: i < 3 ? 0.3 : 0.42, soft: 0.25, ...(TOWER_SHAPE[i] ? { region: TOWER_SHAPE[i], regionSoft: 7 } : {}) }, spill: 8, spillMax: 0.4, up: 0.06, down: 0.45, shape: 'rect' })); // soft rise, ~0.5 s fade
  const win = { band: 'mid', mode: 'twinkle', key: { min: 0.5, soft: 0.25 }, rest: 0.4, depth: 0.7, minLit: 0.45, up: 0.08, down: 0.45, feather: 0.18, groups: 14, stagger: 0.5 };
  // distant skyline above the water: six sections take turns glowing on the beat
  [[225, 452, 330, 545], [700, 452, 790, 540], [330, 452, 425, 540], [880, 452, 970, 530], [790, 452, 880, 530], [970, 452, 1060, 545]]
    .forEach((r, i) => fx.light(px(...r), { band: 'beat', mode: 'chase', group: 'distant', idx: i % 3, rest: 0.25, depth: 0.88,
      key: { min: 0.38, soft: 0.25 }, spill: 6, spillMax: 0.4, up: 0.06, down: 0.45 }));
  // brick building on the left: three bands glow on the beat, top to bottom a moment apart
  [[0, 0, 215, 100], [0, 100, 215, 200], [0, 200, 215, 300]].forEach((r, i) =>
    fx.light(px(...r), { band: 'bass', mode: 'beat', lag: i * 0.08, floor: 0.1, decay: 0.32, depth: 0.88,
      key: { min: 0.45, soft: 0.25, hue: 35, hueWidth: 32 }, spill: 6, spillMax: 0.4, up: 0.06, down: 0.4 }));

  // lamps on top of the bridge tower flash on every 2nd beat
  fx.light(px(1120, 15, 1305, 42), { band: 'bass', mode: 'beat', every: 2, floor: 0.3, decay: 0.4, depth: 0.85, key: { min: 0.5, soft: 0.25 }, zone: 10, spill: 6, spillMax: 0.6, up: 0.02, down: 0.2 });

  // ---- waterfront: lamps chase down the promenade, café light breathes -----------------------
  const PROMENADE = [[0, 640], [280, 575], [330, 575], [560, 680], [700, 780], [700, 905], [0, 905]];
  // lampposts flare on the kick: the front one first, the further ones a split second later,
  // so the pulse travels down the promenade. The front lamp is the brightest.
  const LAMPS = [[503, 590, 569, 684], [376, 584, 407, 629], [325, 574, 346, 603], [299, 573, 316, 593], [283, 571, 297, 587]];
  const lamps = LAMPS.map((r, i) => fx.light(px(...r), { band: 'bass', mode: 'beat', lag: i * 0.07, floor: i ? 0.3 : 0.4, decay: 0.38, depth: i ? 0.7 : 0.75,
    key: { min: 0.42, soft: 0.3 }, zone: i ? 5 : 8, spill: i ? 4 : 8, spillMax: i ? 0.5 : 0.8, up: 0.015, down: 0.12 }));
  [[32, 300, 112, 365], [160, 410, 205, 448], [220, 462, 250, 487]]
    .forEach((r, i) => fx.light(px(...r), { band: 'mid', floor: 0.3, depth: 0.7, key: warm, zone: 28, spill: 8, spillMax: 0.5, contrast: 3.5, accent: 0.3, up: 0.1, down: 0.5, delay: i * 0.08 }));
  fx.light(px(0, 452, 215, 625), { band: 'mid', floor: 0.4, depth: 0.6, key: { min: 0.45, soft: 0.3 }, zone: 14, contrast: 3, accent: 0.2, up: 0.2, down: 0.6 }); // café windows
  fx.light(px(225, 540, 700, 574), { band: 'treble', mode: 'flicker', base: 0.92, depth: 0.7, key: warm, delta: 0.09, cooldown: 1.2, fallbackEvery: 4 }); // far-shore lights

  // ---- reflections pulse on the kick ---------------------------------------------------------
  // the wet pavement's reflections flare with the lamps on every kick and fade between — one
  // light over the whole pavement, so it never splits into sections
  fx.light(px(0, 570, 700, 905), { band: 'bass', mode: 'beat', lag: 0.05, floor: 0.15, decay: 0.38, depth: 0.9, res: 0.5,
    key: { min: 0.33, soft: 0.3, region: PROMENADE }, zone: 0, zoneKey: { min: 0.28, soft: 0.3, region: PROMENADE },
    spill: 6, spillMax: 0.5, up: 0.015, down: 0.12 });
  const RIVER = [[400, 575], [1400, 560], [1400, 905], [1000, 905], [700, 800], [560, 700], [420, 600]]; // incl. water seen through the railing
  // river reflections: soft wavy bands of light roll across the whole river toward the viewer,
  // like light on moving water. The bass only sets how lively the water is (smoothly) — never on the beat.
  // the painted reflections are held dark while music plays; the rippling copy drawn above
  // them (see `ripple`) carries the visible reflections, so they actually ripple and flare
  fx.light(px(400, 555, 1400, 905), { band: 'bass', adapt: false, gain: 0, floor: 0, depth: 0.92, res: 0.5,
    key: { min: 0.34, soft: 0.3, region: RIVER, exclude: [[805, 525, 965, 600], [1055, 535, 1370, 605], [495, 580, 578, 700], [368, 575, 415, 640]] } }); // ferry, pier, both lampposts

  // ---- ferry: windows breathe with the melody, the boat bobs ---------------------------------
  const ferryWin = fx.light(px(812, 532, 957, 597), { band: 'mid', floor: 0.3, depth: 0.75, key: warm, zone: 12, spill: 6, spillMax: 0.5, contrast: 3, up: 0.25, down: 0.8 }); // windows glow softly with the melody
  const notWater = (r, g, b) => {
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
    if (mx === mn) return 1;
    let h = mx === r ? ((g - b) / (mx - mn)) % 6 : mx === g ? (b - r) / (mx - mn) + 2 : (r - g) / (mx - mn) + 4;
    h = (h * 60 + 360) % 360;
    return h > 195 && h < 280 && mx < 170 ? 0 : 1; // dark blue water stays put
  };
  const reflKey = (r, g, b) => Math.min(1, Math.max(0, (Math.max(r, g, b) / 255 - 0.3) / 0.15));
  const ripple = fx.cutout(px(400, 575, 1400, 905), { pad: 0, alphaOf: reflKey, res: 0.5, exclude: [
    [[400, 560], [420, 600], [560, 700], [700, 800], [1000, 905], [380, 905]],          // promenade, railing side
    [[495, 580], [578, 580], [578, 700], [495, 700]], [[368, 575], [415, 575], [415, 640], [368, 640]], // lamps
    [[800, 520], [970, 520], [970, 605], [800, 605]], [[1050, 530], [1375, 530], [1375, 610], [1050, 610]], // ferry, pier
  ] });
  ripple.style.maskImage = ripple.style.webkitMaskImage = 'none';
  fx.root.append(ripple); // above the night base and the dimmed reflections
  const wobble = document.createElement('canvas');
  wobble.width = ripple.width; wobble.height = ripple.height;
  const wg = wobble.getContext('2d');
  // vertical streak columns: each flares on the kick after its own tiny delay, by its own amount
  const COLS = 36;
  const cols = Array.from({ length: COLS }, () => ({ env: 0, trig: Infinity, gain: 1, delay: 0 }));
  let bassLive = 0, rAct = 0;
  const rippleSrc = document.createElement('canvas');
  rippleSrc.width = ripple.width; rippleSrc.height = ripple.height;
  rippleSrc.getContext('2d').drawImage(ripple, 0, 0);
  const rg = ripple.getContext('2d');
  const ferry = fx.cutout(px(812, 528, 960, 600), { pad: 3, alphaOf: notWater, origin: '50% 90%' });

  // ---- clouds drift slowly (only cloud pixels: no stars, no moon) -----------------------------
  const cloudKey = (r, g, b) => {
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b), v = mx / 255, sat = mx ? (mx - mn) / mx : 0;
    if (v > 0.85 && sat < 0.25) return 0; // stars and moon
    return Math.min(1, Math.max(0, (v - 0.33) / 0.12)) * (b >= r ? 1 : 0);
  };
  const noTowers = [[[505, 45], [580, 45], [580, 120], [505, 120]], [[270, 200], [335, 200], [335, 240], [270, 240]], [[575, 214], [632, 214], [632, 240], [575, 240]]];
  const clouds = fx.cutout(px(215, 85, 545, 215), { pad: 26, alphaOf: cloudKey, exclude: noTowers });      // under the moon
  const cloudsRight = fx.cutout(px(520, 110, 705, 228), { pad: 32, alphaOf: cloudKey, exclude: noTowers }); // right-hand bank

  // ---- canvas: traffic over the bridge + water shimmer ----------------------------------------
  const { ctx, view } = fx.useCanvas();
  const LANES = [
    { a: [700, 446], b: [1400, 246], dir: 1, rgb: '255,236,200' }, // headlights → into the city
    { a: [700, 454], b: [1400, 254], dir: -1, rgb: '255,70,60' },   // tail lights ←
  ];
  const cars = Array.from({ length: 14 }, (_, i) => ({ lane: LANES[i % 2], u: Math.random(), sp: 0.7 + Math.random() * 0.6 }));
  const glint = softSprite(16, '255,215,160', [1, 0.3, 0]);
  const inPoly = (X, Y, poly) => { let c = false; for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) { const [xi, yi] = poly[i], [xj, yj] = poly[j]; if ((yi > Y) !== (yj > Y) && X < (xj - xi) * (Y - yi) / (yj - yi) + xi) c = !c; } return c; };
  const onWater = (x, y) => inPoly(x * 1400, y * 905, RIVER) && !(x * 1400 > 800 && x * 1400 < 1370 && y * 905 < 610);
  const glints = [];
  while (glints.length < 110) {
    const x = 0.3 + Math.random() * 0.7, y = 0.62 + Math.random() * 0.38;
    if (onWater(x, y)) glints.push({ x, y, ph: Math.random() * 6.28, sp: 0.4 + Math.random() });
  }

  // sky: twinkling stars (the painting's own star points) and a moon glow
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
  // the sky's outline, traced above the skyline, bridge and tower (reference px)
  const SKY = [[215, 0], [1400, 0], [1400, 45], [1300, 50], [1140, 38], [1100, 60], [1000, 185], [928, 205], [866, 205], [862, 290], [818, 290], [790, 300], [775, 118], [735, 118], [725, 330],
    [700, 335], [690, 265], [650, 262], [628, 218], [578, 216], [520, 244], [440, 244], [332, 204], [272, 204], [230, 225], [215, 260]];
  const nearMoon = p => Math.hypot(p.x * 1400 - 542, p.y * 905 - 82) < 42;
  const starLike = p => { const mx = Math.max(p.r, p.g, p.b), mn = Math.min(p.r, p.g, p.b); return p.b >= p.r - 10 && (mx - mn) / (mx || 1) < 0.55; };
  // star detector: scan only inside the sky outline for small points clearly brighter
  // than the sky right around them (local peaks)
  const STEP = 1.6, SW = Math.ceil(1185 / STEP), SH = Math.ceil(340 / STEP);
  const lum = new Float32Array(SW * SH), inside = new Uint8Array(SW * SH);
  for (let j = 0; j < SH; j++) for (let i = 0; i < SW; i++) {
    const X = 215 + i * STEP, Y = j * STEP;
    if (!inPoly(X, Y, SKY)) continue;
    const [r, g, b] = fx.colorAt(X / 1400, Y / 905);
    inside[j * SW + i] = 1;
    lum[j * SW + i] = 0.3 * r + 0.59 * g + 0.11 * b;
  }
  const found = [];
  for (let j = 3; j < SH - 3; j++) for (let i = 3; i < SW - 3; i++) {
    const k = j * SW + i;
    if (!inside[k]) continue;
    const v = lum[k];
    let peak = true, bg = 0, n = 0;
    for (let dj = -3; dj <= 3 && peak; dj++) for (let di = -3; di <= 3; di++) {
      const q = lum[k + dj * SW + di];
      if (Math.abs(dj) <= 1 && Math.abs(di) <= 1) { if (q > v) { peak = false; break; } }
      else { bg += q; n++; }
    }
    if (!peak || v - bg / n < 22) continue;
    const X = 215 + i * STEP, Y = j * STEP;
    const [r, g, b] = fx.colorAt(X / 1400, Y / 905);
    found.push({ x: X / 1400, y: Y / 905, r, g, b, l: v - bg / n });
  }
  const nearWindows = p => { // any warm or bright window pixel close by → it's a building, not sky
    for (let dy = -6; dy <= 6; dy += 2) for (let dx = -6; dx <= 6; dx += 2) {
      const [r, g, b] = fx.colorAt(p.x + dx / 1400, p.y + dy / 905);
      if ((r > b + 15 && r > 110) || (dx * dx + dy * dy > 9 && 0.3 * r + 0.59 * g + 0.11 * b > 120)) return true;
    }
    return false;
  };
  const stars = found.filter(p => starLike(p) && !nearMoon(p) && !nearWindows(p)).sort((a, b) => b.l - a.l).slice(0, 320)
    .map(p => ({ x: p.x, y: p.y, per: 1 + Math.random() * 2.5, ph: Math.random() * 6.28, s: 0.35 + 0.7 * Math.min(1, p.l / 90) }));
  const moonGlow = softSprite(128, '200,220,255', [0.7, 0.25, 0]);
  let moonLvl = 0;

  let t = 0;
  return {
    regions: [{ rect: px(700, 240, 1400, 460), band: 'treble', label: 'traffic trails' }, { rect: px(400, 560, 1400, 905), band: 'bass', label: 'water shimmer' }],
    update(a, dt) {
      fx.updateLights(a, dt);
      const m = a.motion;
      t += dt;

      // calm swell: slow bob + gentle roll; the window lights ride with the boat
      const fT = `translate(${(Math.sin(t * 0.35) * 1.2 * m).toFixed(2)}px, ${(Math.sin(t * 1.05) * 1.5 * m).toFixed(2)}px) rotate(${(Math.sin(t * 1.05 + 1.2) * 0.6 * m).toFixed(3)}deg)`;
      for (const el of [ferry, ferryWin.el, ferryWin.zoneEl, ferryWin.spillEl]) if (el) { el.style.transformOrigin = '50% 90%'; el.style.transform = fT; }
      clouds.style.transform = `translate(${(Math.sin(t * 0.3) * 15 * m).toFixed(2)}px, ${(Math.sin(t * 0.2) * 2.5 * m).toFixed(2)}px)`;
      cloudsRight.style.transform = `translate(${(Math.sin(t * 0.24 + 2) * 24 * m).toFixed(2)}px, ${(Math.sin(t * 0.16 + 1) * 3 * m).toFixed(2)}px)`;
      // ripples: each thin band of the reflections slides sideways on its own wave
      const RW = ripple.width, RH = ripple.height, band = 3;
      wg.clearRect(0, 0, RW, RH);
      for (let y = 0; y < RH; y += band) {
        const depth = y / RH; // nearer water ripples more
        const off = (Math.sin(y * 0.09 + t * 1.6) * 1.2 + Math.sin(y * 0.031 - t * 0.9) * 0.8) * (2 + 4 * depth) * m;
        wg.drawImage(rippleSrc, 0, y, RW, band, off, y, RW, band);
      }
      // per-column flare on the kick
      rAct += ((a.active ? 1 : 0) - rAct) * (1 - Math.exp(-dt / 0.5));
      bassLive += (a.bass - bassLive) * (1 - Math.exp(-dt / 1.2));
      if (a.hit && a.active) for (const c of cols) { c.trig = t + Math.random() * 0.16; c.gain = 0.45 + 0.55 * Math.random(); }
      rg.clearRect(0, 0, RW, RH);
      const cw = RW / COLS;
      // one smooth brightness curve through the column levels — no hard edges between columns
      const grad = rg.createLinearGradient(0, 0, RW, 0);
      cols.forEach((c, i) => {
        if (t >= c.trig) { c.env = Math.max(c.env, c.gain); c.trig = Infinity; }
        c.env *= Math.exp(-dt / 0.42);
        const lvl = Math.min(1, 0.3 + 0.2 * bassLive + 0.7 * c.env);
        grad.addColorStop((i + 0.5) / COLS, `rgba(0,0,0,${(1 - (1 - lvl) * rAct).toFixed(3)})`); // music off → as painted
      });
      rg.drawImage(wobble, 0, 0);
      rg.globalCompositeOperation = 'destination-in';
      rg.fillStyle = grad; rg.fillRect(0, 0, RW, RH);
      rg.globalCompositeOperation = 'source-over';

      const { W, H, dpr } = view;
      ctx.clearRect(0, 0, W, H);

      // traffic: always moving, treble speeds and brightens it
      ctx.globalCompositeOperation = 'lighter';
      ctx.lineCap = 'round';
      const speed = (0.03 + 0.08 * a.treble) * m;
      for (const c of cars) {
        const { a: A, b: B, dir, rgb } = c.lane;
        c.u = (c.u + dir * speed * c.sp * dt + 1) % 1;
        const x = (A[0] + (B[0] - A[0]) * c.u) / 1400 * W, y = (A[1] + (B[1] - A[1]) * c.u) / 905 * H;
        const dx = (B[0] - A[0]) / 1400 * W, dy = (B[1] - A[1]) / 905 * H, n = Math.hypot(dx, dy);
        const len = (0.012 + 0.03 * a.treble) * W * c.sp;
        const tx = x - dir * dx / n * len, ty = y - dir * dy / n * len;
        const g = ctx.createLinearGradient(x, y, tx, ty);
        g.addColorStop(0, `rgba(${rgb},${(0.4 + 0.45 * a.treble).toFixed(3)})`);
        g.addColorStop(1, `rgba(${rgb},0)`);
        ctx.strokeStyle = g;
        ctx.lineWidth = 1.6 * dpr;
        ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(tx, ty); ctx.stroke();
      }

      // sky: stars twinkle, moon glow swells with the music
      ctx.globalCompositeOperation = 'lighter';
      for (const st of stars) {
        const tw = Math.max(0, Math.sin((t / st.per) * Math.PI * 2 + st.ph)) ** 2;
        const r = (0.003 + 0.006 * tw) * st.s * W;
        ctx.globalAlpha = (0.15 + (0.7 + 0.2 * a.treble) * tw) * (0.5 + 0.5 * st.s);
        ctx.drawImage(starSprite, st.x * W - r, st.y * H - r, r * 2, r * 2);
      }
      moonLvl += ((a.active ? 0.35 + 0.65 * a.energy : 0.3) - moonLvl) * (1 - Math.exp(-dt / 0.6));
      ctx.globalCompositeOperation = 'screen';
      { const r = (0.045 + 0.015 * moonLvl) * W; ctx.globalAlpha = 0.35 + 0.45 * moonLvl; ctx.drawImage(moonGlow, 542 / 1400 * W - r, 82 / 905 * H - r, r * 2, r * 2); }
      ctx.globalAlpha = 1;

      // water shimmer: glints drift with the current and sparkle, brighter on the bass
      ctx.globalCompositeOperation = 'screen';
      for (const g of glints) {
        g.x += dt * 0.004 * g.sp * m;
        if (g.x > 1 || !onWater(g.x, g.y)) { do { g.x = 0.3 + Math.random() * 0.2; } while (!onWater(g.x, g.y) && (g.y = 0.62 + Math.random() * 0.38)); }
        const tw = Math.max(0, Math.sin(t * 2 * g.sp + g.ph)) ** 2;
        if (tw < 0.05) continue;
        const r = (0.002 + 0.004 * tw) * W;
        ctx.globalAlpha = (0.25 + 0.45 * a.bass) * tw;
        ctx.drawImage(glint, g.x * W - r * 2, g.y * H - r * 0.5, r * 4, r);
      }
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
    },
  };
}
