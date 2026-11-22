import { px } from '../fx.js';

// Neon After Dark. KICK lights hit on every beat; MID lights swell; TREBLE blinks.
// While music plays the alley settles to a darker night base; every
// light then relights its own surroundings ("zone") while it's on, so the scene is
// lit by its lights rather than lit from the start. Paused = the original artwork.
//
//   居酒屋 (red)           bass pulse
//   カフェ (cyan)           mid pulse
//   ゲーム (magenta)        treble flicker — real blinks
//   カラオケ · cat · blue sign — beat chase, one per beat
//   Fuji billboard          flashes on every beat; its moon swells with the bass
//   pink tube (right)       bass gate — snaps on with hard kicks
//   road reflections        each colour follows the sign that casts it
//   floor lanterns          bass pulse travelling down the street (delay by distance)
//   ramen windows, paper lanterns, vending, umbrellas — warm/mid breathing
//   city windows            hundreds of windows flipping individually with the mids
//   Skytree                 light rises up the tower on every beat
//   metro                   light runs along the carriages on every beat

export function create(fx) {
  fx.night(0.3);

  const neon = { min: 0.42, soft: 0.25, minSat: 0.25 };

  // ---- KICK: lights that hit on every detected beat and decay between -----------------
  const izakaya = fx.light(px(412, 98, 502, 298), { band: 'bass', mode: 'beat', floor: 0.06, decay: 0.2, depth: 0.92, key: neon, zone: 70, spill: 14, up: 0.012, down: 0.08 });
  fx.light(px(1248, 268, 1348, 324), { band: 'bass', mode: 'beat', every: 2, floor: 0.05, decay: 0.25, depth: 0.92, key: neon, zone: 45, spill: 8, up: 0.01, down: 0.06 }); // pink tube, every 2nd kick
  [[102, 732, 160, 802], [460, 640, 492, 687], [557, 610, 580, 647], [642, 586, 656, 611], [1022, 587, 1038, 615], [1365, 747, 1400, 832]]
    .forEach(([x0, y0, x1, y1]) => fx.light(px(x0, y0, x1, y1), { band: 'bass', mode: 'beat', floor: 0.25, decay: 0.28, depth: 0.85, key: { min: 0.5, soft: 0.3 }, zone: 38, spill: 6, spillMax: 0.5, up: 0.015, down: 0.1 })); // floor lanterns
  fx.light(px(122, 305, 252, 452), { band: 'bass', mode: 'beat', floor: 0.35, decay: 0.32, depth: 0.65, key: { min: 0.45, soft: 0.3 }, zone: 45, spill: 12, spillMax: 0.45, up: 0.015, down: 0.12 }); // paper lanterns
  fx.light(px(448, 410, 522, 497), { band: 'bass', mode: 'beat', floor: 0.35, decay: 0.32, depth: 0.65, key: { min: 0.45, soft: 0.3 }, zone: 35, spill: 9, spillMax: 0.45, up: 0.015, down: 0.12 });

  // ---- BEAT CHASE: one small sign per beat ---------------------------------------------
  const chase = { band: 'beat', mode: 'chase', group: 'street', rest: 0.08, restBand: 'energy', restGain: 0.1, depth: 0.9, key: neon, up: 0.012, down: 0.25 };
  const karaoke = fx.light(px(653, 250, 709, 410), { ...chase, zone: 45, spill: 9 });
  fx.light(px(1074, 413, 1146, 512), { ...chase, zone: 40, spill: 7 }); // maneki-neko
  fx.light(px(988, 383, 1020, 468), { ...chase, zone: 25, spill: 5 });  // vertical blue sign

  // ---- MIDS: smooth, slower swells (vocals / synths) ------------------------------------
  const cafe = fx.light(px(1117, 100, 1216, 334), { band: 'mid', floor: 0, depth: 0.92, key: { ...neon, hue: 188, hueWidth: 30 }, zone: 70, spill: 14, contrast: 4.5, accent: 0.6, up: 0.06, down: 0.35 });
  // Fuji billboard: the LED screen flashes on every beat and dims between;
  // its moon has its own glow that swells with the bass.
  fx.light(px(752, 226, 834, 327), { band: 'bass', mode: 'beat', floor: 0.15, decay: 0.4, depth: 0.9, key: { min: 0.3, soft: 0.3 }, zone: 18, spill: 8, spillMax: 0.5, up: 0.012, down: 0.12 });
  fx.light(px(795, 248, 820, 274), { band: 'bass', floor: 0, depth: 0.85, key: { min: 0.6, soft: 0.25 }, spill: 8, spillMax: 0.8, contrast: 4.5, accent: 0.5, up: 0.04, down: 0.3, shape: 'ellipse' });
  fx.light(px(95, 320, 428, 585), { band: 'mid', floor: 0, depth: 0.9, contrast: 4.5, accent: 0.6, key: { min: 0.45, soft: 0.3 }, zone: 18, spill: 10, spillMax: 0.35, up: 0.12, down: 0.5 }); // ramen shop
  fx.light(px(1177, 452, 1267, 547), { band: 'mid', floor: 0, depth: 0.9, key: { min: 0.45, soft: 0.3 }, zone: 30, spill: 8, spillMax: 0.45, contrast: 4.5, accent: 0.6, up: 0.08, down: 0.4 });      // vending display
  fx.light(px(1165, 365, 1392, 452), { band: 'mid', floor: 0, depth: 0.9, key: { min: 0.45, soft: 0.3 }, zone: 20, contrast: 4.5, accent: 0.6, up: 0.08, down: 0.4, delay: 0.08 });
  fx.light(px(1282, 452, 1395, 602), { band: 'energy', floor: 0, depth: 0.9, key: { min: 0.45, soft: 0.3 }, zone: 10, contrast: 4.5, accent: 0.6, up: 0.15, down: 0.6 });
  // umbrellas: one oval light per canopy, so nothing behind them is touched
  [[652, 452, 778, 500, 0], [820, 490, 876, 512, 0.08], [882, 502, 920, 518, 0.16], [917, 500, 956, 516, 0.12], [950, 512, 981, 526, 0.2]]
    .forEach(([x0, y0, x1, y1, d]) => fx.light(px(x0, y0, x1, y1), { band: 'mid', floor: 0, depth: 0.9, shape: 'ellipse', key: { min: 0.4, soft: 0.3 }, contrast: 4.5, accent: 0.6, up: 0.1, down: 0.45, delay: d }));

  // ---- TREBLE: occasional real blinks ------------------------------------------------------
  const game = fx.light(px(1025, 158, 1099, 333), { band: 'treble', mode: 'flicker', base: 0.92, depth: 0.92, key: { ...neon, hue: 318, hueWidth: 35 }, zone: 55, spill: 10, delta: 0.1, cooldown: 1.6, fallbackEvery: 4 });
  fx.light(px(1180, 557, 1218, 612), { band: 'treble', mode: 'flicker', base: 0.95, depth: 0.6, key: { min: 0.35, soft: 0.3 }, zone: 12, delta: 0.12, cooldown: 2, fallbackEvery: 6 });

  // ---- ground reflections: each sign lights the streak of wet road beneath it -----------------
  // The whole wet road's reflections flare on every kick and sink between kicks
  // (only reflection pixels change — the road surface itself is untouched)…
  // The street between the curbs (reference px), traced from the art. Reflection lights
  // are confined to it with a soft edge, so the shop, stools and steam are never touched.
  const STREET = [[0, 905], [0, 892], [700, 602], [1000, 592], [1400, 892], [1400, 905]];
  fx.light(px(0, 585, 1400, 905), { band: 'bass', mode: 'beat', floor: 0.25, decay: 0.3, depth: 0.85, res: 0.5, key: { min: 0.38, soft: 0.3, region: STREET }, zone: 0, zoneKey: { min: 0.3, soft: 0.3, region: STREET }, spill: 6, spillMax: 0.55, up: 0.012, down: 0.1 });
  // …and the streak under each sign mirrors that sign exactly, blinks included.
  const streak = (link, rect, hue, width) => fx.light(rect, {
    link, depth: 0.95, res: 0.6, key: { min: 0.28, soft: 0.3, hue, hueWidth: width, region: STREET },
    zone: 0, zoneKey: { min: 0.25, soft: 0.3, hue, hueWidth: width + 10, region: STREET }, spill: 5, spillMax: 0.5, up: 0.01, down: 0.06,
  });
  streak(izakaya, px(370, 690, 570, 905), 18, 25);
  streak(karaoke, px(585, 630, 745, 905), 265, 28);
  streak(game, px(985, 680, 1165, 905), 318, 25);
  streak(cafe, px(1145, 690, 1300, 905), 190, 22);

  // ---- city: whole windows switch ON the beat; Skytree flashes; metro follows the mids ------
  const signs = [[405, 90, 510, 305], [645, 240, 718, 418], [745, 220, 840, 332], [895, 25, 955, 328], [1018, 150, 1106, 340], [1110, 92, 1222, 340], [982, 378, 1026, 474], [1068, 405, 1152, 518], [730, 318, 1035, 398]];
  const win = { band: 'mid', mode: 'twinkle', key: { min: 0.45, soft: 0.25 }, rest: 0.08, depth: 0.88, up: 0.03, down: 0.25, exclude: signs, feather: 0.22 };
  fx.field(px(600, 30, 750, 305), { ...win, seed: 1 });
  fx.field(px(755, 110, 900, 330), { ...win, seed: 2 });
  fx.field(px(945, 0, 1115, 330), { ...win, seed: 3 });
  fx.field(px(1150, 0, 1400, 255), { ...win, seed: 4, key: { min: 0.5, soft: 0.25 } });
  // warm windows further down the left side of the street (behind the plant)
  fx.field(px(550, 240, 760, 560), { ...win, seed: 7, rest: 0.15, exclude: [...signs, [676, 445, 790, 680]], key: { min: 0.5, soft: 0.25 } });
  fx.field(px(230, 95, 615, 335), { ...win, band: 'energy', seed: 5, rest: 0.2, key: { min: 0.5, soft: 0.25, hue: 35, hueWidth: 30 } });
  fx.field(px(895, 25, 955, 328), { band: 'beat', mode: 'rise', dir: 'up', bins: 10, rest: 0.2, restGain: 0.3, speed: 6, width: 0.3, up: 0.01, down: 0.3, key: { min: 0.4, soft: 0.3 }, depth: 0.88 }); // Skytree
  fx.light(px(733, 322, 1030, 395), { band: 'mid', floor: 0, depth: 0.95, key: { min: 0.45, soft: 0.3 }, zone: 6, zoneKey: { min: 0.35, soft: 0.3 }, contrast: 4.5, accent: 0.6, up: 0.08, down: 0.4 }); // metro windows

  // ---- ambient: rain + steam ------------------------------------------------------------
  // Rain matches the painted rain: straight down, fine and long, two depths, with
  // small splashes on the wet road.
  const { ctx, view } = fx.useCanvas();
  const drops = Array.from({ length: 460 }, (_, i) => {
    const near = i % 4 === 0;
    return { x: Math.random(), y: Math.random(), near, sp: near ? 1.9 : 1.2 + Math.random() * 0.3, len: near ? 0.05 : 0.025 + Math.random() * 0.015, a: near ? 0.34 : 0.16 + Math.random() * 0.1 };
  });
  const splashes = [];
  // ---- painted steam: two soft copies of the artwork's own steam take turns rising
  // and fading, with a slow sway — the steam moves but keeps the painting's look ----
  const steamKey = (r, g, b) => {
    const mx = Math.max(r, g, b), v = mx / 255, sat = mx ? (mx - Math.min(r, g, b)) / mx : 0;
    const sv = Math.min(1, Math.max(0, (v - 0.3) / 0.25)), ss = 1 - Math.min(1, Math.max(0, (sat - 0.35) / 0.25));
    return sv * ss;
  };
  const steams = [[440, 505, 522, 670, 0], [1045, 578, 1128, 670, 0.37]].map(([x0, y0, x1, y1, ph]) => ({
    ph, copies: [0, 1 / 3, 2 / 3].map(o => {
      const el = fx.cutout(px(x0, y0, x1, y1), { pad: 14, alphaOf: steamKey });
      el.style.filter = 'blur(1.5px)';
      return { o, el };
    }),
  }));

  // ---- people: mostly still, each with occasional small, eased shifts at their own
  // random moments (a weight change, a slight lean, a glance) — never in sync.
  // Cutouts are keyed to the figure's own dark silhouette, so no background moves.
  const silhouette = (r, g, b) => { const v = Math.max(r, g, b) / 255; return Math.min(1, Math.max(0, (0.34 - v) / 0.12)); };
  const person = (parts, amp, i) => ({
    parts, amp, cur: { x: 0, y: 0, r: 0 }, to: { x: 0, y: 0, r: 0 },
    next: 0.5 + Math.random() * 4, ease: 0.7 + Math.random() * 0.5, ph: Math.random() * 6.28, br: 3.4 + Math.random() * 1.6,
  });
  const people = [
    // walker: dark silhouette + the umbrella's oval canopy, both moving by a fraction of a pixel
    person([
      { el: fx.cutout(px(652, 452, 778, 500), { pad: 2, origin: '50% 100%' }), k: 0.3 }, // see-through: kept tiny
      { el: fx.cutout(px(683, 488, 765, 672), { pad: 2, alphaOf: silhouette }), k: 1 },
    ], 1.8, 0),
    // distant crowd
    ...[[830, 500, 866, 598], [864, 522, 879, 571], [889, 510, 916, 589], [924, 510, 951, 584], [956, 520, 976, 579], [979, 523, 996, 553]]
      .map((r, i) => person([{ el: fx.cutout(px(...r), { pad: 2, alphaOf: silhouette }), k: 1 }], 3.6, i + 1)),
    // the two diners on the left, very slight
    ...[[98, 486, 137, 554], [128, 494, 167, 554]]
      .map((r, i) => person([{ el: fx.cutout(px(...r), { pad: 2, alphaOf: silhouette }), k: 1 }], 2.0, i + 7)),
  ];
  let t = 0;

  return {
    update(a, dt) {
      fx.updateLights(a, dt);
      const m = a.motion;
      t += dt;
      const { W, H, dpr } = view;
      ctx.clearRect(0, 0, W, H);

      // rain
      ctx.lineCap = 'butt';
      for (const d of drops) {
        d.y += dt * d.sp * m;
        if (d.y - d.len > 1) {
          if (d.near && Math.random() < 0.5) splashes.push({ x: d.x, y: 0.66 + Math.random() * 0.32, age: 0 });
          d.y = -Math.random() * 0.2;
          d.x = Math.random();
        }
        const x = d.x * W;
        // rain picks up the colour of the light behind it, and shows brighter where it's lit
        const [cr, cg, cb] = fx.colorAt(d.x, Math.max(0, d.y - d.len / 2));
        const lum = Math.max(cr, cg, cb) / 255;
        ctx.strokeStyle = `rgba(${(cr + 400) / 3 | 0},${(cg + 420) / 3 | 0},${(cb + 460) / 3 | 0},${(d.a * (0.6 + 0.9 * lum)).toFixed(3)})`;
        ctx.lineWidth = (d.near ? 1.5 : 0.85) * dpr;
        ctx.beginPath(); ctx.moveTo(x, (d.y - d.len) * H); ctx.lineTo(x, d.y * H); ctx.stroke();
      }
      ctx.lineWidth = dpr;
      for (let i = splashes.length - 1; i >= 0; i--) {
        const s = splashes[i];
        s.age += dt;
        if (s.age > 0.35) { splashes.splice(i, 1); continue; }
        const k = s.age / 0.35, r = (0.002 + 0.006 * k) * W;
        ctx.strokeStyle = `rgba(210,220,255,${0.25 * (1 - k)})`;
        ctx.beginPath(); ctx.ellipse(s.x * W, s.y * H, r, r * 0.3, 0, 0, Math.PI * 2); ctx.stroke();
      }

      // painted steam rises
      for (const st of steams) for (const cp of st.copies) {
        const u = ((t / 5.5 + cp.o + st.ph) % 1 + 1) % 1;
        const sway = Math.sin(t * 0.4 + st.ph * 6 + cp.o * 5) * 2.5 * u;
        cp.el.style.transform = `translate(${sway.toFixed(2)}%, ${(-u * 30 * m).toFixed(2)}%) scale(${(1 + 0.25 * u).toFixed(3)}, ${(1 + 0.15 * u).toFixed(3)})`;
        cp.el.style.opacity = (Math.sin(Math.PI * u) ** 1.2 * 0.75).toFixed(3);
      }

      // people
      for (const f of people) {
        f.next -= dt;
        if (f.next <= 0) { // an occasional small shift to a new resting pose
          // sized relative to the figure (% of its own box), so it reads at any screen size
          const dir = Math.random() < 0.5 ? -1 : 1; // always a real shift, never a near-zero one
          f.to = { x: dir * (0.5 + 0.5 * Math.random()) * 3 * f.amp, y: -Math.random() * 1.2 * f.amp, r: dir * (0.4 + 0.6 * Math.random()) * 0.6 * Math.min(f.amp, 1.4) };
          f.next = 1.8 + Math.random() * 2.7;
        }
        const e = 1 - Math.exp(-dt / f.ease); // slow, eased — no snapping
        f.cur.x += (f.to.x - f.cur.x) * e; f.cur.y += (f.to.y - f.cur.y) * e; f.cur.r += (f.to.r - f.cur.r) * e;
        const breath = (Math.sin(t * Math.PI * 2 / f.br + f.ph) * 0.5 + 0.5) * 0.012 * Math.min(f.amp, 2); // gentle breathing
        for (const p of f.parts) {
          p.el.style.transform = `translate(${(f.cur.x * p.k * m).toFixed(2)}%, ${(f.cur.y * p.k * m).toFixed(2)}%) rotate(${(f.cur.r * p.k * m).toFixed(3)}deg) scale(1, ${(1 + breath * m).toFixed(4)})`;
        }
      }
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
    },
  };
}
