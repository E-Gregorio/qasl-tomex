// ═══════════════════════════════════════════════════════════
// QASL·TOMEX — SERVER MODE
// Sirve el dashboard y conecta con el orchestrator via SSE
// Puerto: 9999
// Autor: Elyer Gregorio Maldonado
// ═══════════════════════════════════════════════════════════

import 'dotenv/config';
import express from 'express';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { TomexOrchestrator } from './orchestrator.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = join(__dirname, '..');

const app = express();
app.use(express.json());

// Servir el dashboard HTML
app.use(express.static(ROOT));

// Clientes SSE conectados
const sseClients = new Set();

// ── SSE ENDPOINT ──
app.get('/api/events', (req, res) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*'
  });
  res.write('data: {"type":"connected"}\n\n');
  sseClients.add(res);
  req.on('close', () => sseClients.delete(res));
});

function broadcast(type, data) {
  const msg = JSON.stringify({ type, ...data });
  for (const client of sseClients) {
    client.write(`data: ${msg}\n\n`);
  }
}

// ── SCAN ENDPOINT ──
let scanning = false;

app.post('/api/scan', async (req, res) => {
  if (scanning) {
    return res.status(409).json({ error: 'Escaneo en curso' });
  }

  const { url, user, pass, env } = req.body;
  if (!url) {
    return res.status(400).json({ error: 'URL requerida' });
  }

  scanning = true;
  res.json({ status: 'started', sessionId: `TOMEX-${Date.now()}` });

  const orchestrator = new TomexOrchestrator({
    maxFixAttempts: parseInt(process.env.TOMEX_MAX_FIX_ATTEMPTS) || 3,
    parallelAgents: true,
    autoHeal: true,
    predict: true,
    cipherEnabled: true
  });

  // Conectar eventos del orchestrator al SSE
  orchestrator.on('phase', (data) => broadcast('phase', data));
  orchestrator.on('dimension', (data) => broadcast('dimension', data));
  orchestrator.on('finding', (data) => broadcast('finding', data));
  orchestrator.on('complete', (data) => broadcast('complete', {
    score: data.score,
    summary: data.summary,
    htmlPath: data.htmlPath,
    sessionId: data.sessionId,
    duration: data.duration,
    diagnosis: data.diagnosis,
    predictions: data.predictions
  }));
  orchestrator.on('error', (data) => broadcast('error', data));

  try {
    const target = {
      url: url.startsWith('http') ? url : 'https://' + url,
      user: user || '',
      pass: pass || '',
      env: env || 'staging'
    };
    await orchestrator.activate(target);
  } catch (err) {
    broadcast('error', { message: err.message });
  } finally {
    scanning = false;
  }
});

// ── STATUS ──
app.get('/api/status', (req, res) => {
  res.json({ scanning, clients: sseClients.size });
});

// ── START ──
const PORT = process.env.TOMEX_PORT || 9999;
app.listen(PORT, () => {
  console.log(`\n⬡ QASL·TOMEX Server`);
  console.log(`📍 Dashboard: http://localhost:${PORT}/qasl-tomex-v2.html`);
  console.log(`📡 SSE: http://localhost:${PORT}/api/events`);
  console.log(`🔬 Scan API: POST http://localhost:${PORT}/api/scan\n`);
});
