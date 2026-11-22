import { TRACKS } from './tracks.js';

// The single shared audio element for the whole app. Scenes never own audio,
// so switching scenes can never restart or duplicate playback.
const audio = new Audio();
audio.preload = 'auto';
audio.crossOrigin = 'anonymous'; // lets the Web Audio analyser read it later

const events = new EventTarget();
const emit = type => events.dispatchEvent(new Event(type));

let index = 0;
let volume = readVolume();
let fade = 1;       // 0–1 multiplier used for smooth track transitions
let fadeTimer = 0;
let switchToken = 0;
let lastVolume = volume || 0.8;
let output = null;  // GainNode once the audio engine is running

function readVolume() {
  try { const v = parseFloat(localStorage.getItem('mrw-volume')); return Number.isFinite(v) ? v : 0.8; }
  catch { return 0.8; }
}

// Once routed through Web Audio, volume lives on a GainNode *after* the analyser,
// so turning the volume down never dims the visuals.
function applyVolume() {
  const v = Math.max(0, Math.min(1, volume * fade));
  if (output) { audio.volume = 1; output.gain.value = v; }
  else audio.volume = v;
}

function setOutputGain(node) { output = node; applyVolume(); }

// setInterval, not rAF: rAF pauses in background tabs and would stall a track change.
function fadeTo(target, ms) {
  clearInterval(fadeTimer);
  const from = fade, t0 = performance.now();
  return new Promise(resolve => {
    fadeTimer = setInterval(() => {
      const k = Math.min(1, (performance.now() - t0) / ms);
      fade = from + (target - from) * k;
      applyVolume();
      if (k === 1) { clearInterval(fadeTimer); resolve(); }
    }, 16);
  });
}

async function play() {
  try { await audio.play(); } catch { /* blocked or interrupted; UI follows the real state via events */ }
}

function pause() { audio.pause(); }

function toggle() { audio.paused ? play() : pause(); }

async function select(i, autoplay = !audio.paused) {
  i = (i + TRACKS.length) % TRACKS.length;
  if (i === index && audio.src) { if (autoplay) play(); return; }
  const token = ++switchToken;
  if (!audio.paused) await fadeTo(0, 220);
  if (token !== switchToken) return; // a newer selection won
  index = i;
  audio.src = preloaded.get(TRACKS[i].src) ?? TRACKS[i].src;
  emit('track');
  if (autoplay) {
    fade = 0; applyVolume();
    await play();
    fadeTo(1, 450);
  } else {
    fade = 1; applyVolume();
  }
}

let shuffle = false;
let repeat = 'all'; // 'all' | 'one'

function next() {
  if (shuffle && TRACKS.length > 1) {
    let i;
    do i = Math.floor(Math.random() * TRACKS.length); while (i === index);
    return select(i);
  }
  return select(index + 1);
}
const prev = () => (audio.currentTime > 3 ? seek(0) : select(index - 1));

function toggleShuffle() { shuffle = !shuffle; emit('mode'); }
function toggleRepeat() { repeat = repeat === 'all' ? 'one' : 'all'; emit('mode'); }

function seek(t) {
  if (Number.isFinite(audio.duration)) audio.currentTime = Math.max(0, Math.min(audio.duration, t));
}

function setVolume(v) {
  volume = Math.max(0, Math.min(1, v));
  if (volume > 0) lastVolume = volume;
  applyVolume();
  try { localStorage.setItem('mrw-volume', String(volume)); } catch {}
  emit('volume');
}

const toggleMute = () => setVolume(volume > 0 ? 0 : lastVolume);

audio.addEventListener('ended', () => {
  if (repeat === 'one') { audio.currentTime = 0; play(); }
  else if (shuffle) { next(); play(); }
  else select(index + 1, true);
});

// Once a song is playing, download the next one in the list in the background so switching to
// it is instant. Only the playing and next songs are kept in memory.
const preloaded = new Map(); // track src → blob URL
let preloading = null;
audio.addEventListener('playing', async () => {
  const src = TRACKS[(index + 1) % TRACKS.length].src;
  if (preloaded.has(src) || preloading === src) return;
  preloading = src;
  try {
    const url = URL.createObjectURL(await (await fetch(src)).blob());
    const keep = new Set([src, TRACKS[index].src]);
    for (const [k, u] of preloaded) if (!keep.has(k) && u !== audio.src) { URL.revokeObjectURL(u); preloaded.delete(k); }
    preloaded.set(src, url);
  } catch { /* offline or blocked; the switch just streams as before */ }
  if (preloading === src) preloading = null;
});

audio.src = TRACKS[0].src;
applyVolume();

export const player = {
  audio, events, tracks: TRACKS,
  get index() { return index; },
  get track() { return TRACKS[index]; },
  get volume() { return volume; },
  get shuffle() { return shuffle; },
  get repeat() { return repeat; },
  play, pause, toggle, select, next, prev, seek, setVolume, toggleMute, setOutputGain, toggleShuffle, toggleRepeat,
};
