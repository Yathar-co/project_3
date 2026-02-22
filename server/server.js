import express from 'express';
import cors from 'cors';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync } from 'fs';
import { scanRouter } from './routes/scan.js';
import { documentRouter } from './routes/document.js';
import { checkOllamaHealth } from './services/ollama.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;
const isProd = process.env.NODE_ENV === 'production';

// Middleware
app.use(cors({
  origin: ['http://localhost:5173', 'http://127.0.0.1:5173'],
  methods: ['GET', 'POST'],
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));

// API routes
app.use('/api/scan', scanRouter);
app.use('/api/docs', documentRouter);

// Health check
app.get('/api/health', async (req, res) => {
  const ollamaStatus = await checkOllamaHealth();
  res.json({
    status: 'ok',
    ollama: ollamaStatus ? 'connected' : 'disconnected',
    timestamp: new Date().toISOString()
  });
});

// Serve built frontend in production
const clientDist = join(__dirname, '..', 'client', 'dist');
if (existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.get('*', (req, res) => {
    if (!req.path.startsWith('/api')) {
      res.sendFile(join(clientDist, 'index.html'));
    }
  });
  console.log(`📂 Serving frontend from ${clientDist}`);
}

// Error handler
app.use((err, req, res, next) => {
  console.error('Server Error:', err.message);
  res.status(500).json({ error: 'Internal server error', message: err.message });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`\n◆ SHIELD API running on http://localhost:${PORT}`);
  console.log(`  Health:  http://localhost:${PORT}/api/health`);
  console.log(`  Scan:    POST http://localhost:${PORT}/api/scan`);
  console.log(`  Docs:    POST http://localhost:${PORT}/api/docs/generate`);
  if (existsSync(clientDist)) {
    console.log(`  UI:      http://localhost:${PORT}/`);
  }
  console.log('');
});
