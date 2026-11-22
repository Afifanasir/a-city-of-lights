# Music Reactive Worlds — Asset Inventory & Plan

## Project structure (current)
```
Music Reactive Worlds/
├── PLAN.md
└── assets/scenes/        ← originals from scenes.zip, untouched (__MACOSX junk skipped)
```

## Asset inventory
All five: PNG, 8-bit RGBA, sRGB IEC61966-2.1, 144 DPI, non-interlaced.
3456 × 2234 px = native resolution of a 16" MacBook Pro (1728 × 1117 pt @2x).
Aspect ratio 1.547 : 1 (≈ 14:9 / 1728:1117).

| # | Scene | File | Size |
|---|-------|------|------|
| 1 | Neon After Dark | `Neon After Dark.png` | 14.3 MB (14,988,494 B) |
| 2 | The Floating Lights | `The Floating Lights.png` | 13.8 MB (14,468,462 B) |
| 3 | The Electric Skyline | `The Electric Skyline.png` | 13.0 MB (13,664,040 B) |
| 4 | Midnight in the Old Town | `Midnight in the Old Town.png` | 14.2 MB (14,870,313 B) |
| 5 | The Desert Frequency | `The Last Dance.png` ⚠ filename differs | 11.0 MB (11,492,630 B) |

Total: 66.3 MB.

### Fit notes
- A 16" MBP browser window is ~1728 × ~1000 (aspect ~1.73), wider than the art,
  so `object-fit: cover` crops ~5% top and bottom. Fine for all five.
- Portrait/mobile crops heavily on the sides → per-scene `object-position`
  focal point (e.g. Desert: stage centre; Neon: centre alley; Skyline: bridge tower).

### Reactive elements visible in each image
1. **Neon After Dark** — signs: 居酒屋 (red), カラオケ (violet), ゲーム (magenta), カフェ (cyan),
   maneki-neko neon; red paper lanterns; vending machine; Mt-Fuji billboard; train windows;
   tower beacon; wet-road reflections; rain; steam.
2. **The Floating Lights** — sky lanterns (rise/drift); floating water lanterns & lotus;
   hanging pavilion lanterns; golden temple; moon; Milky Way stars; river reflections.
3. **The Electric Skyline** — bridge cable bulbs (chase); bridge deck lights; skyscraper
   windows & spire; ferry; promenade lamp posts; moon; river reflections.
4. **Midnight in the Old Town** — wall lanterns; café/shop windows; candles on tables;
   market-stall string lights; bunting; cathedral rose window; clock face; moon; wet cobbles.
5. **The Desert Frequency** — laser beams; LED screens; stage halo ring; DJ; stage lights;
   haze; Ferris wheel; pyramid; crowd glowsticks; stars.

## Proposed implementation plan

**Stack:** plain HTML + CSS + vanilla ES modules, no build step, no dependencies.
Served with any static server (`python3 -m http.server`).

```
index.html
css/style.css
js/main.js        app shell: scene switcher, wires player → analyser → active scene
js/player.js      <audio>-based player: playlist, play/pause/next/prev/seek/volume
js/analyser.js    Web Audio AnalyserNode → { bass, mid, treble, energy, beat }
js/stage.js       cover-fit math so overlays stay pinned to image pixels at any size
js/scenes/*.js    one module per scene: its own hotspots + reaction logic
tracks.js         track list (add a track = add one line)
assets/scenes/    originals
assets/audio/     tracks
```

### Key technique: overlays pinned to the artwork, artwork never altered
- The image renders with `object-fit: cover`. `stage.js` computes the same
  cover transform and applies it to an overlay layer, so overlay coordinates are
  written in original image pixels (0–3456, 0–2234) and stay aligned at any size.
- **Self-masked glow:** to brighten a neon sign, a cropped region of the *same*
  image is layered on top with `mix-blend-mode: screen`/`plus-lighter` + blur,
  opacity driven by audio. Only the sign glows; no new artwork is drawn.
- Additive light (radial gradients, beams, particles) on a `<canvas>` above the
  image for lasers, sky-lantern drift, rain, glowsticks, reflection shimmer.
- One `requestAnimationFrame` loop; only the active scene runs.

### Audio analysis
- `MediaElementSource → AnalyserNode (fftSize 2048) → destination`.
- Bands: bass 20–150 Hz, mid 150–2 kHz, treble 2–12 kHz, energy = RMS.
- Beat: spectral flux on bass vs. rolling average with cooldown → beat pulse 0–1 that decays.
- Smoothed with attack/release so lights pulse instead of jittering.
- The single `<audio>` element lives outside the scenes → music continues across switches.

### Stages (each tested in the browser before the next)
1. Shell: full-viewport scene display, scene switcher, cover-fit verified at
   1728×1000, 1440×900, tablet, phone. No animation.
2. Music player UI + playlist, continuity across scene switches.
3. Analyser module + small debug meter (bass/mid/treble/energy/beat), toggleable.
4. Scene reactions, one scene at a time (1 → 5), each with its own hotspot map.
5. Polish: transitions between scenes, `prefers-reduced-motion`, performance pass.

## Open questions
1. ~~Music tracks~~ — **decided:** user supplies 3–4 files into `assets/audio/`.
2. **Image weight** — 66 MB of PNG is slow to load. OK to generate WebP delivery copies
   at the same 3456×2234 (visually lossless), keeping originals untouched?
3. **Filename** — keep `The Last Dance.png` as-is and map it to "The Desert Frequency"
   in code, or rename the file?
