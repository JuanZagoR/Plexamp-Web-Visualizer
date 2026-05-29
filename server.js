require('dotenv').config();
const express  = require('express');
const fs       = require('fs');
const path     = require('path');
const xml2js   = require('xml2js');
const helmet   = require('helmet');
const rateLimit = require('express-rate-limit');

const app      = express();
const PORT     = process.env.PORT || 3000;

const PLEX_BASE  = process.env.PLEX_BASE;
const PLEX_TOKEN = process.env.PLEX_TOKEN;
const VIEWER_TOKEN = process.env.VIEWER_TOKEN;

const PLEX_URL   = `${PLEX_BASE}/status/sessions?X-Plex-Token=${PLEX_TOKEN}`;

if (!PLEX_BASE || !PLEX_TOKEN || !VIEWER_TOKEN) {
  console.error('Faltan variables PLEX_BASE, PLEX_TOKEN o VIEWER_TOKEN en .env');
  process.exit(1);
}

// 1. Confiar en proxy para Cloudflare Tunnels
app.set('trust proxy', 1);

// 2. Seguridad en cabeceras HTTP
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:"]
    }
  }
}));

// 3. Rate Limit (300 req/minuto)
const limiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 300,
  message: 'Demasiadas peticiones desde esta IP, inténtalo más tarde.'
});
app.use(limiter);

// 4. Middleware de Autenticación (Aplicado solo a las API)
function auth(req, res, next) {
  const token = req.query.token || req.headers['x-viewer-token'];
  if (token !== VIEWER_TOKEN) {
    return res.status(401).send('Unauthorized');
  }
  next();
}

app.get('/ping', (req, res) => res.json({ ok: true }));

// 5. Inyección Dinámica del Token en el Frontend
app.get('/', (req, res) => {
  const indexPath = path.join(__dirname, 'public', 'index.html');
  fs.readFile(indexPath, 'utf8', (err, html) => {
    if (err) return res.status(500).send('Error loading frontend');
    const injectedHtml = html.replace('__INJECTED_TOKEN__', VIEWER_TOKEN);
    res.send(injectedHtml);
  });
});

// Proxy for images to hide the Plex Token (Protegido por auth)
app.get('/proxy/image', auth, async (req, res) => {
  try {
    const imgPath = req.query.path;
    if (!imgPath) return res.status(400).send('Missing path');
    
    const url = `${PLEX_BASE}${imgPath}?X-Plex-Token=${PLEX_TOKEN}`;
    const response = await fetch(url);
    if (!response.ok) return res.status(response.status).send('Plex image error');

    const contentType = response.headers.get('content-type');
    if (contentType) res.set('Content-Type', contentType);

    const arrayBuffer = await response.arrayBuffer();
    res.send(Buffer.from(arrayBuffer));
  } catch (err) {
    console.error('Error proxying image:', err.message);
    res.status(500).send('Proxy error');
  }
});

app.get('/status', auth, async (req, res) => {
  try {
    const response = await fetch(PLEX_URL);
    const xml      = await response.text();

    xml2js.parseString(xml, (err, result) => {
      if (err) return res.status(500).json({ error: 'XML parse error' });

      const tracks = result.MediaContainer.Track || [];
      if (tracks.length === 0) return res.json({ state: 'stopped' });

      const track  = tracks[0];
      const attr   = track.$  || {};
      const player = (track.Player?.[0]?.$)                    || {};
      const media  = (track.Media?.[0]?.$)                     || {};
      const stream = (track.Media?.[0]?.Part?.[0]?.Stream?.[0]?.$) || {};

      const thumb = attr.thumb || attr.parentThumb || '';
      const currentToken = req.query.token || req.headers['x-viewer-token'];
      const cover = thumb
        ? `/proxy/image?path=${encodeURIComponent(thumb)}&token=${encodeURIComponent(currentToken)}`
        : null;

      res.json({
        state:      player.state                  || 'stopped',
        cover,
        title:      attr.title                    || null,
        artist:     attr.grandparentTitle         || null,
        album:      attr.parentTitle              || null,
        year:       attr.parentYear               || null,
        duration:   parseInt(attr.duration)       || 0,
        viewOffset: parseInt(attr.viewOffset)     || 0,
        codec:      media.audioCodec || stream.codec || null,
        bitrate:    parseInt(media.bitrate)       || null,
        bitDepth:   parseInt(stream.bitDepth)     || null,
        sampleRate: parseInt(stream.samplingRate) || null,
      });
    });
  } catch (e) {
    console.error('Error al consultar Plex:', e.message);
    res.status(500).json({ error: 'Fetch failed' });
  }
});

app.use(express.static('public'));

app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});