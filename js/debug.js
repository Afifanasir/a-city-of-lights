import { audioState } from './audio-engine.js';

// Developer-only lighting debug. Available on localhost or with ?debug in the URL;
// toggle with Shift+L. Shows every lighting mask of the active scene, tinted by the
// band that drives it, with fill strength following the mask's live opacity.
// Click a mask to select it, then:
//   arrows           move 2 px (Shift: 10 px)    — re-crops from the original art
//   Alt + arrows     resize
//   C                copy its px(...) rect to paste back into the scene file
//   Esc              deselect

const COLORS = { bass: '255,70,70', mid: '70,150,255', treble: '190,90,255', beat: '70,225,130' };
const ref = r => [r[0] * 1400, r[1] * 905, (r[0] + r[2]) * 1400, (r[1] + r[3]) * 905].map(Math.round);
const fmtRect = r => `px(${ref(r).join(', ')})`;

export function setupDebug(getActive) {
  const allowed = ['localhost', '127.0.0.1'].includes(location.hostname) || new URLSearchParams(location.search).has('debug');
  if (!allowed) return;

  let on = false, builtFor = null, builtRuntime = null, overlay = null, boxes = [], selected = null, raf = 0;
  const panel = document.createElement('div');
  panel.className = 'dbg-panel';
  panel.innerHTML = `<b>Lighting debug</b> · Shift+L to close
    <div class="dbg-meters"></div><div class="dbg-sel">Click a mask to inspect it.</div>`;
  const meters = ['bass', 'mid', 'treble', 'beat'].map(k => {
    const row = document.createElement('div');
    row.className = 'dbg-meter';
    row.style.setProperty('--c', COLORS[k]);
    row.innerHTML = `<span>${k}</span><i></i>`;
    panel.querySelector('.dbg-meters').append(row);
    return row.querySelector('i');
  });
  const selInfo = panel.querySelector('.dbg-sel');

  function build() {
    overlay?.remove();
    boxes = [];
    selected = null;
    const { stage, runtime } = getActive();
    builtFor = stage;
    builtRuntime = runtime;
    if (!stage) return;
    overlay = document.createElement('div');
    overlay.className = 'dbg';
    for (const layer of stage.querySelectorAll('.fx-layer')) {
      const band = layer.dataset.band || 'mid';
      boxes.push(addBox(layer._fx.rect, band, band, layer));
    }
    for (const r of runtime?.regions || []) boxes.push(addBox(r.rect, r.band, `${r.band} · ${r.label}`, null));
    stage.append(overlay);
  }

  function addBox(rect, band, label, layer) {
    const el = document.createElement('div');
    el.className = `dbg-box${layer ? '' : ' region'}`;
    el.style.setProperty('--c', COLORS[band]);
    el.innerHTML = `<span>${label}</span>`;
    const box = { el, rect: [...rect], band, layer };
    place(box);
    el.addEventListener('click', e => { e.stopPropagation(); select(box); });
    overlay.append(el);
    return box;
  }

  function place(b) {
    const [x, y, w, h] = b.rect;
    Object.assign(b.el.style, { left: `${x * 100}%`, top: `${y * 100}%`, width: `${w * 100}%`, height: `${h * 100}%` });
  }

  function select(b) {
    selected?.el.classList.remove('sel');
    selected = b;
    b?.el.classList.add('sel');
    renderSel();
  }
  function renderSel() {
    selInfo.textContent = selected
      ? `${selected.band}${selected.layer ? '' : ' (canvas region)'}\n${fmtRect(selected.rect)}\narrows move · alt+arrows resize · C copy`
      : 'Click a mask to inspect it.';
  }

  function tick() {
    const act = getActive();
    if (act.stage !== builtFor || act.runtime !== builtRuntime) build(); // scene changed or its module just loaded
    const s = audioState;
    [s.bassLevel, s.midLevel, s.trebleLevel, s.beatIntensity].forEach((v, i) => { meters[i].style.transform = `scaleX(${v.toFixed(3)})`; });
    for (const b of boxes) if (b.layer) b.el.style.setProperty('--a', (0.08 + 0.5 * (+b.layer.style.opacity || 0)).toFixed(3));
    raf = requestAnimationFrame(tick);
  }

  function toggle() {
    on = !on;
    if (on) { document.body.append(panel); build(); raf = requestAnimationFrame(tick); }
    else { cancelAnimationFrame(raf); overlay?.remove(); panel.remove(); builtFor = null; }
  }

  // Capture phase so arrow keys adjust masks instead of switching scenes.
  addEventListener('keydown', e => {
    if (e.target.closest?.('input, textarea')) return;
    if (e.shiftKey && e.code === 'KeyL') { e.preventDefault(); toggle(); return; }
    if (!on || !selected) return;
    const step = (e.shiftKey ? 10 : 2);
    const d = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] }[e.key];
    if (d) {
      e.preventDefault();
      e.stopImmediatePropagation();
      const r = selected.rect;
      if (e.altKey) { r[2] = Math.max(2 / 1400, r[2] + d[0] / 1400); r[3] = Math.max(2 / 905, r[3] + d[1] / 905); }
      else { r[0] += d[0] / 1400; r[1] += d[1] / 905; }
      place(selected);
      selected.layer?._fx.draw(r);
      renderSel();
    } else if (e.code === 'KeyC') {
      navigator.clipboard?.writeText(fmtRect(selected.rect)).catch(() => {});
      selInfo.textContent += '\ncopied ✓';
    } else if (e.key === 'Escape') {
      e.stopImmediatePropagation();
      select(null);
    }
  }, true);
}
