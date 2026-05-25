/**
 * db/connection.js
 *
 * Database connection using @libsql/client.
 *
 * Supports two modes (auto-selected based on env vars):
 *
 *   PRODUCTION (Turso):
 *     Set TURSO_URL and TURSO_AUTH_TOKEN in your environment.
 *     e.g. TURSO_URL=libsql://greenthumb-yourname.turso.io
 *          TURSO_AUTH_TOKEN=eyJh...
 *
 *   DEVELOPMENT (local SQLite file):
 *     Leave TURSO_URL unset — the client opens a local file instead.
 *     DB_PATH controls the file location (default: ./database.sqlite)
 *
 * The exported `db` object exposes:
 *   db.execute(sql, args?)  → { rows: [...] }   (single statement)
 *   db.batch(statements)    → array of results   (multiple statements)
 *
 * initDb() creates the `plants` table if it doesn't exist.
 */

'use strict';

const path     = require('path');
const { createClient } = require('@libsql/client');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

// ── Connection factory ────────────────────────────────────────────────────────

function buildUrl() {
  // Production: Turso remote database
  if (process.env.TURSO_URL) {
    return process.env.TURSO_URL;
  }

  // Development: local SQLite file
  const rawPath = process.env.DB_PATH || './database.sqlite';
  const absPath = path.isAbsolute(rawPath)
    ? rawPath
    : path.resolve(__dirname, '../..', rawPath);

  // libsql expects "file:/absolute/path"
  return `file:${absPath}`;
}

const clientConfig = {
  url: buildUrl(),
};

// Only add authToken for remote Turso connections
if (process.env.TURSO_AUTH_TOKEN) {
  clientConfig.authToken = process.env.TURSO_AUTH_TOKEN;
}

const db = createClient(clientConfig);

// ── Schema migration ──────────────────────────────────────────────────────────

async function initDb() {
  await db.execute(`
    CREATE TABLE IF NOT EXISTS plants (
      id                   TEXT PRIMARY KEY,
      name                 TEXT NOT NULL,
      wateringIntervalDays INTEGER NOT NULL,
      careInstructions     TEXT    DEFAULT '',
      image                TEXT    DEFAULT '',
      startDate            TEXT    NOT NULL,
      lastWateredDate      TEXT    NOT NULL,
      createdAt            TEXT    NOT NULL,
      updatedAt            TEXT    NOT NULL
    )
  `);

  const mode = process.env.TURSO_URL ? 'Turso (remote)' : 'SQLite (local)';
  console.log(`[DB] Connected — mode: ${mode}`);
  console.log(`[DB] URL: ${clientConfig.url}`);
}

module.exports = { db, initDb };
