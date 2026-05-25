/**
 * db/connection.js
 *
 * Initialises the SQLite database using knex + sqlite3.
 * On first run it creates the `plants` table if it does not exist.
 *
 * Exports a configured knex instance used throughout the app.
 * All queries are async/await compatible.
 */

'use strict';

const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

const knex = require('knex');

const dbPath = path.resolve(
  __dirname,
  '../..',
  process.env.DB_PATH || './database.sqlite'
);

const db = knex({
  client: 'sqlite3',
  connection: { filename: dbPath },
  useNullAsDefault: true,
  // Prevent knex from opening multiple connections (sqlite3 limitation)
  pool: { min: 1, max: 1 },
});

/**
 * Creates the `plants` table if it doesn't exist.
 * Called once at server startup.
 */
async function initDb() {
  const exists = await db.schema.hasTable('plants');
  if (!exists) {
    await db.schema.createTable('plants', (table) => {
      table.string('id').primary();                    // UUID
      table.string('name').notNullable();              // Required
      table.integer('wateringIntervalDays').notNullable(); // Days between watering
      table.text('careInstructions').defaultTo('');    // Optional notes
      table.text('image').defaultTo('');               // URL or Base64
      table.string('startDate').notNullable();         // ISO date YYYY-MM-DD
      table.string('lastWateredDate').notNullable();   // ISO date YYYY-MM-DD
      table.timestamp('createdAt').defaultTo(db.fn.now());
      table.timestamp('updatedAt').defaultTo(db.fn.now());
    });
    console.log('[DB] Created `plants` table.');
  }
  console.log(`[DB] Connected to SQLite database at: ${dbPath}`);
}

module.exports = { db, initDb };
