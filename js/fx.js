// Building blocks for scene reactions. Everything visual is derived from the
// original artwork: glow layers are filtered crops of the scene's own pixels,
// laid back over the same spot with a light-adding blend. Nothing is repainted.

// Rects are written in the 1400×905 reference preview's pixels → fractions of the image.
export const px = (x0, y0, x1, y1) => [x0 / 1400, y0 / 905, (x1 - x0) / 1400, (y1 - y0) / 905];

const RES = 0.6; // glow layer resolution relative to the 3456 px source
const canvasFilter = typeof CanvasRenderingContext2D !== 'undefined' && 'filter' in CanvasRenderingContext2D.prototype;

export const clamp01 = v => (v < 0 ? 0 : v > 1 ? 1 : v);

// Frame-rate independent exponential follow with separate rise/fall times (seconds).
export function follow(cur, target, dt, up, down = up) {
  const tau = target > cur ? up : down;
  return cur + (target - cur) * (1 - Math.exp(-dt / Math.max(tau, 1e-3)));
}

// Fires when a level jumps above its own running average (audio-derived triggers only).
export class Onset {
  constructor(delta = 0.12, cooldown = 0.3, avgTime = 0.5) { Object.assign(this, { delta, cooldown, avgTime, avg: 0, since: 9 }); }
  update(v, dt) {
    this.since += dt;
    const hit = v - this.avg > this.delta && this.since > this.cooldown;
    if (hit) this.since = 0;
    this.avg = follow(this.avg, v, dt, this.avgTime);
    return hit;
  }
}

// Neon-style stutter envelope: brief on/off pattern after a trigger, 1 when idle.
const FLICKER = [0.15, 1, 0.35, 1, 0.6, 1];
export class Flicker {
  constructor(step = 0.035) { this.step = step; this.t = Infinity; }
  trigger() { this.t = 0; }
  value(dt) {
    this.t += dt;
    const i = Math.floor(this.t / this.step);
    return i < FLICKER.length ? FLICKER[i] : 1;
  }
}

export function createFx(stage, img) {
  const root = document.createElement('div');
  root.className = 'fx';
  stage.append(root);
  const IW = img.naturalWidth, IH = img.naturalHeight;

  // Filtered crop of the artwork. `filter` is applied once at creation (cheap per frame).
  // pad (reference px) widens the crop so blurred bloom isn't clipped.
  // clip: optional polygon in reference px, to follow shapes a rectangle can't (cables, decks).
  // band ('bass' | 'mid' | 'treble' | 'beat') is only used by the debug overlay.
  // feather (% of each side) fades the crop edges so a layer never leaves a visible seam.
  function layer(rect, { filter = 'none', blend = 'screen', pad = 0, res = RES, clip, band, feather = 6 } = {}) {
    const c = document.createElement('canvas');
    c.className = 'fx-layer';
    c.style.mixBlendMode = blend;
    c.style.opacity = '0';
    if (band) c.dataset.band = band;
    // Kept on the element so the debug overlay can move/resize a mask and re-crop it.
    c._fx = { rect: [...rect], draw: r => crop(c, r, { filter, pad, res, clip }) };
    c._fx.draw(rect);
    featherEdges(c, feather);
    root.append(c);
    return c;
  }

  function featherEdges(c, f) {
    if (!f) return;
    const m = `linear-gradient(90deg,transparent,#000 ${f}%,#000 ${100 - f}%,transparent),linear-gradient(transparent,#000 ${f}%,#000 ${100 - f}%,transparent)`;
    Object.assign(c.style, { maskImage: m, webkitMaskImage: m, maskComposite: 'intersect', webkitMaskComposite: 'source-in' });
  }

  // ---- light masks ------------------------------------------------------------
  // A keyed mask isolates one light's own pixels (by brightness, optionally hue) and
  // holds a dimmed copy of exactly those pixels. Its opacity is how far that light
  // is switched down: 0 = the original artwork, 1 = the light at `dim`.
  // Everything outside the key stays fully transparent, so nothing else changes.
  // shape: 'rect' (soft feathered edges) or 'ellipse' (oval falloff, e.g. umbrella canopies)
  // region: optional polygon (reference px) the light is confined to, with a soft edge
  // (regionSoft px) — e.g. the street between the curbs, so nothing above it is touched.
  function keyedMask(rect, { min = 0.5, soft = 0.25, hue, hueWidth = 25, minSat = 0, region, regionSoft = 14, exclude, feather = 10 } = {}, dim = 0.15, res = 0.75, band, shape = 'rect') {
    const c = document.createElement('canvas');
    c.className = 'fx-layer fx-mask';
    c.style.opacity = '0';
    if (band) c.dataset.band = band;
    const draw = r => {
      const [x, y, w, h] = r;
      c._fx.rect = [...r];
      c.width = Math.max(1, Math.round(w * IW * res));
      c.height = Math.max(1, Math.round(h * IH * res));
      const g = c.getContext('2d', { willReadFrequently: true });
      g.drawImage(img, x * IW, y * IH, w * IW, h * IH, 0, 0, c.width, c.height);
      const id = g.getImageData(0, 0, c.width, c.height), d = id.data;
      let reg = null;
      if (region || exclude) { // soft membership: inside `region`, outside every `exclude` rect
        const sx = c.width / (w * 1400), sy = c.height / (h * 905);
        const shape = document.createElement('canvas');
        shape.width = c.width; shape.height = c.height;
        const sg = shape.getContext('2d');
        sg.fillStyle = '#fff';
        if (region) {
          sg.beginPath();
          region.forEach(([qx, qy], j) => { const X = (qx - x * 1400) * sx, Y = (qy - y * 905) * sy; j ? sg.lineTo(X, Y) : sg.moveTo(X, Y); });
          sg.closePath(); sg.fill();
        } else sg.fillRect(0, 0, shape.width, shape.height);
        sg.globalCompositeOperation = 'destination-out';
        for (const [ex0, ey0, ex1, ey1] of exclude || []) sg.fillRect((ex0 - x * 1400) * sx, (ey0 - y * 905) * sy, (ex1 - ex0) * sx, (ey1 - ey0) * sy);
        const rc = document.createElement('canvas');
        rc.width = c.width; rc.height = c.height;
        const rg = rc.getContext('2d', { willReadFrequently: true });
        if (canvasFilter) rg.filter = `blur(${(regionSoft * sx).toFixed(1)}px)`;
        rg.drawImage(shape, 0, 0);
        reg = rg.getImageData(0, 0, rc.width, rc.height).data;
      }
      for (let i = 0; i < d.length; i += 4) {
        const R = d[i], G = d[i + 1], B = d[i + 2];
        const mx = Math.max(R, G, B), mn = Math.min(R, G, B);
        let k = (mx / 255 - min) / soft;
        k = k <= 0 ? 0 : k >= 1 ? 1 : k * k * (3 - 2 * k);
        if (k > 0 && (minSat || hue !== undefined)) {
          const sat = mx ? (mx - mn) / mx : 0;
          if (minSat && sat < minSat) k *= sat / minSat;
          if (hue !== undefined) {
            if (mx === mn) k = 0;
            else {
              let hh = mx === R ? ((G - B) / (mx - mn)) % 6 : mx === G ? (B - R) / (mx - mn) + 2 : (R - G) / (mx - mn) + 4;
              hh = (hh * 60 + 360) % 360;
              let dh = Math.abs(hh - hue); dh = Math.min(dh, 360 - dh);
              k *= dh <= hueWidth ? 1 : Math.max(0, 1 - (dh - hueWidth) / 15);
            }
          }
        }
        if (reg) k *= reg[i + 3] / 255;
        d[i] = R * dim; d[i + 1] = G * dim; d[i + 2] = B * dim; d[i + 3] = k * 255;
      }
      g.putImageData(id, 0, 0);
      Object.assign(c.style, { left: `${x * 100}%`, top: `${y * 100}%`, width: `${w * 100}%`, height: `${h * 100}%` });
    };
    c._fx = { rect: [...rect], draw };
    draw(rect);
    if (shape === 'ellipse') {
      const m = 'radial-gradient(ellipse closest-side, #000 55%, transparent 100%)';
      Object.assign(c.style, { maskImage: m, webkitMaskImage: m });
    } else featherEdges(c, region ? Math.min(feather, 2) : feather); // soft edges; a region already shapes the mask
    root.append(c);
    return c;
  }

  // One light = a keyed mask (can go dark) + optional spill (blurred copy of its own
  // pixels that blooms past the original when it's driven hard). Behaviours:
  //   pulse   — follows its band
  //   gate    — snaps on above `th`, off below (with hysteresis)
  //   flicker — normally on; onsets in its band fire real off/on stutters
  //   chase   — one light of a `group` is lit per beat, the rest rest at `rest`
  const HZ = 60, HN = 2 * HZ + 1;
  const hist = { bass: new Float32Array(HN), mid: new Float32Array(HN), treble: new Float32Array(HN), energy: new Float32Array(HN), beat: new Float32Array(HN) };
  let head = 0, acc = 0;
  const lights = [], groups = {};

  // ---- night base ---------------------------------------------------------------
  // While music plays, the scene settles to a constant darker night level (never
  // pulsing). Each light's `zone` then brings its own surroundings back to the
  // original art while it's on — so the scene is lit *by* its lights.
  let nightEl = null, nightAmt = 0, nightAct = 0;
  function night(amount) {
    nightAmt = amount;
    nightEl = document.createElement('div');
    nightEl.className = 'fx-night';
    nightEl.style.opacity = '0';
    root.prepend(nightEl);
  }

  // Zone: the original pixels around a light (low key, radial falloff) laid over the
  // night base. Opacity = how lit the light is. Overlaps are safe: same pixels.
  function zoneLayer(rect, pad, key, band) {
    const ex = pad / 1400, ey = pad / 905;
    const r = [Math.max(0, rect[0] - ex), Math.max(0, rect[1] - ey), 0, 0];
    r[2] = Math.min(1, rect[0] + rect[2] + ex) - r[0];
    r[3] = Math.min(1, rect[1] + rect[3] + ey) - r[1];
    const c = keyedMask(r, key, 1, 0.5, band, false);
    if (pad > 0) { // padded zones fall off softly around the light; pad 0 = pixel-keyed only (reflections)
      const m = 'radial-gradient(ellipse closest-side, #000 0%, rgba(0,0,0,.8) 30%, rgba(0,0,0,.35) 65%, transparent 100%)';
      Object.assign(c.style, { maskImage: m, webkitMaskImage: m });
    }
    c.classList.add('fx-zone');
    return c;
  }

  // Spill: a blurred copy of ONLY the light's own keyed pixels, so the glow follows
  // the sign's shape instead of forming a box. Blur is baked once at creation.
  function spillLayer(rect, amount, key, band) {
    const pad = amount * 4, ex = pad / 1400, ey = pad / 905;
    const r = [Math.max(0, rect[0] - ex), Math.max(0, rect[1] - ey), 0, 0];
    r[2] = Math.min(1, rect[0] + rect[2] + ex) - r[0];
    r[3] = Math.min(1, rect[1] + rect[3] + ey) - r[1];
    const res = 0.35;
    const src = keyedMask(r, key, 1, res);
    src.remove();
    const c = document.createElement('canvas');
    c.width = src.width; c.height = src.height;
    const g = c.getContext('2d');
    const blur = `blur(${(amount * res * IW / 1400).toFixed(1)}px) saturate(1.3) brightness(1.25)`;
    if (canvasFilter) g.filter = blur; else c.style.filter = blur;
    g.drawImage(src, 0, 0);
    c.className = 'fx-layer';
    if (band) c.dataset.band = band;
    Object.assign(c.style, { left: `${r[0] * 100}%`, top: `${r[1] * 100}%`, width: `${r[2] * 100}%`, height: `${r[3] * 100}%`, mixBlendMode: 'screen', opacity: '0' });
    featherEdges(c, 20); // the blur must fade out before the canvas edge — never a cut-off line
    c._fx = { rect: [...rect], draw: () => {} };
    root.append(c);
    return c;
  }

  function light(rect, o = {}) {
    const L = {
      band: 'mid', mode: 'pulse', depth: 0.8, th: 0.45, up: 0.05, down: 0.3, gain: 1, delay: 0, rest: 0.25, spillMax: 0.6, zoneMax: 1,
      ...o, level: 1, gate: 1, act: 0, fb: 0, flick: new Flicker(o.flickStep ?? 0.045),
    };
    if (L.mode === 'flicker') L.onset = new Onset(o.delta ?? 0.07, o.cooldown ?? 0.25);
    L.el = keyedMask(rect, o.key, o.dim ?? 0.15, o.res ?? 0.75, L.band, o.shape);
    if (o.zone !== undefined) L.zoneEl = zoneLayer(rect, o.zone, { min: 0.18, soft: 0.3, ...(o.zoneKey || {}) }, L.band);
    if (o.spill) L.spillEl = spillLayer(rect, o.spill, o.key, L.band);
    if (L.group) {
      const g = (groups[L.group] ||= { step: 0, n: 0 });
      L.idx ??= g.n;
      g.n = Math.max(g.n, L.idx + 1);
    }
    lights.push(L);
    return L;
  }

  function updateLights(a, dt) {
    acc += dt;
    while (acc >= 1 / HZ) { acc -= 1 / HZ; head = (head + 1) % HN; for (const k in hist) hist[k][head] = a[k]; }
    if (a.hit) for (const g in groups) groups[g].step++;
    const calm = a.motion < 0.5;
    nightAct = follow(nightAct, a.active ? 1 : 0, dt, 0.6);
    if (nightEl) nightEl.style.opacity = (nightAmt * nightAct).toFixed(3);
    for (const L of lights) {
      let v = clamp01((L.delay ? hist[L.band][(head - Math.min(HN - 1, Math.round(L.delay * HZ)) + HN) % HN] : a[L.band]) * L.gain);
      // Self-calibrating: react to rises and falls around this track's own running
      // level, so lights switch on and off on any song (busy or sparse, loud or soft).
      if (L.adapt !== false && L.mode !== 'chase' && L.mode !== 'flicker') {
        L.avg = L.avg === undefined ? v : follow(L.avg, v, dt, L.avgTime ?? 2);
        v = clamp01(0.5 + (v - L.avg) * (L.contrast ?? 2.4));
      }
      let target;
      if (L.link) {
        target = L.link.lit ?? L.link.level; // reflections etc. follow the light that casts them
      } else if (L.mode === 'beat') {
        // kick-locked: jumps on every detected beat (optionally every Nth), decays between
        // `lag` (s): this light fires a moment after the beat, so a pulse can travel along a row
        L.beats = (L.beats ?? 0) + (a.hit ? 1 : 0);
        L.clock = (L.clock ?? 0) + dt;
        if (a.hit && L.beats % (L.every ?? 1) === 0) (L.pending ||= []).push(L.clock + (L.lag ?? 0));
        L.env = (L.env ?? 0) * Math.exp(-dt / ((L.decay ?? 0.3) * (a.piano ? 1.5 : 1))); // piano: notes ring out a little longer
        if (L.pending?.length && L.clock >= L.pending[0]) { L.pending.shift(); L.env = a.piano ? Math.max(L.env, 0.55 + 0.45 * Math.min(1, a.beat)) : 1; } // piano: note glows, sized by the note
        target = (L.floor ?? 0) + ((L.peak ?? 1) - (L.floor ?? 0)) * L.env; // `peak`: lights can top out at different strengths
      } else if (L.mode === 'gate') {
        if (v > L.th) L.gate = 1; else if (v < L.th * 0.7) L.gate = 0;
        target = L.gate;
      } else if (L.mode === 'flicker') {
        target = L.base ?? 0.85;
        if (L.onset.update(v, dt) && !calm && !a.piano && v > (L.minLevel ?? 0.2)) L.flick.trigger(); // no blinking in piano mode
        // Songs/sections with no hi-hats: fall back to blinking every few beats.
        L.tavg = L.tavg === undefined ? v : follow(L.tavg, v, dt, 3);
        if (L.tavg < 0.06 && a.hit && !calm && !a.piano && ++L.fb % (L.fallbackEvery ?? 4) === 0) L.flick.trigger();
      } else if (L.mode === 'chase') {
        const g = groups[L.group];
        target = g.step % g.n === L.idx ? 1 : L.rest + (L.restBand ? (L.restGain ?? 0.15) * a[L.restBand] : 0);
      } else {
        target = (L.floor ?? 0) + (1 - (L.floor ?? 0)) * v;
        if (L.accent) { // a small kick on every beat on top of the smooth swell
          L.env = a.hit ? 1 : (L.env ?? 0) * Math.exp(-dt / 0.22);
          target = Math.min(1, target + L.accent * L.env);
        }
      }
      // Piano mode: every light also swells with the phrase (loud passages glow, soft ones
      // dim), and all changes are slower and smoother.
      if (a.piano && !L.link) {
        const lo = (L.floor ?? 0.2) * 0.5;
        const swell = lo + (1 - lo) * a.phraseDyn; // relative to the piece, so quiet → loud is a big change
        if (L.mode === 'chase') target = target >= 0.99 ? 0.55 + 0.45 * a.phraseDyn : (L.rest ?? 0.25) * 0.6; // keep turn-taking; phrase sets how bright
        else target = L.mode === 'beat' ? Math.min(1, 0.12 + 0.35 * a.phraseDyn + 0.65 * (L.env ?? 0)) : Math.max(target * 0.6, swell); // notes glow clearly above a phrase-led base
      }
      const slow = a.piano ? (L.mode === 'beat' ? 1 : 1.4) : 1;
      L.level = follow(L.level, target, dt, (calm ? L.up * 4 : L.up) * slow, (calm ? L.down * 2 : L.down) * slow);
      const f = L.mode === 'flicker' ? L.flick.value(dt) : 1;
      const lit = L.level * (calm ? 1 : f);
      L.lit = lit;
      // lights wake one by one when the music starts (each after its own short wait)
      L.wait ??= Math.random() * 1.6;
      L.since = a.active ? (L.since ?? 0) + dt : 0;
      L.act = follow(L.act, a.active && L.since > L.wait ? 1 : 0, dt, 0.5); // fade back to the original art when music stops
      L.el.style.opacity = ((1 - lit) * L.depth * L.act).toFixed(3);
      if (L.zoneEl) L.zoneEl.style.opacity = (lit * L.zoneMax * L.act).toFixed(3);
      if (L.spillEl) L.spillEl.style.opacity = (clamp01((lit - 0.5) / 0.5) * L.spillMax * L.act).toFixed(3);
    }
    for (const F of fields) F.update(a, dt, calm);
  }

  // ---- window fields ---------------------------------------------------------------
  // Many small lights (city windows, tower, train windows) in ONE canvas. Each lit
  // shape in the art (a window, a sign, a tower segment) is found as a connected
  // blob of bright pixels and switched as a whole — never cut into squares.
  //   twinkle — blobs are scattered into `groups`; each group has its own threshold
  //             and delay, so windows flip individually as the music swells and falls
  //   rise    — pixels are binned along `dir`; beats launch a soft wave through the bins
  // `exclude` (reference-px rects) keeps signs etc. out; field edges are feathered.
  const fields = [];
  function field(rect, o = {}) {
    const F = { band: 'mid', mode: 'twinkle', groups: 10, bins: 12, depth: 0.85, rest: 0.15, restGain: 0.5, dir: 'up', speed: 1.4, width: 0.12, up: 0.04, down: 0.3, key: { min: 0.5, soft: 0.25 }, feather: 0.1, ...o };
    const [x, y, w, h] = rect;
    const res = o.res ?? 0.6;
    const take = dim => { const c = keyedMask(rect, F.key, dim, res); c.remove(); return c; };
    const litC = take(1), dimC = take(F.dim ?? 0.12);
    const W = litC.width, H = litC.height, N = W * H;
    const lit = litC.getContext('2d').getImageData(0, 0, W, H), dim = dimC.getContext('2d').getImageData(0, 0, W, H);
    const A = new Float32Array(N);
    for (let i = 0; i < N; i++) A[i] = lit.data[i * 4 + 3] / 255;

    // exclusions + feathered edges
    for (const [ex0, ey0, ex1, ey1] of o.exclude || []) {
      const qx0 = Math.floor((ex0 / 1400 - x) / w * W), qx1 = Math.ceil((ex1 / 1400 - x) / w * W);
      const qy0 = Math.floor((ey0 / 905 - y) / h * H), qy1 = Math.ceil((ey1 / 905 - y) / h * H);
      for (let yy = Math.max(0, qy0); yy < Math.min(H, qy1); yy++) for (let xx = Math.max(0, qx0); xx < Math.min(W, qx1); xx++) A[yy * W + xx] = 0;
    }
    const fx_ = Math.max(1, F.feather * W), fy_ = Math.max(1, F.feather * H);
    for (let yy = 0; yy < H; yy++) for (let xx = 0; xx < W; xx++) {
      const e = Math.min(1, xx / fx_, (W - 1 - xx) / fx_, yy / fy_, (H - 1 - yy) / fy_);
      A[yy * W + xx] *= e * e * (3 - 2 * e);
    }

    // which group each pixel belongs to
    let seed = (o.seed ?? 7) * 9301;
    const rnd = () => ((seed = (seed * 9301 + 49297) % 233280) / 233280);
    const G = F.mode === 'rise' ? F.bins : F.groups;
    const grp = new Int16Array(N).fill(-1);
    if (F.mode === 'rise' || F.mode === 'swell') {
      for (let yy = 0; yy < H; yy++) for (let xx = 0; xx < W; xx++) {
        let pos = F.dir === 'up' ? 1 - yy / H : F.dir === 'down' ? yy / H : F.dir === 'left' ? 1 - xx / W : xx / W;
        // jitter: each column's wave arrives a little earlier/later → uneven, natural fronts
        if (F.jitter) { const c = xx / W * 9; pos += F.jitter * (Math.sin(c * 2.3 + 1.7) * 0.6 + Math.sin(c * 5.1 + 0.4) * 0.4); }
        grp[yy * W + xx] = Math.min(G - 1, Math.max(0, Math.floor(pos * G)));
      }
    } else {
      const stack = [];
      for (let i = 0; i < N; i++) {
        if (grp[i] !== -1 || A[i] < 0.25) continue;
        const gi = Math.floor(rnd() * G);
        grp[i] = gi; stack.push(i);
        while (stack.length) {
          const j = stack.pop(), jx = j % W;
          for (const k of [j - 1, j + 1, j - W, j + W]) {
            if (k < 0 || k >= N || (k === j - 1 && jx === 0) || (k === j + 1 && jx === W - 1)) continue;
            if (grp[k] === -1 && A[k] >= 0.25) { grp[k] = gi; stack.push(k); }
          }
        }
      }
      // faint fringe pixels join the nearest blob so shapes keep their soft edges
      for (let pass = 0; pass < 3; pass++) for (let i = 0; i < N; i++) {
        if (grp[i] !== -1 || A[i] === 0) continue;
        const jx = i % W;
        const nb = [jx > 0 ? i - 1 : -1, jx < W - 1 ? i + 1 : -1, i - W, i + W].find(k => k >= 0 && k < N && grp[k] >= 0);
        if (nb !== undefined) grp[i] = grp[nb];
      }
      for (let i = 0; i < N; i++) if (grp[i] === -1 && A[i] > 0) grp[i] = (i * 7919) % G;
    }

    // one lit + one dimmed canvas per group
    const layers = Array.from({ length: G }, () => {
      const mk = () => { const cc = document.createElement('canvas'); cc.width = W; cc.height = H; return cc; };
      return { litC: mk(), dimC: mk() };
    });
    const bufs = layers.map(() => ({ l: new ImageData(W, H), d: new ImageData(W, H) }));
    for (let i = 0; i < N; i++) {
      const gi = grp[i];
      if (gi < 0 || A[i] === 0) continue;
      const b = bufs[gi], p = i * 4, al = Math.round(A[i] * 255);
      b.l.data[p] = lit.data[p]; b.l.data[p + 1] = lit.data[p + 1]; b.l.data[p + 2] = lit.data[p + 2]; b.l.data[p + 3] = al;
      b.d.data[p] = dim.data[p]; b.d.data[p + 1] = dim.data[p + 1]; b.d.data[p + 2] = dim.data[p + 2]; b.d.data[p + 3] = al;
    }
    layers.forEach((L, gi) => { L.litC.getContext('2d').putImageData(bufs[gi].l, 0, 0); L.dimC.getContext('2d').putImageData(bufs[gi].d, 0, 0); });

    const c = document.createElement('canvas');
    c.className = 'fx-layer fx-field';
    c.dataset.band = F.band;
    c.width = W; c.height = H;
    Object.assign(c.style, { left: `${x * 100}%`, top: `${y * 100}%`, width: `${w * 100}%`, height: `${h * 100}%`, opacity: '1' });
    c._fx = { rect: [...rect], draw: () => {} };
    root.append(c);
    const g = c.getContext('2d');
    const state = layers.map((_, gi) => ({ th: 0.3 + rnd() * 0.45, delay: rnd() * 1.6, level: 1, on: 1, pos: (gi + 0.5) / G,
      f1: 1.3 + rnd() * 2.6, f2: 3.1 + rnd() * 3.7, p1: rnd() * 6.28, p2: rnd() * 6.28 }));
    const waves = [];
    let act = 0;
    F.update = (a, dt, calm) => {
      act = follow(act, a.active ? 1 : 0, dt, 0.5);
      if (F.mode === 'rise') {
        if (F.beats !== false && a.hit && (F.hits = (F.hits ?? 0) + 1) % (F.every ?? 1) === 0) waves.push(-F.width);
        if (F.interval && (F.clock ?? 0) >= (F.nextWave ?? 0)) { waves.push(-F.width); F.nextWave = (F.clock ?? 0) + F.interval; } // continuous flow
        for (let i = waves.length - 1; i >= 0; i--) { waves[i] += dt * F.speed * (calm ? 0.3 : 1); if (waves[i] > 1 + F.width * 3) waves.splice(i, 1); }
      }
      g.clearRect(0, 0, W, H);
      if (act < 0.01) return;
      const v = a[F.band];
      F.avg = F.avg === undefined ? v : follow(F.avg, v, dt, 3);
      // Windows only change ON a beat: how many groups are lit follows the band level
      // (calibrated to the track), and which ones rotates every beat. Sparse tracks
      // without clear beats still re-shuffle every 2 s.
      F.since = (F.since ?? 0) + dt;
      F.clock = (F.clock ?? 0) + dt;
      if (F.mode === 'twinkle' && (a.hit || F.since > 2)) {
        // On a beat a FEW groups change, each after its own short delay, so windows
        // flip one after another instead of the whole area switching at once.
        F.since = 0;
        const dv = clamp01(0.5 + (v - F.avg) * (F.contrast ?? 2.6));
        const lo = F.minLit ?? 0.15, want = Math.round(G * (lo + (0.95 - lo) * dv));
        const on = state.filter(t => (t.pendingOn ?? t.on) === 1), off = state.filter(t => (t.pendingOn ?? t.on) === 0);
        const pick = arr => arr.splice((Math.random() * arr.length) | 0, 1)[0];
        const plan = [];
        if (on.length < want) for (let i = 0; i < Math.min(2, want - on.length) && off.length; i++) plan.push([pick(off), 1]);
        else if (on.length > want) for (let i = 0; i < Math.min(2, on.length - want) && on.length; i++) plan.push([pick(on), 0]);
        if (on.length && off.length) { plan.push([pick(on), 0]); plan.push([pick(off), 1]); } // keep it alive even when steady
        for (const [t, val] of plan) { t.pendingOn = val; t.pendingAt = F.clock + Math.random() * (F.stagger ?? 0.45); }
      }
      for (const t of state) if (t.pendingAt !== undefined && F.clock >= t.pendingAt) { t.on = t.pendingOn; t.pendingAt = t.pendingOn = undefined; }
      state.forEach((t, gi) => {
        let target;
        if (F.mode === 'rise') {
          let wv = 0;
          for (const p of waves) wv = Math.max(wv, Math.exp(-((t.pos - p) ** 2) / (2 * F.width * F.width)));
          // shimmer: each band keeps wavering on its own between beats
          const sh = F.shimmer ? F.shimmer * Math.sin(F.clock * (1.1 + (gi * 0.37) % 1.3) + gi * 2.1) : 0;
          target = Math.max(wv, clamp01(F.rest + F.restGain * v + sh));
        } else if (F.mode === 'swell') {
          // soft bands of light rolling across the water toward the viewer, continuously;
          // the music only sets how lively they are (smoothly), never on the beat
          F.live = F.live === undefined ? v : F.live + (v - F.live) * (1 - Math.exp(-dt / 1.5));
          const n = Math.sin(t.pos * 17 - F.clock * 1.1) * 0.6 + Math.sin(t.pos * 37 + F.clock * 0.6 + gi) * 0.4;
          target = clamp01(F.rest + F.restGain * F.live + (0.2 + 0.3 * F.live) * n);
        } else if (F.mode === 'shimmer') {
          // every reflection piece wavers on its own (two incommensurate sines per piece);
          // the music only sets how lively the water is, smoothly — never on the beat
          F.live = F.live === undefined ? v : F.live + (v - F.live) * (1 - Math.exp(-dt / 1.5));
          const n = Math.sin(F.clock * t.f1 + t.p1) * 0.6 + Math.sin(F.clock * t.f2 + t.p2) * 0.4;
          target = clamp01(F.rest + F.restGain * F.live + (0.25 + 0.35 * F.live) * n);
        } else {
          target = t.on ? 1 : F.rest;
        }
        t.level = follow(t.level, target, dt, F.up, F.down);
        const lv = 1 - (1 - t.level) * act; // fully lit (= original) when music stops
        if (lv > 0.01) { g.globalAlpha = lv; g.drawImage(layers[gi].litC, 0, 0); }
        const off = (1 - t.level) * F.depth * act;
        if (off > 0.01) { g.globalAlpha = off; g.drawImage(layers[gi].dimC, 0, 0); }
      });
      g.globalAlpha = 1;
    };
    fields.push(F);
    return F;
  }

  function crop(c, rect, { filter, pad, res, clip }) {
    let [x, y, w, h] = rect;
    const ex = pad / 1400, ey = pad / 905;
    const x0 = Math.max(0, x - ex), y0 = Math.max(0, y - ey);
    const x1 = Math.min(1, x + w + ex), y1 = Math.min(1, y + h + ey);
    [x, y, w, h] = [x0, y0, x1 - x0, y1 - y0];
    c._fx.rect = [...rect];
    c.width = Math.max(1, Math.round(w * IW * res));
    c.height = Math.max(1, Math.round(h * IH * res));
    const g = c.getContext('2d');
    if (canvasFilter) g.filter = filter; else c.style.filter = filter;
    g.drawImage(img, x * IW, y * IH, w * IW, h * IH, 0, 0, c.width, c.height);
    Object.assign(c.style, { left: `${x * 100}%`, top: `${y * 100}%`, width: `${w * 100}%`, height: `${h * 100}%` });
    if (clip) {
      const pts = clip.map(([cx, cy]) => `${((cx / 1400 - x) / w * 100).toFixed(2)}% ${((cy / 905 - y) / h * 100).toFixed(2)}%`);
      c.style.clipPath = `polygon(${pts.join(',')})`;
    }
  }

  const tag = (el, band) => { el.dataset.band = band; return el; };

  // Cutout: a copy of part of the artwork placed exactly over itself, with soft oval
  // edges. Invisible until it's moved — used to give painted figures and painted steam
  // tiny movements without ever exposing a gap. alphaOf(r,g,b) → 0–1 keeps only some
  // pixels (e.g. steam). Animate it with CSS transforms/opacity (cheap per frame).
  // exclude: polygons (reference px) left out of the copy with a soft edge — e.g. a palm
  // trunk, so only the leaves move.
  function cutout(rect, { pad = 6, alphaOf, res = 0.75, origin = '50% 100%', exclude } = {}) {
    const ex = pad / 1400, ey = pad / 905;
    const r = [Math.max(0, rect[0] - ex), Math.max(0, rect[1] - ey), 0, 0];
    r[2] = Math.min(1, rect[0] + rect[2] + ex) - r[0];
    r[3] = Math.min(1, rect[1] + rect[3] + ey) - r[1];
    const c = document.createElement('canvas');
    c.width = Math.max(1, Math.round(r[2] * IW * res));
    c.height = Math.max(1, Math.round(r[3] * IH * res));
    const g = c.getContext('2d', { willReadFrequently: !!alphaOf });
    g.drawImage(img, r[0] * IW, r[1] * IH, r[2] * IW, r[3] * IH, 0, 0, c.width, c.height);
    if (alphaOf) {
      const id = g.getImageData(0, 0, c.width, c.height), d = id.data;
      for (let i = 0; i < d.length; i += 4) d[i + 3] = Math.round(255 * alphaOf(d[i], d[i + 1], d[i + 2]));
      g.putImageData(id, 0, 0);
    }
    if (exclude) {
      const sx = c.width / (r[2] * 1400), sy = c.height / (r[3] * 905);
      g.save();
      g.globalCompositeOperation = 'destination-out';
      if (canvasFilter) g.filter = `blur(${(4 * sx).toFixed(1)}px)`;
      g.fillStyle = '#000';
      for (const poly of exclude) {
        g.beginPath();
        poly.forEach(([qx, qy], j) => { const X = (qx - r[0] * 1400) * sx, Y = (qy - r[1] * 905) * sy; j ? g.lineTo(X, Y) : g.moveTo(X, Y); });
        g.closePath(); g.fill();
      }
      g.restore();
    }
    c.className = 'fx-layer fx-cutout';
    const m = 'radial-gradient(ellipse closest-side, #000 62%, transparent 100%)';
    Object.assign(c.style, {
      left: `${r[0] * 100}%`, top: `${r[1] * 100}%`, width: `${r[2] * 100}%`, height: `${r[3] * 100}%`,
      maskImage: m, webkitMaskImage: m, transformOrigin: origin, willChange: 'transform, opacity',
    });
    c._fx = { rect: [...rect], draw: () => {} };
    root.prepend(c); // beneath the night base and light masks, so it's lit exactly like the art around it
    return c;
  }

  // Brightest spots inside rect, read from the artwork itself (for twinkles, windows, glowsticks).
  let sample;
  function getSample() {
    if (!sample) {
      const c = document.createElement('canvas');
      c.width = 864; c.height = Math.round(864 * IH / IW);
      const g = c.getContext('2d', { willReadFrequently: true });
      g.drawImage(img, 0, 0, c.width, c.height);
      sample = { w: c.width, h: c.height, d: g.getImageData(0, 0, c.width, c.height).data };
    }
    return sample;
  }
  // The artwork's colour at (x, y) in 0–1 image coordinates — tints rain and steam.
  function colorAt(x, y) {
    const { w, h, d } = getSample();
    const i = (Math.min(h - 1, Math.max(0, (y * h) | 0)) * w + Math.min(w - 1, Math.max(0, (x * w) | 0))) * 4;
    return [d[i], d[i + 1], d[i + 2]];
  }
  function points(rect, { threshold = 200, max = 60, spacing = 0.008 } = {}) {
    const { w, h, d } = getSample();
    const [rx, ry, rw, rh] = rect;
    const cand = [];
    for (let y = Math.floor(ry * h); y < Math.min(h, (ry + rh) * h); y++) {
      for (let x = Math.floor(rx * w); x < Math.min(w, (rx + rw) * w); x++) {
        const i = (y * w + x) * 4;
        const l = 0.3 * d[i] + 0.59 * d[i + 1] + 0.11 * d[i + 2];
        if (l >= threshold) cand.push({ x: x / w, y: y / h, l, r: d[i], g: d[i + 1], b: d[i + 2] });
      }
    }
    cand.sort((a, b) => b.l - a.l);
    const out = [];
    const s2 = spacing * spacing;
    for (const p of cand) {
      if (out.length >= max) break;
      if (out.every(q => (q.x - p.x) ** 2 + ((q.y - p.y) * h / w) ** 2 > s2)) out.push(p);
    }
    return out;
  }

  // One particle canvas per scene, sized to the stage.
  const canvas = document.createElement('canvas');
  canvas.className = 'fx-canvas';
  const ctx = canvas.getContext('2d');
  const view = { W: 1, H: 1, dpr: 1 };
  function resize() {
    const r = stage.getBoundingClientRect();
    view.dpr = Math.min(devicePixelRatio || 1, 1.5);
    canvas.width = view.W = Math.max(1, Math.round(r.width * view.dpr));
    canvas.height = view.H = Math.max(1, Math.round(r.height * view.dpr));
  }
  new ResizeObserver(resize).observe(stage);
  resize();
  function useCanvas() { root.append(canvas); return { ctx, view }; }

  return { root, layer, tag, points, colorAt, cutout, useCanvas, light, field, night, updateLights };
}
