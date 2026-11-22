import { player } from './player.js';
import { config, setConfig, onFrame, PRESETS, activePreset } from './audio-engine.js';

// Floating island. Collapsed: art · title/artist · live spectrum · play.
// Tapped, it morphs (same element) into the full player with Tracks / Scenes /
// reactivity tabs. Collapses itself 3 s after a selection or after a short idle.

const AFTER_SELECT_MS = 3000;
const IDLE_MS = 6000;

const ICON = {
  play: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5.5v13a1 1 0 0 0 1.5.86l10.4-6.5a1 1 0 0 0 0-1.72L9.5 4.64A1 1 0 0 0 8 5.5Z"/></svg>',
  pause: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="6.5" y="5" width="4" height="14" rx="1.3"/><rect x="13.5" y="5" width="4" height="14" rx="1.3"/></svg>',
  prev: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4.5" y="5.5" width="2.6" height="13" rx="1"/><path d="M19.5 6.6v10.8a1 1 0 0 1-1.55.83L9.9 12.83a1 1 0 0 1 0-1.66l8.05-5.4a1 1 0 0 1 1.55.83Z"/></svg>',
  next: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="16.9" y="5.5" width="2.6" height="13" rx="1"/><path d="M4.5 6.6v10.8a1 1 0 0 0 1.55.83l8.05-5.4a1 1 0 0 0 0-1.66L6.05 5.77a1 1 0 0 0-1.55.83Z"/></svg>',
  shuffle: '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 7h3.5c2 0 3 1 4.2 2.8l2.6 4.4C14.5 16 15.5 17 17.5 17H21M3 17h3.5c1.5 0 2.4-.6 3.3-1.7M14 8.7c.9-1.1 1.8-1.7 3.5-1.7H21M18.5 4.5 21 7l-2.5 2.5M18.5 14.5 21 17l-2.5 2.5"/></svg>',
  repeat: '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 11V9.5A2.5 2.5 0 0 1 6.5 7H19M16.5 4.5 19 7l-2.5 2.5M20 13v1.5a2.5 2.5 0 0 1-2.5 2.5H5M7.5 19.5 5 17l2.5-2.5"/></svg>',
  repeatOne: '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 11V9.5A2.5 2.5 0 0 1 6.5 7H19M16.5 4.5 19 7l-2.5 2.5M20 13v1.5a2.5 2.5 0 0 1-2.5 2.5H5M7.5 19.5 5 17l2.5-2.5"/><path d="M11.3 10.6 12.6 10v4.3" stroke-width="1.6"/></svg>',
  chevron: '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9.5 6 6 6-6"/></svg>',
  volLow: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 9.5h3l4.5-3.8v12.6L8 14.5H5z"/></svg>',
  volHigh: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3.5 9.5h3L11 5.7v12.6l-4.5-3.8h-3z"/><path d="M14.5 9a4 4 0 0 1 0 6M17 6.5a7.5 7.5 0 0 1 0 11" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>',
  mute: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3.5 9.5h3L11 5.7v12.6l-4.5-3.8h-3z"/><path d="m15 9.5 5 5m0-5-5 5" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>',
  note: '<svg viewBox="0 0 24 24" aria-hidden="true" fill="currentColor"><path d="M12 3v10.55A4 4 0 1 0 14 17V7h4V3h-6Z"/></svg>',
  scenes: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2.5 19 9 9.5l4 5.5 2.5-3 6 7z"/><circle cx="16.5" cy="7" r="2"/></svg>',
  sliders: '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M4 7h9M17 7h3M4 17h3M11 17h9"/><circle cx="15" cy="7" r="2"/><circle cx="9" cy="17" r="2"/></svg>',
};

const fmt = t => (Number.isFinite(t) ? `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, '0')}` : '–:––');

const artStyle = t => (t.art
  ? `background-image:url("${t.art}");background-size:${t.artZoom ?? 100}%;background-position:${(t.artFocus || [50, 50]).map(v => v + '%').join(' ')}`
  : `background-image:radial-gradient(120% 90% at 30% 20%,hsl(${t.hue + 30} 95% 70% / .9),transparent 60%),linear-gradient(150deg,hsl(${t.hue} 80% 55%),hsl(${t.hue + 50} 75% 22%))`);

// Waveform shows the spectrum centre-out: lows in the middle, highs at the edges.
const BAR_ORDER = [11, 9, 7, 5, 3, 1, 0, 2, 4, 6, 8, 10];

export function createIsland({ scenes, onScene }) {
  const el = document.createElement('div');
  el.className = 'island';
  el.dataset.open = 'false';
  el.innerHTML = `
    <div class="i-head">
      <button class="i-toggle" type="button" aria-expanded="false" aria-controls="i-panel">
        <span class="i-art">${ICON.note}</span>
        <span class="i-meta"><span class="i-title"></span><span class="i-sub"></span></span>
        <span class="i-wave" aria-hidden="true">${'<i></i>'.repeat(12)}</span>
      </button>
      <button class="i-btn i-mini-play" type="button" aria-label="Play">${ICON.play}</button>
      <button class="i-btn i-collapse" type="button" aria-label="Collapse player" tabindex="-1">${ICON.chevron}</button>
    </div>
    <div class="i-handle" aria-hidden="true"><span></span></div>
    <div class="i-panel" id="i-panel">
      <div class="i-panel-inner"><div class="i-content">
        <div class="i-seek">
          <input class="i-range" type="range" min="0" max="1000" step="1" value="0" aria-label="Seek">
          <div class="i-times"><span class="i-cur">0:00</span><span class="i-dur">–:––</span></div>
        </div>
        <div class="i-transport">
          <button class="i-btn i-shuffle" type="button" aria-label="Shuffle" aria-pressed="false">${ICON.shuffle}</button>
          <button class="i-btn i-prev" type="button" aria-label="Previous track">${ICON.prev}</button>
          <button class="i-btn i-play" type="button" aria-label="Play">${ICON.play}</button>
          <button class="i-btn i-next" type="button" aria-label="Next track">${ICON.next}</button>
          <button class="i-btn i-repeat" type="button" aria-label="Repeat all">${ICON.repeat}</button>
        </div>
        <div class="i-volume">
          <button class="i-btn i-mute" type="button" aria-label="Mute">${ICON.volLow}</button>
          <input class="i-range i-vol" type="range" min="0" max="1" step="0.01" aria-label="Volume">
          <span class="i-vol-hi" aria-hidden="true">${ICON.volHigh}</span>
        </div>

        <div class="i-tabs" role="tablist" aria-label="Player sections">
          <button class="i-tab" type="button" role="tab" data-tab="tracks" aria-controls="i-tab-tracks">${ICON.note}<span>Tracks</span></button>
          <button class="i-tab" type="button" role="tab" data-tab="scenes" aria-controls="i-tab-scenes">${ICON.scenes}<span>Scenes</span></button>
          <button class="i-tab" type="button" role="tab" data-tab="fx" aria-controls="i-tab-fx">${ICON.sliders}<span>Lights</span></button>
        </div>

        <div class="i-tabpanel" id="i-tab-tracks" role="tabpanel" data-tab="tracks"><ol class="i-library"></ol></div>
        <div class="i-tabpanel" id="i-tab-scenes" role="tabpanel" data-tab="scenes"><div class="i-worlds"></div></div>
        <div class="i-tabpanel i-settings" id="i-tab-fx" role="tabpanel" data-tab="fx">
          <p class="i-help">The scene's own lights follow the music: kicks flash the signs, melodies swell the windows, hi-hats make neon blink.</p>
          <label class="i-switch"><span>Music-reactive lights</span><input type="checkbox" data-key="enabled"><i></i></label>
          <div class="i-presets" role="radiogroup" aria-label="Lighting style"></div>
          <p class="i-help i-preset-help" aria-live="polite"></p>
          <details class="i-adjust">
            <summary>Fine-tune</summary>
            <label class="i-slider"><span>Sensitivity<small>How easily quiet music sets lights off</small></span><input class="i-range" type="range" min="0.25" max="3" step="0.05" data-key="sensitivity"><output></output></label>
            <label class="i-slider"><span>Intensity<small>How strong the light changes are</small></span><input class="i-range" type="range" min="0" max="2" step="0.05" data-key="intensity"><output></output></label>
            <label class="i-slider"><span>Smoothing<small>How slowly lights fade between changes</small></span><input class="i-range" type="range" min="0" max="1" step="0.05" data-key="smoothing"><output></output></label>
          </details>
        </div>
      </div></div>
    </div>`;
  document.body.append(el);

  const $ = s => el.querySelector(s);
  const toggleBtn = $('.i-toggle');
  const art = $('.i-head .i-art'), title = $('.i-title'), sub = $('.i-sub');
  const bars = [...el.querySelectorAll('.i-wave i')];
  const seek = $('.i-seek .i-range'), cur = $('.i-cur'), dur = $('.i-dur');
  const handle = $('.i-handle span');
  const vol = $('.i-vol'), muteBtn = $('.i-mute');
  const playBtns = [$('.i-mini-play'), $('.i-play')];
  const shuffleBtn = $('.i-shuffle'), repeatBtn = $('.i-repeat');
  const worlds = $('.i-worlds');
  const library = $('.i-library');
  const { audio } = player;

  // ---- open / close + auto-collapse --------------------------------------
  const isOpen = () => el.dataset.open === 'true';
  let timer = 0, hovering = false, afterSelect = false;

  function schedule(ms) {
    clearTimeout(timer);
    if (isOpen()) timer = setTimeout(() => setOpen(false), ms);
  }
  function setOpen(open) {
    el.dataset.open = String(open);
    toggleBtn.setAttribute('aria-expanded', String(open));
    toggleBtn.setAttribute('aria-label', open ? 'Collapse player' : `Open player — ${player.track.title}`);
    $('.i-collapse').tabIndex = open ? 0 : -1;
    afterSelect = false;
    if (open && !hovering) schedule(IDLE_MS); else clearTimeout(timer);
  }
  // A track or scene was picked: close shortly after, like a live activity settling.
  function selected() { afterSelect = true; schedule(AFTER_SELECT_MS); }

  toggleBtn.addEventListener('click', () => setOpen(!isOpen()));
  $('.i-collapse').addEventListener('click', () => { setOpen(false); toggleBtn.focus(); });

  el.addEventListener('pointerenter', e => { if (e.pointerType === 'mouse') { hovering = true; if (!afterSelect) clearTimeout(timer); } });
  el.addEventListener('pointerleave', e => { if (e.pointerType === 'mouse') { hovering = false; if (!afterSelect) schedule(AFTER_SELECT_MS); } });
  for (const ev of ['pointerdown', 'input', 'keydown', 'wheel']) {
    el.addEventListener(ev, () => { afterSelect = false; if (hovering) clearTimeout(timer); else schedule(IDLE_MS); }, { capture: true, passive: true });
  }

  // Outside click collapses and is swallowed, so it never hits anything behind.
  document.addEventListener('click', e => {
    if (isOpen() && !el.contains(e.target)) { e.stopPropagation(); e.preventDefault(); setOpen(false); }
  }, true);
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && isOpen()) { setOpen(false); toggleBtn.focus(); }
  });

  // ---- tabs --------------------------------------------------------------
  const tabs = [...el.querySelectorAll('.i-tab')];
  const panels = [...el.querySelectorAll('.i-tabpanel')];
  function setTab(name) {
    for (const t of tabs) {
      const on = t.dataset.tab === name;
      t.setAttribute('aria-selected', String(on));
      t.tabIndex = on ? 0 : -1;
    }
    for (const p of panels) p.hidden = p.dataset.tab !== name;
  }
  for (const t of tabs) t.addEventListener('click', () => setTab(t.dataset.tab));
  el.querySelector('.i-tabs').addEventListener('keydown', e => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    e.preventDefault();
    e.stopPropagation(); // don't let ←/→ also switch scenes
    const i = tabs.findIndex(t => t.getAttribute('aria-selected') === 'true');
    const n = tabs[(i + (e.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length];
    setTab(n.dataset.tab);
    n.focus();
  });
  setTab('tracks');

  // ---- transport ---------------------------------------------------------
  for (const b of playBtns) b.addEventListener('click', () => player.toggle());
  $('.i-prev').addEventListener('click', () => player.prev());
  $('.i-next').addEventListener('click', () => player.next());
  shuffleBtn.addEventListener('click', () => player.toggleShuffle());
  repeatBtn.addEventListener('click', () => player.toggleRepeat());

  function renderModes() {
    shuffleBtn.setAttribute('aria-pressed', String(player.shuffle));
    const one = player.repeat === 'one';
    repeatBtn.innerHTML = one ? ICON.repeatOne : ICON.repeat;
    repeatBtn.setAttribute('aria-label', one ? 'Repeat one' : 'Repeat all');
    repeatBtn.classList.toggle('on', one);
  }
  player.events.addEventListener('mode', renderModes);

  function renderPlaying() {
    const playing = !audio.paused;
    el.dataset.playing = String(playing);
    for (const b of playBtns) {
      b.innerHTML = playing ? ICON.pause : ICON.play;
      b.setAttribute('aria-label', playing ? 'Pause' : 'Play');
    }
  }
  audio.addEventListener('play', renderPlaying);
  audio.addEventListener('pause', renderPlaying);

  // ---- track info --------------------------------------------------------
  function renderTrack(animate) {
    const t = player.track;
    art.setAttribute('style', artStyle(t));
    art.classList.toggle('has-art', !!t.art);
    title.textContent = t.title;
    sub.textContent = t.artist || '';
    if (!isOpen()) toggleBtn.setAttribute('aria-label', `Open player — ${t.title}`);
    for (const [i, li] of [...library.children].entries()) {
      const on = i === player.index;
      li.classList.toggle('current', on);
      li.querySelector('button').setAttribute('aria-current', on ? 'true' : 'false');
    }
    if (animate) {
      const o = { duration: 380, easing: 'cubic-bezier(.2,.8,.2,1)' };
      $('.i-head .i-meta').animate([{ opacity: 0, transform: 'translateY(5px)' }, { opacity: 1, transform: 'none' }], o);
      art.animate([{ opacity: 0.2, transform: 'scale(.85)' }, { opacity: 1, transform: 'none' }], o);
    }
  }
  player.events.addEventListener('track', () => { renderTrack(true); renderTime(); });

  // ---- library -----------------------------------------------------------
  player.tracks.forEach((t, i) => {
    const li = document.createElement('li');
    li.innerHTML = `
      <button type="button">
        <span class="i-art i-art-sm" style='${artStyle(t)}'>${t.art ? '' : ICON.note}</span>
        <span class="i-meta"><span class="i-lt"></span><span class="i-la"></span></span>
        <span class="i-ld">–:––</span>
      </button>`;
    li.querySelector('.i-lt').textContent = t.title;
    li.querySelector('.i-la').textContent = t.artist || '';
    li.querySelector('button').addEventListener('click', () => { player.select(i, true); selected(); });
    library.append(li);
    // Metadata-only probe for the duration column; never played.
    const probe = new Audio();
    probe.preload = 'metadata';
    probe.addEventListener('loadedmetadata', () => { li.querySelector('.i-ld').textContent = fmt(probe.duration); probe.removeAttribute('src'); probe.load(); }, { once: true });
    probe.src = t.src;
  });

  // ---- progress ----------------------------------------------------------
  let dragging = false;
  const setFill = (input, frac) => input.style.setProperty('--p', `${(frac * 100).toFixed(2)}%`);
  function renderTime() {
    const d = audio.duration, t = audio.currentTime;
    const frac = Number.isFinite(d) && d > 0 ? t / d : 0;
    if (!dragging) { seek.value = String(Math.round(frac * 1000)); setFill(seek, frac); cur.textContent = fmt(t); }
    dur.textContent = fmt(d);
    handle.style.transform = `scaleX(${frac})`;
  }
  for (const ev of ['timeupdate', 'loadedmetadata', 'durationchange', 'seeked', 'emptied']) audio.addEventListener(ev, renderTime);
  seek.addEventListener('input', () => {
    dragging = true;
    const frac = seek.value / 1000;
    setFill(seek, frac);
    cur.textContent = fmt(frac * audio.duration);
  });
  seek.addEventListener('change', () => { player.seek((seek.value / 1000) * audio.duration); dragging = false; });

  // ---- volume ------------------------------------------------------------
  function renderVolume() {
    vol.value = String(player.volume);
    setFill(vol, player.volume);
    muteBtn.innerHTML = player.volume === 0 ? ICON.mute : ICON.volLow;
    muteBtn.setAttribute('aria-label', player.volume === 0 ? 'Unmute' : 'Mute');
  }
  vol.addEventListener('input', () => player.setVolume(parseFloat(vol.value)));
  muteBtn.addEventListener('click', () => player.toggleMute());
  player.events.addEventListener('volume', renderVolume);

  // ---- scenes ------------------------------------------------------------
  const tiles = new Map();
  for (const s of scenes) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'i-world';
    b.setAttribute('aria-label', s.title);
    b.style.setProperty('--tile-accent', s.accent);
    b.innerHTML = `<span class="i-thumb"></span><span class="i-world-label"></span>`;
    const thumb = b.firstElementChild;
    thumb.style.backgroundImage = `url("${s.src}")`;
    thumb.style.backgroundPosition = `${s.focus[0] * 100}% ${s.focus[1] * 100}%`;
    b.lastElementChild.textContent = s.short;
    b.addEventListener('click', () => { onScene(s.id); selected(); });
    worlds.append(b);
    tiles.set(s.id, b);
  }

  // ---- reactivity settings ----------------------------------------------
  const settingRenders = [];
  const renderSettings = () => settingRenders.forEach(r => r());
  for (const input of el.querySelectorAll('.i-settings [data-key]')) {
    const key = input.dataset.key;
    const out = input.parentElement.querySelector('output');
    const render = () => {
      if (input.type === 'checkbox') input.checked = config[key];
      else { input.value = String(config[key]); setFill(input, (config[key] - input.min) / (input.max - input.min)); out.textContent = `${Math.round(config[key] * 100)}%`; }
    };
    input.addEventListener('input', () => { setConfig({ [key]: input.type === 'checkbox' ? input.checked : parseFloat(input.value) }); renderSettings(); });
    settingRenders.push(render);
  }

  const presetBox = $('.i-presets');
  for (const [key, p] of Object.entries(PRESETS)) {
    const b = document.createElement('button');
    b.type = 'button';
    b.setAttribute('role', 'radio');
    b.textContent = p.label;
    b.addEventListener('click', () => {
      setConfig({ sensitivity: p.sensitivity, intensity: p.intensity, smoothing: p.smoothing });
      renderSettings();
    });
    presetBox.append(b);
    settingRenders.push(() => {
      const on = activePreset() === key;
      if (on) $('.i-preset-help').textContent = p.help;
      if (!activePreset()) $('.i-preset-help').textContent = 'Custom — set under Fine-tune.';
      el.querySelector('.i-settings').classList.toggle('off', !config.enabled);
      b.setAttribute('aria-checked', String(on));
      b.tabIndex = on || !activePreset() && key === 'balanced' ? 0 : -1;
    });
  }
  renderSettings();

  // ---- live spectrum waveform, straight from the analyser ---------------
  onFrame(s => {
    for (let i = 0; i < bars.length; i++) bars[i].style.transform = `scaleY(${(0.14 + 0.86 * s.bars[BAR_ORDER[i]]).toFixed(3)})`;
    if (!dragging && !audio.paused) renderTime(); // smooth per-frame progress while playing
  });

  renderTrack(false);
  renderPlaying();
  renderVolume();
  renderModes();
  renderTime();
  setOpen(false);

  return {
    setScene(s) {
      for (const [id, b] of tiles) b.setAttribute('aria-pressed', String(id === s.id));
    },
  };
}
