// Static dev server: `node serve.cjs` → http://localhost:5190
// Supports Range requests so audio seeking works.
const http = require('http'), fs = require('fs'), path = require('path');
const root = __dirname;
const TYPES = {
  '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.json': 'application/json',
  '.webp': 'image/webp', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml',
  '.mp3': 'audio/mpeg', '.m4a': 'audio/mp4', '.aac': 'audio/aac', '.wav': 'audio/wav', '.ogg': 'audio/ogg', '.flac': 'audio/flac',
};

http.createServer((req, res) => {
  const url = decodeURIComponent(req.url.split('?')[0]);
  const file = path.join(root, url === '/' ? 'index.html' : url);
  if (!file.startsWith(root + path.sep)) { res.writeHead(403); return res.end(); }
  fs.stat(file, (err, st) => {
    if (err || !st.isFile()) { res.writeHead(404); return res.end(); }
    const headers = { 'Content-Type': TYPES[path.extname(file).toLowerCase()] || 'application/octet-stream', 'Accept-Ranges': 'bytes', 'Cache-Control': 'no-cache' };
    const m = /bytes=(\d*)-(\d*)/.exec(req.headers.range || '');
    if (m) {
      const start = m[1] ? +m[1] : st.size - +m[2];
      const end = m[1] && m[2] ? Math.min(+m[2], st.size - 1) : st.size - 1;
      res.writeHead(206, { ...headers, 'Content-Range': `bytes ${start}-${end}/${st.size}`, 'Content-Length': end - start + 1 });
      return fs.createReadStream(file, { start, end }).pipe(res);
    }
    res.writeHead(200, { ...headers, 'Content-Length': st.size });
    fs.createReadStream(file).pipe(res);
  });
}).listen(process.env.PORT || 5190, () => console.log(`http://localhost:${process.env.PORT || 5190}`));
