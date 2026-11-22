import { px } from '../fx.js';

// The Desert Frequency — the festival. While music plays the field settles to a night base
// and its own lights carry it:
//   painted laser beams   cyan beams fire on one beat, magenta on the next; dim between
//   main stage            a light show: screens + DJ ring fire on every beat in a pattern that
//                         changes each bar (sweep, outward, inward, alternating); truss bulbs twinkle
//   crowd                 phones and glowsticks flicker on the beat
//   ferris wheel          light chases around the wheel; pyramid glows with the melody
// Ambient: painted stage smoke drifts, stars twinkle. The wheel's chase never lights what's behind it.

export function create(fx) {
  fx.night(0.2);
  const neon = { min: 0.42, soft: 0.28, minSat: 0.3 };

  // ---- painted laser beams: cyan and magenta take turns on the beat --------------------------
  // Sky above the structures (reference px) — beams only, never stage screens or the wheel.
  const SKY = [[0, 0], [1400, 0], [1400, 330], [1340, 345], [1230, 340], [1200, 255], [1110, 238], [1000, 212], [930, 192], [880, 165],
    [790, 165], [740, 205], [690, 262], [600, 262], [520, 268], [480, 342], [380, 372], [270, 300], [0, 300]];
  const beam = (hue, idx, lag) => fx.light(px(0, 0, 1400, 380), { band: 'beat', mode: 'chase', group: 'lasers', idx, rest: 0.18, depth: 0.88, res: 0.5,
    key: { ...neon, hue, hueWidth: 28, region: SKY, regionSoft: 10 }, zone: 0, zoneKey: { min: 0.2, soft: 0.3, hue, hueWidth: 34, minSat: 0.25, region: SKY }, up: 0.015, down: 0.22, delay: lag });
  beam(188, 0, 0);   // cyan
  beam(300, 1, 0);   // magenta

  // ---- main stage light show ---------------------------------------------------------------------
  // A conductor fires every stage piece on each beat in a pattern that changes every bar:
  // sweep left → right, outward from the DJ, inward to the DJ, alternating sides. Bigger and
  // snappier when the song is loud, calmer in quiet parts. Only a gentle dip between hits; each hit
  // adds a soft-edged brightness boost on top.
  const STAGE = [
    [430, 400, 500, 572], [520, 340, 590, 542], [665, 290, 700, 453], [700, 220, 755, 325], // left screens
    [800, 235, 890, 330],                                                                   // centre screen
    [950, 210, 1030, 325], [1125, 320, 1185, 453], [1220, 385, 1300, 453],                  // right screens
  ];
  const DJX = 848, stagePieces = STAGE.map((r, i) => {
    const cx = (r[0] + r[2]) / 2;
    const L = fx.light(px(...r), { band: 'st' + i, adapt: false, floor: 0.7, depth: 0.45, key: { min: 0.33, soft: 0.3 }, up: 0.012, down: 0.12 }); // gentle dip only: edges never show
    const boost = fx.layer(px(...r), { filter: 'brightness(1.25) saturate(1.15)', feather: 18 }); // hits add brightness on top, soft edges
    return { L, boost, band: 'st' + i, x: (cx - 430) / 870, d: Math.min(1, Math.abs(cx - DJX) / 430), side: cx < DJX ? 0 : 1, env: 0, trig: [] };
  });
  // the ring behind the DJ hits hardest on the strongest kicks
  fx.light(px(745, 360, 980, 560), { band: 'stRing', adapt: false, floor: 0.7, depth: 0.45, key: { min: 0.38, soft: 0.3, exclude: [[765, 520, 940, 575]] }, up: 0.012, down: 0.12 });
  const ringPiece = { band: 'stRing', env: 0, trig: [], boost: fx.layer(px(760, 375, 965, 515), { filter: 'brightness(1.25) saturate(1.15)', feather: 18 }) };
  // orange-red ring around the DJ screen: its own light. Only its upper arc is visible (the rest
  // is behind the stage), so a bright comet sweeps along that arc — across in two beats, back
  // in the next two — with a fading tail; the rest of the arc stays dim.
  const RC = [848, 488], R0 = 115, R1 = 146, SEGS = 14, TH0 = -172, TH1 = 12; // degrees, 0 = right, -90 = top
  const ringArcs = Array.from({ length: SEGS }, (_, i) => {
    const a0 = (TH0 + (TH1 - TH0) * i / SEGS) * Math.PI / 180, a1 = (TH0 + (TH1 - TH0) * (i + 1) / SEGS) * Math.PI / 180;
    const arc = [];
    for (let k = 0; k <= 4; k++) { const an = a0 + (a1 - a0) * k / 4; arc.push([RC[0] + Math.cos(an) * R1, RC[1] + Math.sin(an) * R1]); }
    for (let k = 4; k >= 0; k--) { const an = a0 + (a1 - a0) * k / 4; arc.push([RC[0] + Math.cos(an) * R0, RC[1] + Math.sin(an) * R0]); }
    const xs = arc.map(q => q[0]), ys = arc.map(q => q[1]);
    const rect = px(Math.min(...xs) - 3, Math.min(...ys) - 3, Math.max(...xs) + 3, Math.max(...ys) + 3);
    const key = { min: 0.38, soft: 0.25, hue: 15, hueWidth: 28, minSat: 0.4, region: arc, regionSoft: 3 };
    const L = fx.light(rect, { band: 'or' + i, adapt: false, floor: 0, depth: 0.96, key, spill: 12, spillMax: 1, up: 0.025, down: 0.16 }); // dark at rest + wide warm glow when lit
    fx.light(rect, { link: L, depth: 0, key, spill: 2, spillMax: 1 }); // bright copy of the streak itself on top when lit
    return { band: 'or' + i, mid: (i + 0.5) / SEGS };
  });
  let cometPos = 0, cometTarget = 0, cometPrev = 0;
  const ringComet = (a, dt) => {
    if (a.hit && a.active) cometTarget += 0.5;                          // half the arc per beat
    cometPos += (cometTarget - cometPos) * (1 - Math.exp(-dt / 0.14));  // glides there quickly
    const ph = ((cometPos % 2) + 2) % 2, head = ph < 1 ? ph : 2 - ph;   // across, then back
    const dir = Math.sign(cometPos - cometPrev) * (ph < 1 ? 1 : -1); cometPrev = cometPos;
    for (const r of ringArcs) {
      const d = (head - r.mid) * (dir || 1);                            // > 0: behind the head
      a[r.band] = a.active ? Math.max(Math.exp(-((d * 5) ** 2)), d > 0 && d < 0.5 ? 0.6 * (1 - d / 0.5) : 0) : 0;
    }
  };

  // truss bulbs along the stage frame twinkle a few at a time on the beat (bulbs only)
  fx.field(px(345, 160, 1400, 570), { band: 'mid', mode: 'twinkle', groups: 16, rest: 0.2, depth: 0.9, minLit: 0.3, up: 0.02, down: 0.25, stagger: 0.3, feather: 0.02,
    key: { min: 0.68, soft: 0.15, hue: 22, hueWidth: 26, minSat: 0.45, exclude: STAGE.concat([[745, 360, 980, 575]]) } });
  let stageBeats = 0, stageClock = 0;
  const conduct = (a, dt) => {
    stageClock += dt;
    const loud = a.active ? Math.min(1, Math.max(a.energy, a.phraseDyn ?? 0)) : 0;
    if (a.hit && a.active) {
      const pattern = Math.floor(stageBeats / 4) % 4; // changes every bar
      const spread = 0.12 + 0.14 * (1 - loud);          // loud → tighter, punchier
      for (const pc of stagePieces) {
        let lag = 0, fire = true;
        if (pattern === 0) lag = pc.x * spread * 1.6;               // sweep left → right
        else if (pattern === 1) lag = pc.d * spread;                // outward from the DJ
        else if (pattern === 2) lag = (1 - pc.d) * spread;          // inward to the DJ
        else fire = pc.side === stageBeats % 2;                     // alternating sides
        if (fire) pc.trig.push([stageClock + lag, 0.45 + 0.55 * loud]);
      }
      ringPiece.trig.push([stageClock + (pattern === 2 ? spread : 0), Math.min(1, 0.35 + 0.65 * a.beat + 0.2 * loud)]);
      stageBeats++;
    }
    const decay = 0.18 + 0.2 * (1 - loud);
    for (const pc of [...stagePieces, ringPiece]) {
      while (pc.trig.length && stageClock >= pc.trig[0][0]) pc.env = Math.max(pc.env, pc.trig.shift()[1]);
      pc.env *= Math.exp(-dt / decay);
      a[pc.band] = pc.env;
      pc.boost.style.opacity = (0.45 * pc.env * (a.active ? 1 : 0)).toFixed(3);
    }
  };

  // blue spotlights inside the stage cross-fire: left-pointing on one beat, right-pointing on the next
  [[715, 228, 828, 372], [872, 228, 1020, 372]].forEach((r, i) => fx.light(px(...r), { band: 'beat', mode: 'chase', group: 'innerSpots', idx: i, rest: 0.2, depth: 0.9,
    key: { min: 0.55, soft: 0.25, hue: 192, hueWidth: 22, minSat: 0.45, exclude: [[800, 235, 890, 330]] }, spill: 6, spillMax: 0.6, up: 0.012, down: 0.22 }));


  // ---- crowd: phones and glowsticks flicker on the beat ---------------
  fx.field(px(0, 625, 1400, 790), { band: 'mid', mode: 'twinkle', groups: 10, rest: 0.08, depth: 0.95, minLit: 0.3, up: 0.03, down: 0.25, stagger: 0.3,
    key: { min: 0.5, soft: 0.25 }, feather: 0.05 });
  // phone / glowstick sparkles: each beat a handful of the crowd's own light points flare
  const cityLights = fx.points(px(235, 470, 440, 600), { threshold: 165, max: 45, spacing: 0.006 }).map(p => ({ ...p, v: 0 }));
  const sticks = fx.points(px(0, 615, 1400, 820), { threshold: 165, max: 140, spacing: 0.01 }).map(p => ({ ...p, v: 0 }));

  // ---- ferris wheel: light chases around the rim; pyramid glows with the melody -------------------
  const WC = [162, 425], WR = 140, SEG = 8;
  for (let i = 0; i < SEG; i++) {
    const a0 = (i / SEG) * Math.PI * 2 - Math.PI / 2, a1 = ((i + 1) / SEG) * Math.PI * 2 - Math.PI / 2;
    const wedge = [WC, ...[0, 0.5, 1].map(k => { const a = a0 + (a1 - a0) * k; return [WC[0] + Math.cos(a) * WR, WC[1] + Math.sin(a) * WR]; })];
    const xs = wedge.map(p => p[0]), ys = wedge.map(p => p[1]);
    fx.light(px(Math.min(...xs) - 4, Math.min(...ys) - 4, Math.max(...xs) + 4, Math.max(...ys) + 4), { band: 'beat', mode: 'chase', group: 'wheel', idx: i, rest: 0.35, depth: 0.85,
      key: { min: 0.55, soft: 0.25, minSat: 0.3, region: wedge, regionSoft: 5, exclude: [[0, 500, 330, 640]] }, spill: 5, spillMax: 0.5, up: 0.02, down: 0.4 });
  }
  fx.light(px(1250, 497, 1400, 662), { band: 'mid', floor: 0.2, depth: 0.85, key: { min: 0.4, soft: 0.3 }, spill: 8, spillMax: 0.5, contrast: 3.5, accent: 0.35, up: 0.08, down: 0.4 });

  // ---- painted stage smoke drifts and rolls slowly ------------------------------------------------
  const smokeKey = (r, g, b) => { const mx = Math.max(r, g, b), mn = Math.min(r, g, b), v = mx / 255, sat = mx ? (mx - mn) / mx : 0; return Math.min(1, Math.max(0, (v - 0.45) / 0.2)) * (sat < 0.55 ? 1 : 0); };
  const smoke = [[1075, 515, 1210, 595, 0], [570, 520, 705, 597, 0.45]].map(([x0, y0, x1, y1, ph]) => ({ ph,
    copies: [0, 1 / 3, 2 / 3].map(o => { const el = fx.cutout(px(x0, y0, x1, y1), { pad: 18, alphaOf: smokeKey, exclude: [[[0, 572], [1400, 572], [1400, 905], [0, 905]]] }); el.style.filter = 'blur(2px)'; return { o, el }; }) }));

  // ---- stars: local peaks surrounded by dark night sky only ---------------------------------------
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
  const STEP = 1.6, SW = Math.ceil(1400 / STEP), SH = Math.ceil(280 / STEP);
  const lum = new Float32Array(SW * SH), dark = new Uint8Array(SW * SH);
  for (let j = 0; j < SH; j++) for (let i = 0; i < SW; i++) {
    const [r, g, b] = fx.colorAt((i * STEP) / 1400, (j * STEP) / 905);
    const L = 0.3 * r + 0.59 * g + 0.11 * b;
    lum[j * SW + i] = L;
    dark[j * SW + i] = b > r + 10 && L < 75 ? 1 : 0; // dark blue night sky (not beams, not the milky way glow)
  }
  const stars = [];
  for (let j = 3; j < SH - 3; j++) for (let i = 3; i < SW - 3; i++) {
    const k = j * SW + i, v = lum[k];
    let peak = true, bg = 0, n = 0, sky = 0;
    for (let dj = -3; dj <= 3 && peak; dj++) for (let di = -3; di <= 3; di++) {
      const q = k + dj * SW + di;
      if (Math.abs(dj) <= 1 && Math.abs(di) <= 1) { if (lum[q] > v) { peak = false; break; } }
      else { bg += lum[q]; sky += dark[q]; n++; }
    }
    if (!peak || v - bg / n < 30 || sky < n * 0.9) continue;
    const X = i * STEP, Y = j * STEP;
    if (Math.hypot(X - 80, Y - 127) < 45) continue; // moon
    stars.push({ x: X / 1400, y: Y / 905, per: 1 + Math.random() * 2.5, ph: Math.random() * 6.28, s: 0.35 + 0.7 * Math.min(1, (v - bg / n) / 90) });
  }
  stars.sort((p, q) => q.s - p.s).splice(80);

  const { ctx, view } = fx.useCanvas();
  let t = 0;

  return {
    regions: [{ rect: px(0, 0, 1400, 300), band: 'treble', label: 'stars' }],
    update(a, dt) {
      conduct(a, dt);
      ringComet(a, dt);
      fx.updateLights(a, dt);
      const m = a.motion;
      t += dt;

      for (const sm of smoke) for (const cp of sm.copies) {
        const u = ((t / 6 + cp.o + sm.ph) % 1 + 1) % 1;
        cp.el.style.transform = `translate(${(Math.sin(t * 0.3 + sm.ph * 6 + cp.o * 4) * 5 * m + u * 6 * m).toFixed(2)}%, ${(-u * 16 * m).toFixed(2)}%) scale(${(1 + 0.22 * u).toFixed(3)})`;
        cp.el.style.opacity = (Math.sin(Math.PI * u) * 0.8).toFixed(3);
      }


      const { W, H } = view;
      ctx.clearRect(0, 0, W, H);
      ctx.globalCompositeOperation = 'lighter';
      for (const st of stars) {
        const tw = Math.max(0, Math.sin((t / st.per) * Math.PI * 2 + st.ph)) ** 2;
        const r = (0.003 + 0.006 * tw) * st.s * W;
        ctx.globalAlpha = (0.15 + (0.7 + 0.2 * a.treble) * tw) * (0.5 + 0.5 * st.s);
        ctx.drawImage(starSprite, st.x * W - r, st.y * H - r, r * 2, r * 2);
      }
      if (a.hit && a.active && !a.piano) for (let i = 0; i < 14; i++) sticks[(Math.random() * sticks.length) | 0].v = 0.7 + 0.3 * Math.random();
      if (a.piano && a.hit && a.active) for (let i = 0; i < 5; i++) sticks[(Math.random() * sticks.length) | 0].v = 0.5;
      if (a.hit && a.active) for (let i = 0; i < 6; i++) cityLights[(Math.random() * cityLights.length) | 0].v = a.piano ? 0.5 : 0.8 + 0.2 * Math.random();
      for (const p of cityLights) {
        p.v *= Math.exp(-dt / 0.35);
        if (p.v < 0.03) continue;
        const r = (0.003 + 0.005 * p.v) * W;
        ctx.globalAlpha = p.v;
        ctx.drawImage(starSprite, p.x * W - r, p.y * H - r, r * 2, r * 2);
      }
      for (const p of sticks) {
        p.v *= Math.exp(-dt / 0.28);
        if (p.v < 0.03) continue;
        const r = (0.004 + 0.007 * p.v) * W;
        ctx.globalAlpha = p.v;
        ctx.fillStyle = `rgb(${p.r},${p.g},${p.b})`;
        ctx.drawImage(starSprite, p.x * W - r, p.y * H - r, r * 2, r * 2);
      }
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
    },
  };
}
