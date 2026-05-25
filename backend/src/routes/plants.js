/**
 * routes/plants.js
 *
 * REST API endpoints for the `plants` resource.
 *
 * Endpoints:
 *   GET    /api/plants           – list all plants (+ computed fields)
 *   GET    /api/plants/:id       – get one plant
 *   POST   /api/plants           – create a new plant
 *   PUT    /api/plants/:id       – update a plant's editable fields
 *   PUT    /api/plants/:id/water – mark as watered (sets lastWateredDate = today)
 *   DELETE /api/plants/:id       – delete a plant
 *
 * Computed fields returned on every plant object:
 *   nextWateringDate – ISO date string (lastWateredDate + wateringIntervalDays)
 *   isOverdue        – boolean (nextWateringDate <= today)
 */

'use strict';

const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { db } = require('../db/connection');

const router = express.Router();

// ── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Returns today's date as an ISO string (YYYY-MM-DD) in local time.
 */
function todayISO() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm   = String(d.getMonth() + 1).padStart(2, '0');
  const dd   = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

/**
 * Adds `wateringIntervalDays` days to an ISO date string.
 * @param {string} isoDate – e.g. "2025-05-01"
 * @param {number} days
 * @returns {string} – e.g. "2025-05-08"
 */
function addDays(isoDate, days) {
  const d = new Date(isoDate);
  d.setDate(d.getDate() + days);
  const yyyy = d.getFullYear();
  const mm   = String(d.getMonth() + 1).padStart(2, '0');
  const dd   = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

/**
 * Enriches a raw DB row with computed fields.
 */
function enrichPlant(plant) {
  const nextWateringDate = addDays(plant.lastWateredDate, plant.wateringIntervalDays);
  const isOverdue        = nextWateringDate <= todayISO();
  return { ...plant, nextWateringDate, isOverdue };
}

/**
 * Validates required fields for plant creation.
 * Returns an array of error messages (empty = valid).
 */
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
    const plants = await db('plants').select('*').orderBy('createdAt', 'desc');
    res.json(plants.map(enrichPlant));
  } catch (err) {
    next(err);
  }
});

// ── GET /api/plants/:id ──────────────────────────────────────────────────────
router.get('/:id', async (req, res, next) => {
  try {
    const plant = await db('plants').where({ id: req.params.id }).first();
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

    // Validation
    const errors = validatePlantPayload({ name, wateringIntervalDays });
    if (errors.length) return res.status(400).json({ errors });

    const today      = todayISO();
    const resolvedStartDate = startDate || today;

    const newPlant = {
      id:                  uuidv4(),
      name:                name.trim(),
      wateringIntervalDays: Number(wateringIntervalDays),
      careInstructions:    careInstructions || '',
      image:               image || '',
      startDate:           resolvedStartDate,
      lastWateredDate:     resolvedStartDate, // default: start watering clock from startDate
      createdAt:           new Date().toISOString(),
      updatedAt:           new Date().toISOString(),
    };

    await db('plants').insert(newPlant);
    res.status(201).json(enrichPlant(newPlant));
  } catch (err) {
    next(err);
  }
});

// ── PUT /api/plants/:id ──────────────────────────────────────────────────────
// Update editable fields: name, wateringIntervalDays, careInstructions, image
router.put('/:id', async (req, res, next) => {
  try {
    const existing = await db('plants').where({ id: req.params.id }).first();
    if (!existing) return res.status(404).json({ error: 'Plant not found.' });

    const {
      name,
      wateringIntervalDays,
      careInstructions,
      image,
      startDate,
      lastWateredDate,
    } = req.body;

    // Only validate fields that are being updated
    if (name !== undefined && (typeof name !== 'string' || name.trim() === '')) {
      return res.status(400).json({ errors: ['`name` must be a non-empty string.'] });
    }
    if (wateringIntervalDays !== undefined) {
      const interval = Number(wateringIntervalDays);
      if (!Number.isInteger(interval) || interval < 1) {
        return res.status(400).json({ errors: ['`wateringIntervalDays` must be a positive integer.'] });
      }
    }

    const updates = { updatedAt: new Date().toISOString() };
    if (name               !== undefined) updates.name                = name.trim();
    if (wateringIntervalDays !== undefined) updates.wateringIntervalDays = Number(wateringIntervalDays);
    if (careInstructions   !== undefined) updates.careInstructions    = careInstructions;
    if (image              !== undefined) updates.image               = image;
    if (startDate          !== undefined) updates.startDate           = startDate;
    if (lastWateredDate    !== undefined) updates.lastWateredDate     = lastWateredDate;

    await db('plants').where({ id: req.params.id }).update(updates);

    const updated = await db('plants').where({ id: req.params.id }).first();
    res.json(enrichPlant(updated));
  } catch (err) {
    next(err);
  }
});

// ── PUT /api/plants/:id/water ────────────────────────────────────────────────
// Dedicated "Mark as Watered" endpoint — sets lastWateredDate to today
router.put('/:id/water', async (req, res, next) => {
  try {
    const existing = await db('plants').where({ id: req.params.id }).first();
    if (!existing) return res.status(404).json({ error: 'Plant not found.' });

    const today = todayISO();
    await db('plants').where({ id: req.params.id }).update({
      lastWateredDate: today,
      updatedAt:       new Date().toISOString(),
    });

    const updated = await db('plants').where({ id: req.params.id }).first();
    res.json(enrichPlant(updated));
  } catch (err) {
    next(err);
  }
});

// ── DELETE /api/plants/:id ───────────────────────────────────────────────────
router.delete('/:id', async (req, res, next) => {
  try {
    const existing = await db('plants').where({ id: req.params.id }).first();
    if (!existing) return res.status(404).json({ error: 'Plant not found.' });

    await db('plants').where({ id: req.params.id }).delete();
    res.json({ message: 'Plant deleted successfully.', id: req.params.id });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
