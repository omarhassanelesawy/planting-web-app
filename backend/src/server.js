/**
 * server.js
 *
 * Express application entry point for GreenThumb Reminder.
 * - Initialises the SQLite DB (creates table on first run)
 * - Mounts the /api/plants router
 * - Starts the daily cron job for email notifications
 * - Serves on PORT from .env (default 5001)
 */

'use strict';

const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const express = require('express');
const cors    = require('cors');

const { initDb }       = require('./db/connection');
const plantsRouter     = require('./routes/plants');
const { startCronJob, runDailyCheck } = require('./services/cronService');

const app  = express();
const PORT = process.env.PORT || 5001;

// ── CORS ────────────────────────────────────────────────────────────────────
// FRONTEND_URL in production = your Vercel URL, e.g. https://greenthumb.vercel.app
// In development it defaults to http://localhost:3000
const allowedOrigins = [
  'http://localhost:3000',
  ...(process.env.FRONTEND_URL ? [process.env.FRONTEND_URL] : []),
];

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (curl, Postman, server-to-server)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    callback(new Error(`CORS: origin "${origin}" not allowed`));
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type'],
}));

// Increase JSON payload limit to support Base64 image strings (~5 MB)
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true, limit: '5mb' }));

// ── Routes ──────────────────────────────────────────────────────────────────
app.use('/api/plants', plantsRouter);

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Debug: manually trigger the daily cron check (dev only)
app.post('/api/debug/trigger-daily-check', async (_req, res, next) => {
  try {
    await runDailyCheck();
    res.json({ message: 'Daily check triggered. Check server logs.' });
  } catch (err) {
    next(err);
  }
});

// 404 catch-all
app.use((_req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Global error handler
app.use((err, _req, res, _next) => {
  console.error('[ERROR]', err);
  res.status(500).json({ error: err.message || 'Internal server error' });
});

// ── Bootstrap ───────────────────────────────────────────────────────────────
async function bootstrap() {
  try {
    await initDb();
    app.listen(PORT, () => {
      console.log(`[Server] GreenThumb API running on http://localhost:${PORT}`);
      startCronJob();
    });
  } catch (err) {
    console.error('[Server] Failed to start:', err);
    process.exit(1);
  }
}

bootstrap();

module.exports = app;
