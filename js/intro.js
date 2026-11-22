// Opening page: an abstract night (gradient, drifting bokeh with a soft reflection, twinkling
// stars), the title and one Enter button. Enter starts the music (a user gesture, so audio is
// allowed) and plays the "lights come on" transition into the scene.

export function createIntro({ onEnter }) {
  const el = document.createElement('section');
  el.className = 'intro';
  el.setAttribute('aria-label', 'A City of Lights');
  el.innerHTML = `
    <canvas class="intro-sky" aria-hidden="true"></canvas>
    <div class="intro-content">
      <p class="intro-eyebrow"><span>An immersive audiovisual experience</span></p>
      <h1 class="intro-title">A City <em>of</em> Lights</h1>
      <button class="intro-enter" type="button">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5.5v13a1 1 0 0 0 1.5.86l10.4-6.5a1 1 0 0 0 0-1.72L9.5 4.64A1 1 0 0 0 8 5.5Z"/></svg>
        <span>Enter the Experience</span>
      </button>
    </div>`;
  document.body.append(el);
  document.body.classList.add('pre');

  // ---- night sky -----------------------------------------------------------------
  const c = el.querySelector('.intro-sky'), g = c.getContext('2d');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let W = 0, H = 0, dpr = 1;
  const resize = () => { dpr = Math.min(devicePixelRatio || 1, 2); W = c.width = innerWidth * dpr; H = c.height = innerHeight * dpr; };
  resize(); addEventListener('resize', resize);
  const HUES = ['255,170,90', '255,120,200', '170,120,255', '255,200,140', '120,150,255'];
  const bokeh = Array.from({ length: 26 }, () => ({
    x: Math.random(), y: 0.25 + Math.random() * 0.4, r: 0.012 + Math.random() * 0.04, c: HUES[(Math.random() * HUES.length) | 0],
    a: 0.12 + Math.random() * 0.3, vx: (Math.random() - 0.5) * 0.006, ph: Math.random() * 6.28, sp: 0.2 + Math.random() * 0.5,
  }));
  const stars = Array.from({ length: 140 }, () => ({ x: Math.random(), y: Math.random() * 0.55, s: Math.random(), ph: Math.random() * 6.28, sp: 0.5 + Math.random() * 1.8 }));
  let t = 0, last = performance.now(), raf = 0;
  const HORIZON = 0.68;
  const frame = now => {
    const dt = Math.min(0.05, (now - last) / 1000); last = now; t += reduced ? 0 : dt;
    g.clearRect(0, 0, W, H);
    for (const st of stars) {
      const tw = 0.35 + 0.65 * Math.max(0, Math.sin(t * st.sp + st.ph)) ** 2;
      g.fillStyle = `rgba(230,225,255,${(0.15 + 0.6 * st.s * tw).toFixed(3)})`;
      const r = (0.4 + st.s * 1.1) * dpr;
      g.beginPath(); g.arc(st.x * W, st.y * H, r, 0, 6.283); g.fill();
    }
    g.globalCompositeOperation = 'lighter';
    for (const b of bokeh) {
      b.x += b.vx * dt; if (b.x < -0.1) b.x = 1.1; if (b.x > 1.1) b.x = -0.1;
      const pulse = 0.75 + 0.25 * Math.sin(t * b.sp + b.ph);
      const x = b.x * W, y = (b.y + 0.01 * Math.sin(t * 0.3 + b.ph)) * H * HORIZON / 0.68, r = b.r * Math.max(W, H);
      for (const [yy, sy, al] of [[y, 1, 1], [2 * HORIZON * H - y, 0.35, 0.35]]) { // light + its reflection on the water
        const grad = g.createRadialGradient(x, yy, 0, x, yy, r);
        grad.addColorStop(0, `rgba(${b.c},${(b.a * pulse * al).toFixed(3)})`);
        grad.addColorStop(0.55, `rgba(${b.c},${(b.a * pulse * al * 0.4).toFixed(3)})`);
        grad.addColorStop(1, `rgba(${b.c},0)`);
        g.fillStyle = grad;
        g.save(); g.translate(x, yy); g.scale(1, sy); g.translate(-x, -yy);
        g.fillRect(x - r, yy - r, r * 2, r * 2); g.restore();
      }
    }
    g.globalCompositeOperation = 'source-over';
    raf = requestAnimationFrame(frame);
  };
  raf = requestAnimationFrame(frame);

  // ---- enter -----------------------------------------------------------------------
  const btn = el.querySelector('.intro-enter');
  setTimeout(() => btn.focus({ preventScroll: true }), 50);
  btn.addEventListener('click', () => {
    if (el.classList.contains('leaving')) return;
    el.classList.add('leaving');
    onEnter();
    const done = () => { cancelAnimationFrame(raf); el.remove(); };
    setTimeout(() => document.body.classList.remove('pre'), reduced ? 0 : 900);   // island + arrows arrive last
    setTimeout(done, reduced ? 50 : 2400);
  }, { once: false });
}
