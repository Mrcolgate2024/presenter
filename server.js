const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const QRCode = require('qrcode');
const os = require('os');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = process.env.PORT || 5555;

// State
let currentState = {
  presentation: null,
  indexh: 0,
  indexv: 0,
  totalSlides: 0,
  notes: []
};

// Get local IP for QR code
function getLocalIP() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return 'localhost';
}

// Static files
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use(express.json());

// File upload config
const storage = multer.diskStorage({
  destination: path.join(__dirname, 'uploads'),
  filename: (req, file, cb) => {
    const uniqueName = Date.now() + '-' + file.originalname;
    cb(null, uniqueName);
  }
});
const upload = multer({ storage });

// API: List presentations (.md + .deck)
app.get('/api/presentations', (req, res) => {
  const presDir = path.join(__dirname, 'presentations');
  const files = fs.readdirSync(presDir).filter(f => f.endsWith('.md') || f.endsWith('.deck'));
  res.json(files.map(f => {
    const ext = path.extname(f);
    return {
      name: f.replace(ext, ''),
      file: f,
      type: ext === '.deck' ? 'deck' : 'markdown'
    };
  }));
});

// API: Get presentation content
app.get('/api/presentations/:file', (req, res) => {
  const filePath = path.join(__dirname, 'presentations', req.params.file);
  if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'Not found' });
  const content = fs.readFileSync(filePath, 'utf-8');
  const ext = path.extname(req.params.file);
  if (ext === '.deck') {
    try {
      res.json({ content: JSON.parse(content), file: req.params.file, type: 'deck' });
    } catch (e) {
      res.status(400).json({ error: 'Invalid .deck JSON' });
    }
  } else {
    res.json({ content, file: req.params.file, type: 'markdown' });
  }
});

// API: Save .deck presentation
app.post('/api/presentations', (req, res) => {
  const { filename, deck } = req.body;
  if (!filename || !deck) return res.status(400).json({ error: 'Missing filename or deck data' });
  const safeName = filename.replace(/[^a-zA-Z0-9_-]/g, '') + '.deck';
  const filePath = path.join(__dirname, 'presentations', safeName);
  fs.writeFileSync(filePath, JSON.stringify(deck, null, 2), 'utf-8');
  res.json({ success: true, file: safeName });
});

// API: Delete presentation
app.delete('/api/presentations/:file', (req, res) => {
  const filePath = path.join(__dirname, 'presentations', req.params.file);
  if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'Not found' });
  fs.unlinkSync(filePath);
  res.json({ success: true });
});

// API: Upload file (pptx/pdf)
app.post('/api/upload', upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  const ext = path.extname(req.file.originalname).toLowerCase();
  res.json({
    filename: req.file.filename,
    originalname: req.file.originalname,
    type: ext === '.pdf' ? 'pdf' : 'pptx',
    path: `/uploads/${req.file.filename}`
  });
});

// API: QR code
app.get('/api/qrcode/:type', async (req, res) => {
  const ip = getLocalIP();
  const routes = {
    remote: `http://${ip}:${PORT}/remote.html`,
    audience: `http://${ip}:${PORT}/audience.html`
  };
  const url = routes[req.params.type] || routes.remote;
  try {
    const qr = await QRCode.toDataURL(url, { width: 256, margin: 1 });
    res.json({ qr, url });
  } catch (err) {
    res.status(500).json({ error: 'QR generation failed' });
  }
});

// API: Server info
app.get('/api/info', (req, res) => {
  const ip = getLocalIP();
  res.json({
    ip,
    port: PORT,
    remoteUrl: `http://${ip}:${PORT}/remote.html`,
    audienceUrl: `http://${ip}:${PORT}/audience.html`
  });
});

// API: Current state
app.get('/api/state', (req, res) => {
  res.json(currentState);
});

// Socket.IO
io.on('connection', (socket) => {
  console.log(`Client connected: ${socket.id}`);

  // Send current state to new client
  socket.emit('state-update', currentState);

  // Presenter navigates
  socket.on('slide-changed', (data) => {
    currentState.indexh = data.indexh;
    currentState.indexv = data.indexv;
    if (data.totalSlides) currentState.totalSlides = data.totalSlides;
    if (data.notes !== undefined) currentState.notes = data.notes;
    socket.broadcast.emit('slide-changed', currentState);
  });

  // Remote control commands
  socket.on('navigate', (direction) => {
    io.emit('navigate', direction); // next, prev, up, down
  });

  socket.on('navigate-to', (data) => {
    currentState.indexh = data.indexh;
    currentState.indexv = data.indexv || 0;
    io.emit('navigate-to', data);
  });

  // Presentation loaded
  socket.on('presentation-loaded', (data) => {
    currentState.presentation = data.presentation;
    currentState.totalSlides = data.totalSlides || 0;
    currentState.notes = data.notes || [];
    currentState.indexh = 0;
    currentState.indexv = 0;
    io.emit('presentation-loaded', data);
    io.emit('state-update', currentState);
  });

  socket.on('disconnect', () => {
    console.log(`Client disconnected: ${socket.id}`);
  });
});

server.listen(PORT, '0.0.0.0', () => {
  const ip = getLocalIP();
  console.log(`\n  Presenter running!\n`);
  console.log(`  Slides:     http://localhost:${PORT}/slides.html`);
  console.log(`  Remote:     http://${ip}:${PORT}/remote.html`);
  console.log(`  Audience:   http://${ip}:${PORT}/audience.html`);
  console.log(`  Presenter:  http://localhost:${PORT}/presenter.html`);
  console.log(`  Dashboard:  http://localhost:${PORT}\n`);
});
