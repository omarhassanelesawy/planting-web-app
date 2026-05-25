/**
 * routes/plants.js
 *
 * REST API endpoints for the `plants` resource.
 * Uses @libsql/client directly (parameterised SQL).
 *
 * Endpoints:
 *   GET    /api/plants           – list all plants (+ computed fields)
 *   GET    /api/plants/:id       – get one plant
 *   POST   /api/plants           – create a new plant
 *   PUT    /api/plants/:id       – update editable fields
 *   PUT    /api/plants/:id/water – mark as watered (sets lastWateredDate = today)
 *   DELETE /api/plants/:id       – delete a plant
 *
 * Computed fields returned on every plant object:
 *   nextWateringDate – ISO date string (lastWateredDate + wateringIntervalDays)
 *   isOverdue        – boolean (nextWateringDate <= today)
 */

'use strict';

const express  = require('express');
const { v4: uuidv4 } = require('uuid');
const { db }   = require('../db/connection');

const router = express.Router();

// ── Helpers ──────────────────────────────────────────────────────────────────

function todayISO() {
  const d = new Date();
  return [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, '0'),
    String(d.getDate()).padStart(2, '0'),
  ].join('-');
}

function addDays(isoDate, days) {
  const d = new Date(isoDate);
  d.setDate(d.getDate() + Number(days));
  return [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, '0'),
    String(d.getDate()).padStart(2, '0'),
  ].join('-');
}

/** Adds computed nextWateringDate and isOverdue to a raw DB row. */
function enrichPlant(row) {
  const nextWateringDate = addDays(row.lastWateredDate, row.wateringIntervalDays);
  return {
    ...row,
    wateringIntervalDays: Number(row.wateringIntervalDays), // ensure number, not string
    nextWateringDate,
    isOverdue: nextWateringDate <= todayISO(),
  };
}

/**
 * libsql returns rows as objects when using named columns.
 * This helper converts a ResultSet to a plain array of objects.
 */
function toRows(result) {
  return result.rows;
}

function validatePlantPayload({ name, wateringIntervalDays }) {
  const errors = [];
  if (!name || typeof name !== 'string' || name.trim() === '') {
    errors.push('`name` is required and must be a non-empty string.');
  }
  const interval = Number(wateringIntervalDays);
  if (!wateringIntervalDays || !Number.isInteger(interval) || interval < 1) {
    errors.push('`wateringIntervalDays` is required and must be a positive integer.');
  }
  return errors;
}

// ── GET /api/plants ──────────────────────────────────────────────────────────
router.get('/', async (_req, res, next) => {
  try {
    const result = await db.execute(
      'SELECT * FROM plants ORDER BY createdAt DESC'
    );
    res.json(toRows(result).map(enrichPlant));
  } catch (err) {
    next(err);
  }
});

// ── GET /api/plants/:id ──────────────────────────────────────────────────────
router.get('/:id', async (req, res, next) => {
  try {
    const result = await db.execute(
      'SELECT * FROM plants WHERE id = ?',
      [req.params.id]
    );
    const plant = toRows(result)[0];
    if (!plant) return res.status(404).json({ error: 'Plant not found.' });
    res.json(enrichPlant(plant));
  } catch (err) {
    next(err);
  }
});

// ── POST /api/plants ─────────────────────────────────────────────────────────
router.post('/', async (req, res, next) => {
  try {
    const {
      name,
      wateringIntervalDays,
      careInstructions = '',
      image            = '',
      startDate,
    } = req.body;

    const errors = validatePlantPayload({ name, wateringIntervalDays });
    if (errors.length) return res.status(400).json({ errors });

    const today               = todayISO();
    const resolvedStartDate   = startDate || today;
    const now                 = new Date().toISOString();

    const newPlant = {
      id:                  uuidv4(),
      name:                name.trim(),
      wateringIntervalDays: Number(wateringIntervalDays),
      careInstructions:    careInstructions || '',
      image:               image || '',
      startDate:           resolvedStartDate,
      lastWateredDate:     resolvedStartDate,
      createdAt:           now,
      updatedAt:           now,
    };

    await db.execute(
      `INSERT INTO plants
         (id, name, wateringIntervalDays, careInstructions, image, startDate, lastWateredDate, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        newPlant.id,
        newPlant.name,
        newPlant.wateringIntervalDays,
        newPlant.careInstructions,
        newPlant.image,
        newPlant.startDate,
        newPlant.lastWateredDate,
        newPlant.createdAt,
        newPlant.updatedAt,
      ]
    );

    res.status(201).json(enrichPlant(newPlant));
  } catch (err) {
    next(err);
  }
});

// ── PUT /api/plants/:id ──────────────────────────────────────────────────────
router.put('/:id', async (req, res, next) => {
  try {
    const existing = toRows(
      await db.execute('SELECT * FROM plants WHERE id = ?', [req.params.id])
    )[0];
    if (!existing) return res.status(404).json({ error: 'Plant not found.' });

    const {
      name,
      wateringIntervalDays,
      careInstructions,
      image,
      startDate,
      lastWateredDate,
    } = req.body;

    if (name !== undefined && (typeof name !== 'string' || name.trim() === '')) {
      return res.status(400).json({ errors: ['`name` must be a non-empty string.'] });
    }
    if (wateringIntervalDays !== undefined) {
      const interval = Number(wateringIntervalDays);
      if (!Number.isInteger(interval) || interval < 1) {
        return res.status(400).json({ errors: ['`wateringIntervalDays` must be a positive integer.'] });
      }
    }

    // Build dynamic SET clause for only the fields provided
    const setClauses = [];
    const values     = [];

    if (name               !== undefined) { setClauses.push('name = ?');                values.push(name.trim()); }
    if (wateringIntervalDays !== undefined) { setClauses.push('wateringIntervalDays = ?'); values.push(Number(wateringIntervalDays)); }
    if (careInstructions   !== undefined) { setClauses.push('careInstructions = ?');    values.push(careInstructions); }
    if (image              !== undefined) { setClauses.push('image = ?');               values.push(image); }
    if (startDate          !== undefined) { setClauses.push('startDate = ?');           values.push(startDate); }
    if (lastWateredDate    !== undefined) { setClauses.push('lastWateredDate = ?');     values.push(lastWateredDate); }

    setClauses.push('updatedAt = ?');
    values.push(new Date().toISOString());
    values.push(req.params.id); // for WHERE clause

    await db.execute(
      `UPDATE plants SET ${setClauses.join(', ')} WHERE id = ?`,
      values
    );

    const updated = toRows(
      await db.execute('SELECT * FROM plants WHERE id = ?', [req.params.id])
    )[0];
    res.json(enrichPlant(updated));
  } catch (err) {
    next(err);
  }
});

// ── PUT /api/plants/:id/water ────────────────────────────────────────────────
router.put('/:id/water', async (req, res, next) => {
  try {
    const existing = toRows(
      await db.execute('SELECT * FROM plants WHERE id = ?', [req.params.id])
    )[0];
    if (!existing) return res.status(404).json({ error: 'Plant not found.' });

    await db.execute(
      'UPDATE plants SET lastWateredDate = ?, updatedAt = ? WHERE id = ?',
      [todayISO(), new Date().toISOString(), req.params.id]
    );

    const updated = toRows(
      await db.execute('SELECT * FROM plants WHERE id = ?', [req.params.id])
    )[0];
    res.json(enrichPlant(updated));
  } catch (err) {
    next(err);
  }
});

// ── DELETE /api/plants/:id ───────────────────────────────────────────────────
router.delete('/:id', async (req, res, next) => {
  try {
    const existing = toRows(
      await db.execute('SELECT * FROM plants WHERE id = ?', [req.params.id])
    )[0];
    if (!existing) return res.status(404).json({ error: 'Plant not found.' });

    await db.execute('DELETE FROM plants WHERE id = ?', [req.params.id]);
    res.json({ message: 'Plant deleted successfully.', id: req.params.id });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
