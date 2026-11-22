// Scene registry. Image is 3456×2234; focus = focal point (0–1) kept in view when cover-cropping.
export const IMG_W = 3456;
export const IMG_H = 2234;

export const SCENES = [
  { id: 'neon-after-dark',  title: 'Neon After Dark',          short: 'Tokyo',    place: 'Rain-soaked Tokyo alley',     src: 'assets/web/neon-after-dark.webp',  focus: [0.55, 0.55], accent: '#d46bff' },
  { id: 'floating-lights',  title: 'The Floating Lights',      short: 'Floating', place: 'Riverside lantern festival',  src: 'assets/web/floating-lights.webp',  focus: [0.6, 0.5],   accent: '#ffa94d' },
  { id: 'electric-skyline', title: 'The Electric Skyline',     short: 'Skyline',  place: 'Waterfront under the bridge', src: 'assets/web/electric-skyline.webp', focus: [0.6, 0.45],  accent: '#6fa8ff' },
  { id: 'old-town',         title: 'Midnight in the Old Town', short: 'Old Town', place: 'Gothic market square',        src: 'assets/web/old-town.webp',         focus: [0.62, 0.5],  accent: '#f0a84a' },
  { id: 'desert-frequency', title: 'The Desert Frequency',     short: 'Desert',   place: 'Main stage, after midnight',  src: 'assets/web/desert-frequency.webp', focus: [0.6, 0.45],  accent: '#b06bff' },
];
