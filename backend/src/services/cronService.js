/**
 * services/cronService.js
 *
 * Schedules a daily background task at 8:00 AM (server local time).
 *
 * What it does:
 *  1. Queries the DB for all plants where nextWateringDate <= today
 *     (i.e., lastWateredDate + wateringIntervalDays <= today)
 *  2. If any are found, sends one aggregated email via emailService
 *  3. Logs results to console regardless
 *
 * The cron expression "0 8 * * *" means: minute=0, hour=8, every day.
 */

'use strict';

const cron               = require('node-cron');
const { db }             = require('../db/connection');
const { sendDailyReport } = require('./emailService');

// ── Helpers (mirrors plants.js — kept local to avoid circular deps) ───────────

function todayISO() {
  const d    = new Date();
  const yyyy = d.getFullYear();
  const mm   = String(d.getMonth() + 1).padStart(2, '0');
  const dd   = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function addDays(isoDate, days) {
  const d = new Date(isoDate);
  d.setDate(d.getDate() + days);
  const yyyy = d.getFullYear();
  const mm   = String(d.getMonth() + 1).padStart(2, '0');
  const dd   = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

// ── Core task ─────────────────────────────────────────────────────────────────

/**
 * Checks the DB for plants due/overdue today and sends the report.
 * Can also be called manually (e.g., for testing via a debug endpoint).
 */
async function runDailyCheck() {
  const today = todayISO();
  console.log(`[Cron] Running daily watering check for ${today}...`);

  try {
    const allPlants = await db('plants').select('*');

    // Filter: nextWateringDate (lastWateredDate + interval) <= today
    const duePlants = allPlants
      .map((p) => {
        const nextWateringDate = addDays(p.lastWateredDate, p.wateringIntervalDays);
        const isOverdue        = nextWateringDate <= today;
        return { ...p, nextWateringDate, isOverdue };
      })
      .filter((p) => p.isOverdue);

    if (duePlants.length === 0) {
      console.log('[Cron] No plants need watering today. Sending all-clear report.');
    } else {
      console.log(`[Cron] ${duePlants.length} plant(s) need watering: ${duePlants.map((p) => p.name).join(', ')}`);
    }

    // Always send the report — pass all plants and the due list so the email
    // can show a full status summary even when everything is on schedule.
    await sendDailyReport(duePlants, allPlants);
  } catch (err) {
    console.error('[Cron] Error during daily check:', err);
  }
}

// ── Scheduler ─────────────────────────────────────────────────────────────────

/**
 * Registers the cron job. Call once at server startup.
 * Schedule: every day at 8:00 AM server local time.
 */
function startCronJob() {
  // "0 8 * * *" → at 08:00 every day (server OS timezone — no timezone override)
  cron.schedule('0 8 * * *', runDailyCheck);
  console.log('[Cron] Daily watering check scheduled at 8:00 AM (server local time).');
}

module.exports = { startCronJob, runDailyCheck };
