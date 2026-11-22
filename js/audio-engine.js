import { player } from './player.js';

// Shared music analysis. One AudioContext, one MediaElementSource for the one
// player element, one rAF loop. Visual consumers subscribe with onFrame() and
// read `audioState` — plain mutable numbers, nothing re-renders per frame.

const STORE = 'mrw-reactivity';
const USER_KEYS = ['enabled', 'sensitivity', 'intensity', 'smoothing'];

export const config = {
  enabled: true,
  sensitivity: 1,   // 0.25–3: input gain before the response curve
  intensity: 1,     // 0–2: how strongly scenes respond (read by consumers)
  smoothing: 0.5,   // 0–1: scales attack/release times
  bands: { bass: [20, 250], mid: [250, 4000], treble: [4000, 20000] }, // Hz
  curve: 1.4,       // response exponent: >1 keeps quiet parts calm, peaks punchy
  noiseFloor: 0.08, // normalised levels below this count as silence
  dynamics: 0.85,   // 0 = level vs. peak only, 1 = fully floor-to-peak (more pulse, less body)
  floorTime: 2.5,   // seconds for the adaptive floor to rise to a sustained level
  attack: 0.045,    // seconds, at smoothing 0.5
  release: 0.28,
  beat: {
    band: [30, 150], // Hz — kick range, so basslines and hats don't double-count
    lockConf: 0.18,  // autocorrelation strength needed to lock onto the tempo grid
    threshold: 2.0,  // flux must exceed its running average by this factor
    cooldown: 0.33,   // seconds between beats (caps at 200 bpm)
    minFlux: 0.015,  // absolute floor so near-silence never "beats"
    decay: 0.32,     // seconds for beatIntensity to fall back
  },
  ...load(),
};

export const audioState = {
  bassLevel: 0,
  midLevel: 0,
  trebleLevel: 0,
  overallEnergy: 0,
  beatDetected: false, // true only on the frame a beat fires
  beatIntensity: 0,
  active: false,       // analysing real audio right now
  bars: new Float32Array(12), // log-spaced 40 Hz–12 kHz spectrum, 0–1 (for small meters)
};

function load() {
  try { return Object.fromEntries(Object.entries(JSON.parse(localStorage.getItem(STORE)) || {}).filter(([k]) => USER_KEYS.includes(k))); }
  catch { return {}; }
}

// Lighting presets: shorthand for sensitivity / intensity / smoothing.
export const PRESETS = {
  chill: { label: 'Chill', help: 'Gentle, slow fades — good for calm tracks.', sensitivity: 0.8, intensity: 0.6, smoothing: 0.85 },
  balanced: { label: 'Balanced', help: 'Lights clearly follow the beat without overdoing it.', sensitivity: 1, intensity: 1, smoothing: 0.5 },
  full: { label: 'Full Energy', help: 'Big, punchy flashes on every hit.', sensitivity: 1.4, intensity: 1.6, smoothing: 0.25 },
};
export const activePreset = () => Object.keys(PRESETS).find(k =>
  ['sensitivity', 'intensity', 'smoothing'].every(p => Math.abs(PRESETS[k][p] - config[p]) < 0.001));

export function setConfig(patch) {
  Object.assign(config, patch);
  try { localStorage.setItem(STORE, JSON.stringify(Object.fromEntries(USER_KEYS.map(k => [k, config[k]])))); } catch {}
}

let ctx, analyser, freq, wave, binHz;

// Must run from a user gesture (autoplay policy). Safe to call repeatedly.
export function initAudio() {
  if (!ctx) {
    ctx = new AudioContext();
    const source = ctx.createMediaElementSource(player.audio); // created exactly once
    analyser = ctx.createAnalyser();
    analyser.fftSize = 2048;
    analyser.smoothingTimeConstant = 0; // smoothing is done below with attack/release
    analyser.minDecibels = -85;
    analyser.maxDecibels = -20;
    const gain = ctx.createGain();
    source.connect(analyser); // analysed before volume
    source.connect(gain).connect(ctx.destination);
    player.setOutputGain(gain);
    freq = new Uint8Array(analyser.frequencyBinCount);
    wave = new Float32Array(analyser.fftSize);
    binHz = ctx.sampleRate / analyser.fftSize;
  }
  if (ctx.state === 'suspended') ctx.resume();
}

const consumers = new Set();
export function onFrame(fn) { consumers.add(fn); return () => consumers.delete(fn); }

// One analysis pipeline, usable live or offline (tests feed it an OfflineAudioContext's analyser).
// Per frame: band means → noise gate → adaptive floor/peak normalisation → sensitivity →
// response curve → attack/release. Beats: positive spectral flux in the kick band vs. its
// running average, with a cooldown.
export function createAnalysis(out = { bassLevel: 0, midLevel: 0, trebleLevel: 0, overallEnergy: 0, beatDetected: false, beatIntensity: 0, bars: new Float32Array(12) }) {
  const peaks = { bass: 0.3, mid: 0.3, treble: 0.3, energy: 0.3, bars: 0.3 };
  const floors = { bass: 0, mid: 0, treble: 0, energy: 0 };
  let prev = null, fluxAvg = 0, fluxPeak = 0.05, lastBeat = -Infinity;
  // Beat tracker state: kick-onset history (6 s @ 60 Hz), tempo, lock confidence, next beat.
  const EH = 360, env = new Float32Array(EH);
  let envHead = 0, envCount = 0, period = 0.5, conf = 0, nextBeat = Infinity, lastTempo = -1, recent = 0;
  out.tempo = 0; out.locked = false;

  const follow = (cur, target, dt) => {
    const tau = (target > cur ? config.attack : config.release) * (0.2 + config.smoothing * 1.6); // smoothing 0.5 → ×1
    return cur + (target - cur) * (1 - Math.exp(-dt / tau));
  };

  function frame(freq, wave, binHz, dt, now, live) {
    out.beatDetected = false;
    const range = ([lo, hi]) => [Math.max(1, Math.floor(lo / binHz)), Math.min(freq.length - 1, Math.ceil(hi / binHz))];
    const mean = r => { const [a, b] = range(r); let sum = 0; for (let i = a; i <= b; i++) sum += freq[i]; return sum / ((b - a + 1) * 255); };

    // Music sits on a sustained bed (bassline, pads); normalising between a slowly
    // tracked floor and the recent peak lets pulses use the whole 0–1 range.
    const shape = (raw, key) => {
      const x = Math.max(0, (raw - config.noiseFloor) / (1 - config.noiseFloor));
      peaks[key] = Math.max(x, peaks[key] * Math.exp(-dt / 6));
      floors[key] = x < floors[key] ? x : floors[key] + (x - floors[key]) * (1 - Math.exp(-dt / config.floorTime));
      const abs = x / Math.max(peaks[key], 0.2);
      const dyn = (x - floors[key]) / Math.max(peaks[key] - floors[key], 0.12);
      const norm = abs + (dyn - abs) * config.dynamics;
      return Math.pow(Math.min(1, Math.max(0, norm) * config.sensitivity), config.curve);
    };

    let bass = 0, mid = 0, treble = 0, energy = 0;
    if (live) {
      bass = shape(mean(config.bands.bass), 'bass');
      mid = shape(mean(config.bands.mid), 'mid');
      treble = shape(mean(config.bands.treble), 'treble');
      let sq = 0;
      for (let i = 0; i < wave.length; i++) sq += wave[i] * wave[i];
      const db = 20 * Math.log10(Math.sqrt(sq / wave.length) + 1e-6); // loudness on a dB scale: -48 dB → 0, -6 dB → 1
      energy = shape(Math.min(1, Math.max(0, (db + 48) / 42)), 'energy');

      const [a, b] = range(config.beat.band);
      let flux = 0;
      if (prev) for (let i = a; i <= b; i++) flux += Math.max(0, freq[i] - prev[i]);
      flux /= (b - a + 1) * 255;
      (prev ||= new Uint8Array(freq.length)).set(freq);
      fluxPeak = Math.max(flux, fluxPeak * Math.exp(-dt / 4), 0.02);
      const { threshold, cooldown, minFlux } = config.beat;
      env[envHead] = flux; envHead = (envHead + 1) % EH; envCount = Math.min(EH, envCount + 1);
      recent = Math.max(flux, recent * Math.exp(-dt / 0.08)); // onset strength around "now"

      // Tempo: autocorrelation of the onset history, 78–150 bpm, every 0.5 s.
      if (envCount >= 180 && now - lastTempo > 0.5) {
        lastTempo = now;
        const n = envCount, at = i => env[(envHead - n + i + EH) % EH];
        let m = 0; for (let i = 0; i < n; i++) m += at(i); m /= n;
        let e0 = 0; for (let i = 0; i < n; i++) e0 += (at(i) - m) ** 2;
        let best = 0, bestLag = 0, ac = [];
        for (let lag = 24; lag <= 46; lag++) { // 78–150 bpm (fast tracks lock at half-time)
          let c = 0; for (let i = lag; i < n; i++) c += (at(i) - m) * (at(i - lag) - m);
          ac[lag] = c;
          if (c > best) { best = c; bestLag = lag; }
        }
        if (bestLag) {
          const a0 = ac[bestLag - 1] ?? best, a2 = ac[bestLag + 1] ?? best, den = a0 - 2 * best + a2;
          const lagF = bestLag + (den ? 0.5 * (a0 - a2) / den : 0); // sub-frame refinement
          const p = lagF / 60;
          conf = e0 > 0 ? best / e0 : 0;
          period = Math.abs(p - period) / period < 0.08 ? period * 0.8 + p * 0.2 : (conf > 0.25 ? p : period);
          out.tempo = Math.round(60 / period);
          // Phase: find where the beats fall in the onset history (the offset whose
          // grid collects the most kick energy), then align the next predicted beat.
          const pf = period * 60;
          let bestO = 0, bestE = -1;
          for (let o = 0; o < pf; o++) {
            let e = 0;
            for (let k = 0; o + k * pf < n; k++) e += at(n - 1 - Math.round(o + k * pf));
            if (e > bestE) { bestE = e; bestO = o; }
          }
          let nb = now - bestO / 60;
          while (nb <= now) nb += period;
          if (!Number.isFinite(nextBeat)) nextBeat = nb;
          else {
            let d = nb - nextBeat;
            d -= Math.round(d / period) * period; // nearest alignment
            nextBeat += Math.abs(d) > 0.05 ? d : d * 0.5;
          }
        }
      }
      out.locked = conf > config.beat.lockConf;

      if (out.locked) {
        // Phase: pull the predicted grid toward real kicks that land near it.
        if (flux > fluxAvg * 1.35 && flux > minFlux / config.sensitivity) {
          if (!Number.isFinite(nextBeat)) nextBeat = now + period;
          const e1 = now - (nextBeat - period), e2 = now - nextBeat;
          const err = Math.abs(e1) < Math.abs(e2) ? e1 : e2;
          if (Math.abs(err) < 0.12) nextBeat += 0.3 * err;
        }
        if (now >= nextBeat) {
          while (nextBeat <= now) nextBeat += period;
          lastBeat = now;
          out.beatDetected = true;
          out.beatIntensity = Math.max(out.beatIntensity, Math.min(1, 0.35 + 0.65 * (recent / fluxPeak) * config.sensitivity));
        }
      } else if (flux > fluxAvg * threshold && flux > minFlux / config.sensitivity && now - lastBeat > cooldown) {
        // No steady pulse (ambient passages): fall back to raw kick onsets.
        lastBeat = now;
        nextBeat = Infinity;
        out.beatDetected = true;
        out.beatIntensity = Math.max(out.beatIntensity, Math.min(1, (flux / fluxPeak) * config.sensitivity));
      }
      fluxAvg += (flux - fluxAvg) * (1 - Math.exp(-dt / 0.6));
    }

    // Log-spaced spectrum bars share one auto-gain so their relative shape is kept.
    const bars = out.bars, n = bars.length;
    let barPeak = 0;
    for (let i = 0; i < n; i++) {
      let target = 0;
      if (live) {
        const lo = 40 * (12000 / 40) ** (i / n), hi = 40 * (12000 / 40) ** ((i + 1) / n);
        const x = Math.max(0, (mean([lo, hi]) - config.noiseFloor) / (1 - config.noiseFloor));
        barPeak = Math.max(barPeak, x);
        target = Math.pow(Math.min(1, (x / Math.max(peaks.bars, 0.2)) * config.sensitivity), config.curve);
      }
      bars[i] = follow(bars[i], target, dt);
    }
    peaks.bars = Math.max(barPeak, peaks.bars * Math.exp(-dt / 6));

    out.bassLevel = follow(out.bassLevel, bass, dt);
    out.midLevel = follow(out.midLevel, mid, dt);
    out.trebleLevel = follow(out.trebleLevel, treble, dt);
    out.overallEnergy = follow(out.overallEnergy, energy, dt);
    out.beatIntensity *= Math.exp(-dt / config.beat.decay);
    return out;
  }
  // Forget the previous song (or position): tempo, beat grid, onset history and level calibration.
  // Without this the lights keep flashing on the old song's grid for seconds after a switch.
  function reset() {
    Object.assign(peaks, { bass: 0.3, mid: 0.3, treble: 0.3, energy: 0.3, bars: 0.3 });
    Object.assign(floors, { bass: 0, mid: 0, treble: 0, energy: 0 });
    prev = null; fluxAvg = 0; fluxPeak = 0.05; lastBeat = -Infinity;
    env.fill(0); envHead = 0; envCount = 0; period = 0.5; conf = 0; nextBeat = Infinity; lastTempo = -1; recent = 0;
    out.tempo = 0; out.locked = false; out.beatIntensity = 0;
  }
  return { frame, reset, state: out };
}

const live = createAnalysis(audioState);
player.events.addEventListener('track', () => live.reset()); // new song → re-learn its beat
player.audio.addEventListener('seeked', () => live.reset());  // jumped within a song → re-find the beat

function analyse(dt, now) {
  const on = !!ctx && ctx.state === 'running' && !player.audio.paused && config.enabled;
  audioState.active = on;
  if (on) {
    analyser.getByteFrequencyData(freq);
    analyser.getFloatTimeDomainData(wave);
  }
  live.frame(freq || new Uint8Array(1024), wave || new Float32Array(2048), binHz || 21.5, dt, now, on);
}

let last = performance.now();
// The next frame is scheduled first, and every part runs in its own try/catch: one error can
// never stop the loop (which would freeze every light in every scene).
const reported = new WeakSet();
function loop(now) {
  requestAnimationFrame(loop);
  const dt = Math.min(0.1, (now - last) / 1000);
  last = now;
  try { analyse(dt, now / 1000); } catch (e) { console.error('audio analysis', e); }
  for (const fn of consumers) {
    try { fn(audioState, dt, config); }
    catch (e) { if (!reported.has(fn)) { reported.add(fn); console.error('frame consumer', e); } }
  }
}
requestAnimationFrame(loop);
