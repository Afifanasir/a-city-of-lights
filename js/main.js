import { SCENES } from './scenes.js';
import { player } from './player.js';
import { initAudio, onFrame } from './audio-engine.js';
import { createIsland } from './island.js';
import { createFx } from './fx.js';
import { setupDebug } from './debug.js';
import { createIntro } from './intro.js';

const world = document.getElementById('world');
const sceneEls = new Map();

for (const [i, s] of SCENES.entries()) {
  const scene = document.createElement('section');
  scene.className = 'scene';
  scene.dataset.scene = s.id;
  scene.setAttribute('aria-label', `${s.title} — ${s.place}`);
  scene.innerHTML = `
    <div class="stage" style="--fx:${s.focus[0]};--fy:${s.focus[1]}">
      <img src="${s.src}" alt="${s.title}: ${s.place}" decoding="async" draggable="false"
           ${i === 0 ? 'fetchpriority="high"' : ''}>
    </div>`;
  world.append(scene);
  sceneEls.set(s.id, scene);
}

const island = createIsland({ scenes: SCENES, onScene: show });

let current = null;
let fading = null, fadingUntil = 0;

// ---- scene reactions: one module per scene in js/scenes/<id>.js, loaded on first visit ----
const runtimes = new Map();
async function ensureRuntime(id) {
  if (runtimes.has(id)) return;
  runtimes.set(id, null);
  const scene = sceneEls.get(id);
  const img = scene.querySelector('img');
  try {
    await img.decode();
    const mod = await import(`./scenes/${id}.js`);
    runtimes.set(id, mod.create(createFx(scene.querySelector('.stage'), img)));
  } catch (e) {
    console.info(`No reactions for ${id} yet`, e);
  }
}

const reduced = matchMedia('(prefers-reduced-motion: reduce)');
const a = { bass: 0, mid: 0, treble: 0, energy: 0, beat: 0, hit: false, motion: 1 };
onFrame((s, dt, cfg) => {
  const k = cfg.enabled ? cfg.intensity : 0;
  const calm = reduced.matches;
  // Intensity bends the levels along a curve instead of multiplying them, so strong presets push
  // lights brighter without ever clipping (clipped levels sit flat at max and lose the rhythm).
  const boost = v => (k > 0 ? 1 - Math.pow(1 - Math.min(1, Math.max(0, v)), k) : 0);
  a.bass = boost(s.bassLevel);
  a.mid = boost(s.midLevel);
  a.treble = boost(s.trebleLevel);
  a.energy = boost(s.overallEnergy);
  a.beat = boost(s.beatIntensity) * (calm ? 0.35 : 1);
  a.hit = s.beatDetected && k > 0 && !calm;
  a.motion = calm ? 0.3 : 1;
  a.active = s.active;
  // piano mode (per track): lights swell with phrases instead of flashing on beats
  a.piano = player.track.mode === 'piano';
  a.phrase = (a.phrase ?? 0) + (a.energy - (a.phrase ?? 0)) * (1 - Math.exp(-dt / 0.8));
  a.phraseAvg = (a.phraseAvg ?? a.phrase) + (a.phrase - (a.phraseAvg ?? a.phrase)) * (1 - Math.exp(-dt / 6));
  a.phraseDyn = Math.min(1, Math.max(0, 0.5 + (a.phrase - a.phraseAvg) * 3.5)); // phrase vs. the piece's own level
  if (window.__fxOverride) Object.assign(a, window.__fxOverride); // dev-only test hook
  runtimes.get(current)?.update(a, dt);
  if (fading && performance.now() < fadingUntil) runtimes.get(fading)?.update(a, dt);
});

// ---- carousel chrome: edge arrows, dots, caption ----------------------------
const ARROW = d => `<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="${d}"/></svg>`;
const prevBtn = document.createElement('button');
prevBtn.className = 'nav-arrow prev';
prevBtn.type = 'button';
prevBtn.innerHTML = ARROW('m14.5 6-6 6 6 6');
prevBtn.addEventListener('click', () => step(-1));
const nextBtn = document.createElement('button');
nextBtn.className = 'nav-arrow next';
nextBtn.type = 'button';
nextBtn.innerHTML = ARROW('m9.5 6 6 6-6 6');
nextBtn.addEventListener('click', () => step(1));
const dots = document.createElement('div');
dots.className = 'scene-dots';
dots.innerHTML = '<span class="scene-caption" aria-live="polite"></span><div class="dots"></div>';
const caption = dots.querySelector('.scene-caption');
const dotBtns = SCENES.map(s => {
  const b = document.createElement('button');
  b.type = 'button';
  b.setAttribute('aria-label', s.title);
  b.addEventListener('click', () => show(s.id));
  dots.querySelector('.dots').append(b);
  return b;
});
document.body.append(prevBtn, nextBtn, dots);

let captionTimer = 0;
const neighbour = d => SCENES[(SCENES.findIndex(x => x.id === current) + d + SCENES.length) % SCENES.length];

function show(id, dir) {
  const s = SCENES.find(x => x.id === id) ?? SCENES[0];
  if (s.id === current) return;
  ensureRuntime(s.id);
  const from = SCENES.findIndex(x => x.id === current), to = SCENES.indexOf(s);
  dir ??= to > from ? 1 : -1;
  const incoming = sceneEls.get(s.id);
  if (current) {
    const outgoing = sceneEls.get(current);
    outgoing.classList.remove('active');
    fading = current;
    fadingUntil = performance.now() + 1000;
    if (!reduced.matches) {
      const o = { duration: 900, easing: 'cubic-bezier(.32,.72,0,1)' };
      // drift stays under the 3% overscan the 1.06 scale adds per side, so no edge ever shows
      outgoing.animate([{ transform: 'none' }, { transform: `translateX(${-dir * 2.5}%) scale(1.06)` }], o);
      incoming.animate([{ transform: `translateX(${dir * 2.5}%) scale(1.06)` }, { transform: 'none' }], o);
    }
  }
  incoming.classList.add('active');
  document.documentElement.style.setProperty('--accent', s.accent);
  document.title = `${s.title} · Music Reactive Worlds`;
  history.replaceState(null, '', `#${s.id}`);
  island.setScene(s);
  current = s.id;

  dotBtns.forEach((b, i) => b.setAttribute('aria-current', String(i === to)));
  prevBtn.setAttribute('aria-label', `Previous world: ${neighbour(-1).title}`);
  nextBtn.setAttribute('aria-label', `Next world: ${neighbour(1).title}`);
  caption.textContent = s.title;
  dots.classList.add('show-caption');
  clearTimeout(captionTimer);
  captionTimer = setTimeout(() => dots.classList.remove('show-caption'), 2400);
}

function step(d) {
  show(neighbour(d).id, d);
}

// Horizontal swipe on touch screens.
let swipe = null;
world.addEventListener('pointerdown', e => { if (e.pointerType !== 'mouse') swipe = { x: e.clientX, y: e.clientY, t: performance.now() }; });
world.addEventListener('pointerup', e => {
  if (!swipe) return;
  const dx = e.clientX - swipe.x, dy = e.clientY - swipe.y;
  if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5 && performance.now() - swipe.t < 700) step(dx < 0 ? 1 : -1);
  swipe = null;
});
world.addEventListener('pointercancel', () => { swipe = null; });

// Audio context may only start after a user gesture.
for (const ev of ['pointerdown', 'keydown']) addEventListener(ev, initAudio, { capture: true });
player.audio.addEventListener('play', initAudio);

addEventListener('keydown', e => {
  if (document.body.classList.contains('pre')) return; // opening page: only its Enter button
  if (e.target.closest?.('input, textarea, select') || e.metaKey || e.ctrlKey || e.altKey) return;
  const n = Number(e.key);
  if (n >= 1 && n <= SCENES.length) show(SCENES[n - 1].id);
  else if (e.key === 'ArrowRight') step(1);
  else if (e.key === 'ArrowLeft') step(-1);
  else if (e.key === ' ' && !e.target.closest?.('button, summary')) { e.preventDefault(); player.toggle(); }
});

setupDebug(() => ({
  stage: sceneEls.get(current)?.querySelector('.stage'),
  runtime: runtimes.get(current),
}));

show(location.hash.slice(1));

// Build every scene's lights while the opening page is up (building one freezes the page for
// 0.2–0.6 s), so later scene switches are instant. One per turn, with a yield in between.
(async () => {
  for (const s of SCENES) {
    await ensureRuntime(s.id);
    // and paint it once, hidden behind the opaque opening page: the first paint costs ~100 ms
    const el = sceneEls.get(s.id);
    if (document.body.classList.contains('pre') && s.id !== current) {
      el.style.cssText = 'visibility:visible;opacity:1;transition:none';
      await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
      el.style.cssText = '';
    }
    await new Promise(r => setTimeout(r, 30));
  }
})();

// ---- opening page → "lights come on": the scene starts blurred and dark, melts into view as
// the music starts, and its lights switch on one by one (see the staggered wake-up in fx.js)
world.classList.add('arriving');
createIntro({
  onEnter() {
    initAudio();
    player.play();
    requestAnimationFrame(() => world.classList.remove('arriving'));
  },
});
