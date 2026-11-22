import { px } from '../fx.js';
import { softSprite } from './shared.js';

// The Floating Lights. While music plays the river settles to a soft night base and
// its own lights carry the scene:
//   water lanterns       3 scattered groups take turns on the beat (A, B, C, A…),
//                        each lighting with a ripple — never all at once
//   water reflections    pulse on the kick (confined to the river)
//   pavilion lanterns    swell with the melody
//   village + pavilion windows — whole windows switch on the beat, count follows the melody
//   table / deck lanterns — candle flicker on hi-hats, each on its own timing
//   golden temple        glows once per bar
// Ambient: sky lanterns drift, boats rock, palms sway, stars twinkle, embers rise, glints shimmer.

export function create(fx) {
  fx.night(0.2);
  const warm = { min: 0.45, soft: 0.3 };

  // ---- water lanterns: 3 scattered groups, one group per beat ----------------------
  const WATER = [
    [1000, 577, 1068, 650], [740, 522, 780, 550], [832, 545, 902, 585], [792, 500, 822, 520], [942, 497, 970, 512],
    [1010, 497, 1040, 515], [1035, 494, 1055, 507], [1070, 534, 1125, 562], [1107, 524, 1147, 557], [1175, 510, 1212, 532],
    [1217, 507, 1247, 525], [1280, 552, 1360, 592], [1250, 582, 1327, 622], [1235, 584, 1267, 607], [1157, 604, 1187, 632],
    [850, 489, 872, 504], [1205, 724, 1385, 802],
  ];
  const GROUP = [0, 1, 2, 1, 0, 2, 1, 0, 2, 2, 1, 0, 1, 2, 0, 2, 1]; // scattered so neighbours differ
  const water = WATER.map((r, i) => {
    const L = fx.light(px(...r), { band: 'beat', mode: 'chase', group: 'water', idx: GROUP[i], rest: 0.22, depth: 0.8, key: warm, zone: 26, spill: 8, spillMax: 0.6, up: 0.025, down: 0.16 });
    L.cx = (r[0] + r[2]) / 2 / 1400; L.cy = r[3] / 905;
    return L;
  });

  // ---- river reflections pulse on the kick ---------------------------------------------
  const RIVER = [[470, 490], [1400, 470], [1400, 905], [580, 905], [565, 640], [470, 600]];
  // the lanterns themselves are cut out, so they only follow their own group
  const LANTERN_HOLES = WATER.map(([x0, y0, x1, y1]) => [x0 - 6, y0 - 10, x1 + 6, y1 + 6]);
  fx.light(px(465, 465, 1400, 905), { band: 'bass', mode: 'beat', floor: 0.12, decay: 0.25, depth: 0.82, res: 0.5, key: { min: 0.38, soft: 0.3, region: RIVER, exclude: LANTERN_HOLES }, zone: 0, zoneKey: { min: 0.3, soft: 0.3, region: RIVER, exclude: LANTERN_HOLES }, spill: 6, spillMax: 0.5, up: 0.015, down: 0.12 });

  // ---- melody: pavilion hanging lanterns swell ------------------------------------------
  [[95, 260, 190, 350], [325, 340, 385, 400], [50, 295, 80, 345], [62, 385, 100, 425], [122, 392, 152, 425], [182, 395, 205, 430], [420, 375, 452, 420], [125, 474, 150, 500]]
    .forEach((r, i) => fx.light(px(...r), { band: 'beat', mode: 'chase', group: 'pavilion', idx: i % 2, rest: 0.25, depth: 0.8, key: warm, zone: 30, spill: 10, spillMax: 0.6, up: 0.03, down: 0.3 })); // halves alternate each beat

  // ---- hi-hats: candle flicker on table and deck lanterns, each its own timing -------------
  [[207, 567, 255, 640], [272, 584, 300, 632], [447, 652, 522, 747], [450, 564, 495, 614], [137, 797, 230, 905], [425, 644, 440, 657]]
    .forEach((r, i) => fx.light(px(...r), { band: 'treble', mode: 'flicker', base: 0.92, depth: 0.55, key: warm, zone: 34, spill: 8, spillMax: 0.5, delta: 0.11 + i * 0.01, cooldown: 2.2 + i * 0.45, delay: i * 0.07, fallbackEvery: 7 + (i % 3) * 2, flickStep: 0.07 }));

  // ---- golden temple glows once per bar -------------------------------------------------------
  const gold = { min: 0.4, soft: 0.3, hue: 40, hueWidth: 30 };
  fx.field(px(1122, 148, 1203, 312), { band: 'beat', mode: 'rise', dir: 'up', every: 4, bins: 12, rest: 0.35, restGain: 0.2, speed: 2.2, width: 0.18, up: 0.02, down: 0.5, key: gold, depth: 0.7, feather: 0.12 }); // main spire: light climbs once per bar
  [[1048, 278, 1082, 342], [1098, 248, 1120, 302], [1208, 253, 1232, 317], [1233, 253, 1267, 322], [1273, 283, 1292, 327]]
    .forEach((r, i) => fx.light(px(...r), { band: 'beat', mode: 'chase', group: 'spires', idx: [0, 2, 4, 1, 3][i], rest: 0.35, depth: 0.7, key: gold, zone: 12, spill: 6, spillMax: 0.5, up: 0.03, down: 0.4 }));
  fx.light(px(1088, 288, 1202, 342), { band: 'mid', floor: 0.3, depth: 0.6, key: gold, zone: 14, contrast: 3.5, accent: 0.3, up: 0.15, down: 0.6 }); // temple hall

  // ---- windows: whole windows switch on the beat ---------------------------------------------
  const win = { band: 'mid', mode: 'twinkle', key: { min: 0.5, soft: 0.25 }, rest: 0.15, depth: 0.85, up: 0.08, down: 0.45, feather: 0.2, groups: 14, stagger: 0.5 };
  fx.field(px(1150, 345, 1400, 500), { ...win, seed: 11 });
  fx.field(px(700, 390, 830, 470), { ...win, seed: 12 });
  fx.field(px(450, 350, 700, 470), { ...win, seed: 13 });
  fx.field(px(215, 65, 295, 185), { ...win, seed: 14, exclude: [] });

  // ---- sky lanterns drift (only their own warm pixels move — never the stars) ------------------
  const lanternKey = (r, g, b) => {
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b), v = mx / 255;
    if (mx === mn) return 0;
    let h = mx === r ? ((g - b) / (mx - mn)) % 6 : mx === g ? (b - r) / (mx - mn) + 2 : (r - g) / (mx - mn) + 4;
    h = (h * 60 + 360) % 360;
    const warmHue = h < 55 || h > 340 ? 1 : 0;
    return warmHue * Math.min(1, Math.max(0, (v - 0.3) / 0.2));
  };
  const SKY = [
    [792, 22, 870, 145], [715, 112, 738, 150], [932, 135, 962, 188], [760, 192, 790, 240], [872, 162, 888, 185], [1012, 200, 1035, 235],
    [900, 220, 920, 250], [722, 245, 740, 272], [1062, 150, 1078, 172], [1087, 112, 1102, 137], [1117, 55, 1127, 72], [1272, 10, 1307, 62],
    [1310, 75, 1327, 102], [1332, 12, 1347, 37], [640, 135, 670, 185], [687, 182, 700, 207], [647, 217, 657, 232], [672, 255, 692, 282],
  ];
  const sky = SKY.map((r, i) => ({ el: fx.cutout(px(...r), { pad: 4, alphaOf: lanternKey, origin: '50% 0%' }), per: 6 + Math.random() * 5, ph: Math.random() * 6.28, amp: 2 + Math.random() * 2, g: (i * 3 + (i >> 2)) % 4, env: 0,
    cx: (r[0] + r[2]) / 2 / 1400, cy: (r[1] + (r[3] - r[1]) * 0.45) / 905, size: Math.max(r[2] - r[0], (r[3] - r[1]) * 0.6) / 1400 }));
  let skyStep = 0;

  // ---- boats rock very slightly (wood + lanterns move, the water doesn't) ----------------------
  const notWater = (r, g, b) => {
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
    if (mx === mn) return 1;
    let h = mx === r ? ((g - b) / (mx - mn)) % 6 : mx === g ? (b - r) / (mx - mn) + 2 : (r - g) / (mx - mn) + 4;
    h = (h * 60 + 360) % 360;
    return h > 190 && h < 280 ? 0 : 1; // blue water stays put
  };
  const boats = [[475, 532, 740, 595, 0], [570, 636, 765, 765, 2.2]].map(([x0, y0, x1, y1, ph]) =>
    ({ el: fx.cutout(px(x0, y0, x1, y1), { pad: 4, alphaOf: notWater, origin: '50% 80%' }), ph, per: 4.6 + ph * 0.5 }));

  // ---- palms: the big front crowns sway in a gentle night breeze -------------------------------
  // Only frond pixels move: the blue sky and its stars are keyed out, the trunks are cut out,
  // and each crown pivots where it meets its trunk.
  const fronds = (r, g, b) => {
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b), v = mx / 255, sat = mx ? (mx - mn) / mx : 0;
    if (v > 0.7 && sat < 0.25) return 0; // stars
    if (mx === mn) return 1;
    let h = mx === r ? ((g - b) / (mx - mn)) % 6 : mx === g ? (b - r) / (mx - mn) + 2 : (r - g) / (mx - mn) + 4;
    h = (h * 60 + 360) % 360;
    return h > 200 && h < 285 && sat > 0.22 ? 0 : 1; // night sky
  };
  // Trunks traced from the art (reference px) — cut out of the moving copies so only leaves sway.
  const TRUNK_LEFT = [[416, 0], [446, 0], [416, 83], [394, 167], [374, 236], [344, 236], [362, 167], [384, 83]];
  const TRUNK_CENTRE = [[521, 198], [545, 198], [537, 232], [519, 324], [495, 324], [515, 232]];
  const palms = [
    { r: [440, 120, 630, 320], origin: '47.5% 45%', amp: 2.4, per: 6.4 }, // big centre palm
    { r: [385, 0, 510, 132], origin: '30% 8%', amp: 3.0, per: 5.6 },      // top-left crown
    { r: [530, 0, 686, 120], origin: '45% 0%', amp: 2.7, per: 7.1 },      // top-right crown
  ].map(p => ({ ...p, el: fx.cutout(px(...p.r), { pad: 6, alphaOf: fronds, origin: p.origin, exclude: [TRUNK_LEFT, TRUNK_CENTRE] }), ph: Math.random() * 6.28 }));

  // ---- canvas: ripples under lanterns as their group lights, glints, embers ---------------------
  const { ctx, view } = fx.useCanvas();
  const ripples = [];
  const glints = Array.from({ length: 70 }, () => ({ x: 0.36 + Math.random() * 0.64, y: 0.56 + Math.random() * 0.43, ph: Math.random() * 6.28, sp: 0.5 + Math.random() }));
  const ember = softSprite(32, '255,190,110');
  const embers = [];
  const halo = softSprite(64, '255,180,90', [0.9, 0.35, 0]);
  let emberAcc = 0, beatCount = 0, t = 0;
  // stars: the painting's own small white/blue points (not lanterns or the moon) twinkle softly
  const starSprite = (() => { // soft core + thin four-point cross, so a twinkle reads as a sparkle
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
  const isMoonOrLantern = p => (p.x > 1205 / 1400 && p.x < 1282 / 1400 && p.y < 130 / 905) || SKY.some(([x0, y0, x1, y1]) => p.x * 1400 > x0 - 6 && p.x * 1400 < x1 + 6 && p.y * 905 > y0 - 6 && p.y * 905 < y1 + 6);
  const starLike = p => { const mx = Math.max(p.r, p.g, p.b), mn = Math.min(p.r, p.g, p.b); return p.b >= p.r - 10 && (mx - mn) / (mx || 1) < 0.5; };
  const stars = [
    ...fx.points(px(160, 0, 1400, 300), { threshold: 150, max: 140, spacing: 0.006 }),
    ...fx.points(px(160, 0, 1400, 300), { threshold: 105, max: 220, spacing: 0.006 }),
  ].filter(p => starLike(p) && !isMoonOrLantern(p)).slice(0, 110)
    .map(p => ({ x: p.x, y: p.y, per: 1.2 + Math.random() * 2, ph: Math.random() * 6.28, s: 0.6 + Math.random() * 0.7 }));

  return {
    update(a, dt) {
      fx.updateLights(a, dt);
      const m = a.motion;
      t += dt;

      // the group that just lit sends out ripples
      if (a.hit) {
        const g = ++beatCount % 3; // same counter as the lantern chase (it advances before lighting)
        water.forEach((L, i) => { if (GROUP[i] === g && ripples.length < 30) ripples.push({ x: L.cx, y: L.cy, age: 0, life: 1.8, s: 0.6 }); });
      }

      if (a.hit && a.active) skyStep++;
      for (const s of sky) {
        if (a.hit && a.active && skyStep % 4 === s.g) s.env = 1; // this lantern's group's turn
        s.env *= Math.exp(-dt / 0.45);
        s.el.style.filter = a.active ? `brightness(${(0.75 + 1.0 * s.env).toFixed(3)})` : '';
        const w = (t / s.per) * Math.PI * 2 + s.ph;
        s.el.style.transform = `translate(${(Math.sin(w * 0.7) * s.amp * 0.6 * m).toFixed(2)}px, ${(-(Math.sin(w) * 0.5 + 0.5) * s.amp * m).toFixed(2)}px) rotate(${(Math.sin(w * 0.9) * 1.2 * m).toFixed(2)}deg)`;
      }
      for (const p of palms) {
        const w = (t / p.per) * Math.PI * 2 + p.ph;
        const sway = Math.sin(w) * p.amp + Math.sin(w * 2.7 + 1.3) * 0.25 * p.amp; // slow sway + a little flutter
        p.el.style.transform = `rotate(${(sway * m).toFixed(3)}deg)`;
      }
      for (const b of boats) {
        const w = (t / b.per) * Math.PI * 2 + b.ph;
        // slow rock: bob, tilt and a little drift, each boat on its own rhythm
        b.el.style.transform = `translate(${(Math.sin(w * 0.5 + 1) * 1.5 * m).toFixed(2)}px, ${(Math.sin(w) * 2.5 * m).toFixed(2)}px) rotate(${(Math.sin(w + 0.8) * 1.5 * m).toFixed(3)}deg)`;
      }

      const { W, H, dpr } = view;
      ctx.clearRect(0, 0, W, H);
      ctx.globalCompositeOperation = 'screen';

      ctx.lineWidth = 1.2 * dpr;
      for (let i = ripples.length - 1; i >= 0; i--) {
        const r = ripples[i];
        r.age += dt * (0.4 + 0.6 * m);
        if (r.age > r.life) { ripples.splice(i, 1); continue; }
        const k = r.age / r.life;
        const rx = (0.01 + 0.05 * k) * W;
        ctx.strokeStyle = `rgba(255,205,140,${(0.35 * r.s) * (1 - k) ** 1.5})`;
        for (const f of [1, 0.6]) { ctx.beginPath(); ctx.ellipse(r.x * W, r.y * H, rx * f, rx * f * 0.22, 0, 0, Math.PI * 2); ctx.stroke(); }
      }

      for (const g of glints) {
        g.x -= dt * 0.004 * g.sp * m;
        if (g.x < 0.34) g.x = 1;
        const tw = 0.5 + 0.5 * Math.sin(t * 2.2 * g.sp + g.ph);
        ctx.fillStyle = `rgba(255,220,170,${(0.05 + 0.25 * tw * (0.4 + a.bass)).toFixed(3)})`;
        ctx.fillRect(g.x * W, g.y * H, (0.004 + 0.006 * tw) * W, dpr);
      }

      ctx.globalCompositeOperation = 'lighter';
      for (const st of stars) {
        const tw = Math.max(0, Math.sin((t / st.per) * Math.PI * 2 + st.ph)) ** 2; // soft glow → bright sparkle → soft glow
        const r = (0.003 + 0.006 * tw) * st.s * W;
        ctx.globalAlpha = 0.18 + (0.65 + 0.2 * a.treble) * tw;
        ctx.drawImage(starSprite, st.x * W - r, st.y * H - r, r * 2, r * 2);
      }
      // sky lanterns: a warm halo blooms around each lantern on its group's beat
      for (const s of sky) {
        if (s.env < 0.03 || !a.active) continue;
        const r = s.size * 1.6 * W;
        ctx.globalAlpha = 0.75 * s.env;
        ctx.drawImage(halo, s.cx * W - r, s.cy * H - r, r * 2, r * 2);
      }
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'screen';
      emberAcc += dt * 4 * m;
      while (emberAcc > 1) {
        emberAcc--;
        const src = water[(Math.random() * water.length) | 0];
        embers.push({ x: src.cx, y: src.cy - 0.03, age: 0, life: 4 + Math.random() * 3, vx: (Math.random() - 0.5) * 0.004 });
      }
      for (let i = embers.length - 1; i >= 0; i--) {
        const e = embers[i];
        e.age += dt;
        if (e.age > e.life) { embers.splice(i, 1); continue; }
        e.y -= dt * 0.018 * m;
        e.x += e.vx * dt * m;
        const k = e.age / e.life, r = 0.003 * W;
        ctx.globalAlpha = 0.6 * Math.sin(Math.PI * k);
        ctx.drawImage(ember, e.x * W - r, e.y * H - r, r * 2, r * 2);
      }
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
    },
  };
}
