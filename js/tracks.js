// Music library. To add a track: drop the file in assets/audio/ and add one line.
// `art` (optional) = cover image; otherwise a gradient from `hue` is used.
// `artZoom` / `artFocus` (optional) frame the cover inside the round icon:
// zoom as a background-size %, focus as background-position [x%, y%].
// `mode: 'piano'` (optional): lights swell with phrases instead of flashing on beats.
export const TRACKS = [
  { title: 'Sunset',                    artist: 'The Midnight', src: 'assets/audio/the-midnight-sunset.mp3',     art: 'assets/audio/covers/the-midnight-sunset.webp' },
  { title: 'Idea 25',                   artist: 'Gibran Alcocer & Andrea Vanzo', src: 'assets/audio/idea-25.m4a', art: 'assets/audio/covers/idea-25.webp', artZoom: 150, artFocus: [62, 66], mode: 'piano' },
  { title: 'Awake',                     artist: 'Tycho',        src: 'assets/audio/tycho-awake.mp3',             art: 'assets/audio/covers/tycho-awake.webp', artZoom: 165, artFocus: [50, 33] },
  { title: 'Innerbloom (Original Mix)', artist: 'RÜFÜS DU SOL', src: 'assets/audio/rufus-du-sol-innerbloom.mp3', art: 'assets/audio/covers/rufus-du-sol-innerbloom.webp' },
  { title: 'Deep Urban',                artist: '',             src: 'assets/audio/deep-urban.mp3',              art: 'assets/audio/covers/deep-urban.webp' },
];
