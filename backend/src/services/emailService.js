/**
 * services/emailService.js
 *
 * Sends the daily watering report email using Nodemailer.
 * Always sends — either a "plants need watering" report or an "all clear" summary.
 *
 * Configuration is read from .env:
 *   SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, RECIPIENT_EMAIL
 */

'use strict';

const nodemailer = require('nodemailer');
const path       = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

// ── Transporter ──────────────────────────────────────────────────────────────

function createTransporter() {
  return nodemailer.createTransport({
    host:   process.env.SMTP_HOST  || 'smtp.gmail.com',
    port:   Number(process.env.SMTP_PORT) || 587,
    secure: Number(process.env.SMTP_PORT) === 465,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
}

// ── HTML Template ─────────────────────────────────────────────────────────────

/**
 * @param {Array} duePlants   – Plants due or overdue today
 * @param {Array} allPlants   – Every plant in the DB (for the full status table)
 * @param {string} today      – ISO date YYYY-MM-DD
 */
function buildEmailHtml(duePlants, allPlants, today) {
  const allClear = duePlants.length === 0;

  // ── Banner ────────────────────────────────────────────────────────────────
  const banner = allClear
    ? `<div style="background:#dcfce7;border-left:4px solid #16a34a;padding:16px 40px;font-size:15px;color:#14532d;">
         <strong>✅ All clear — no plants need watering today!</strong>
         Your garden is right on schedule. 🎉
       </div>`
    : `<div style="background:#fef9c3;border-left:4px solid #eab308;padding:16px 40px;font-size:15px;color:#713f12;">
         <strong>💧 ${duePlants.length} plant${duePlants.length !== 1 ? 's' : ''} need${duePlants.length === 1 ? 's' : ''} watering today.</strong>
         Time to show your green friends some love!
       </div>`;

  // ── Full status table (all plants) ───────────────────────────────────────
  const tableRows = allPlants.length === 0
    ? `<tr><td colspan="5" style="padding:24px;text-align:center;color:#9ca3af;">No plants added yet.</td></tr>`
    : allPlants.map((p) => {
        let statusHtml;
        if (p.isOverdue && p.nextWateringDate < today) {
          statusHtml = `<span style="color:#dc2626;font-weight:bold;">⚠️ Overdue (since ${p.nextWateringDate})</span>`;
        } else if (p.isOverdue) {
          statusHtml = `<span style="color:#d97706;font-weight:bold;">💧 Due Today</span>`;
        } else {
          statusHtml = `<span style="color:#16a34a;">✅ Next: ${p.nextWateringDate}</span>`;
        }

        return `
          <tr style="border-bottom:1px solid #e5e7eb;">
            <td style="padding:12px 16px;">
              ${p.image
                ? `<img src="${p.image}" alt="${p.name}" style="width:44px;height:44px;object-fit:cover;border-radius:8px;" />`
                : `<div style="width:44px;height:44px;background:#bbf7d0;border-radius:8px;text-align:center;line-height:44px;font-size:22px;">🌱</div>`
              }
            </td>
            <td style="padding:12px 16px;font-weight:600;color:#111827;">${p.name}</td>
            <td style="padding:12px 16px;color:#6b7280;">Every ${p.wateringIntervalDays} day${p.wateringIntervalDays !== 1 ? 's' : ''}</td>
            <td style="padding:12px 16px;">${statusHtml}</td>
            <td style="padding:12px 16px;color:#6b7280;font-size:13px;">${p.careInstructions || '—'}</td>
          </tr>
        `;
      }).join('');

  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <title>GreenThumb Daily Report</title>
    </head>
    <body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#f0fdf4;">
      <div style="max-width:680px;margin:32px auto;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 6px -1px rgba(0,0,0,.1);">

        <!-- Header -->
        <div style="background:linear-gradient(135deg,#16a34a,#4ade80);padding:32px 40px;text-align:center;">
          <h1 style="margin:0;color:#ffffff;font-size:28px;font-weight:700;">🌿 GreenThumb Reminder</h1>
          <p style="margin:8px 0 0;color:#dcfce7;font-size:16px;">Daily Report — ${today}</p>
        </div>

        ${banner}

        <!-- Full Plant Status Table -->
        <div style="padding:24px 40px;">
          <h2 style="margin:0 0 16px;font-size:16px;font-weight:600;color:#374151;">
            All Plants (${allPlants.length})
          </h2>
          <table style="width:100%;border-collapse:collapse;">
            <thead>
              <tr style="background:#f9fafb;">
                <th style="padding:10px 16px;text-align:left;font-size:11px;text-transform:uppercase;color:#6b7280;letter-spacing:.05em;"></th>
                <th style="padding:10px 16px;text-align:left;font-size:11px;text-transform:uppercase;color:#6b7280;letter-spacing:.05em;">Plant</th>
                <th style="padding:10px 16px;text-align:left;font-size:11px;text-transform:uppercase;color:#6b7280;letter-spacing:.05em;">Interval</th>
                <th style="padding:10px 16px;text-align:left;font-size:11px;text-transform:uppercase;color:#6b7280;letter-spacing:.05em;">Status</th>
                <th style="padding:10px 16px;text-align:left;font-size:11px;text-transform:uppercase;color:#6b7280;letter-spacing:.05em;">Care Notes</th>
              </tr>
            </thead>
            <tbody>
              ${tableRows}
            </tbody>
          </table>
        </div>

        <!-- Footer -->
        <div style="background:#f9fafb;padding:24px 40px;text-align:center;border-top:1px solid #e5e7eb;">
          <p style="margin:0;color:#9ca3af;font-size:13px;">
            Sent automatically by GreenThumb Reminder every morning at 8:00 AM.<br/>
            Open the app to manage your plants.
          </p>
        </div>
      </div>
    </body>
    </html>
  `;
}

// ── Plain-text fallback ───────────────────────────────────────────────────────

function buildEmailText(duePlants, allPlants, today) {
  const allClear = duePlants.length === 0;
  const header = [
    `GreenThumb Reminder — Daily Report (${today})`,
    '='.repeat(50),
    allClear
      ? '✅ All clear — no plants need watering today!'
      : `💧 ${duePlants.length} plant(s) need watering:`,
    '',
  ];

  const dueLines = duePlants.map((p) => {
    const status = p.nextWateringDate < today ? `OVERDUE (since ${p.nextWateringDate})` : 'Due Today';
    return `  • ${p.name} — every ${p.wateringIntervalDays} day(s) — ${status}`;
  });

  const allLines = allPlants.length > 0
    ? [
        '',
        `All Plants (${allPlants.length}):`,
        ...allPlants.map((p) => {
          const status = p.isOverdue
            ? (p.nextWateringDate < today ? `OVERDUE since ${p.nextWateringDate}` : 'Due Today')
            : `Next: ${p.nextWateringDate}`;
          return `  • ${p.name} — ${status}`;
        }),
      ]
    : ['', '(No plants added yet)'];

  return [
    ...header,
    ...dueLines,
    ...allLines,
    '',
    'Open the GreenThumb app to manage your plants.',
  ].join('\n');
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Sends the daily watering report email.
 * Always sends — either a "needs watering" report or an "all clear" summary.
 *
 * @param {Array} duePlants  – Plants due or overdue today (may be empty)
 * @param {Array} allPlants  – All plants in the database (for the full status table)
 * @returns {Promise<void>}
 */
async function sendDailyReport(duePlants, allPlants = []) {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.warn('[Email] SMTP credentials not configured. Skipping email send.');
    return;
  }

  const recipient  = process.env.RECIPIENT_EMAIL || process.env.SMTP_USER;
  const today      = new Date().toISOString().split('T')[0];
  const allClear   = duePlants.length === 0;

  const subject = allClear
    ? `✅ GreenThumb: All clear — no watering needed today (${today})`
    : `💧 GreenThumb: ${duePlants.length} plant${duePlants.length !== 1 ? 's' : ''} need watering today (${today})`;

  const transporter = createTransporter();

  const info = await transporter.sendMail({
    from:    `"GreenThumb Reminder" <${process.env.SMTP_USER}>`,
    to:      recipient,
    subject,
    text:    buildEmailText(duePlants, allPlants, today),
    html:    buildEmailHtml(duePlants, allPlants, today),
  });

  console.log(`[Email] Daily report sent → ${recipient} (messageId: ${info.messageId})`);
}

module.exports = { sendDailyReport };
