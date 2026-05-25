/**
 * services/emailService.js
 *
 * Sends the daily watering report email using Nodemailer.
 *
 * Configuration is read from .env:
 *   SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, RECIPIENT_EMAIL
 *
 * The email is an HTML message listing every plant that needs
 * watering today (isOverdue = true).
 */

'use strict';

const nodemailer = require('nodemailer');
const path       = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

// ── Transporter ──────────────────────────────────────────────────────────────

/**
 * Creates a Nodemailer transporter from environment variables.
 * Works with Gmail App Passwords, Outlook, or any generic SMTP provider.
 */
function createTransporter() {
  return nodemailer.createTransport({
    host:   process.env.SMTP_HOST  || 'smtp.gmail.com',
    port:   Number(process.env.SMTP_PORT) || 587,
    secure: Number(process.env.SMTP_PORT) === 465, // true for port 465 (SSL)
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
}

// ── HTML Template ─────────────────────────────────────────────────────────────

/**
 * Builds the HTML body for the daily report email.
 * @param {Array} plants – Array of enriched plant objects that are due/overdue.
 * @param {string} today – ISO date string for display.
 * @returns {string} HTML string.
 */
function buildEmailHtml(plants, today) {
  const rows = plants.map((p) => {
    const overdueLabel = p.isOverdue && p.nextWateringDate < today
      ? `<span style="color:#dc2626;font-weight:bold;">OVERDUE (was due ${p.nextWateringDate})</span>`
      : `<span style="color:#16a34a;font-weight:bold;">Due Today</span>`;

    return `
      <tr style="border-bottom:1px solid #e5e7eb;">
        <td style="padding:12px 16px;">
          ${p.image
            ? `<img src="${p.image}" alt="${p.name}" style="width:48px;height:48px;object-fit:cover;border-radius:8px;" />`
            : `<div style="width:48px;height:48px;background:#bbf7d0;border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:24px;">🌱</div>`
          }
        </td>
        <td style="padding:12px 16px;font-weight:600;color:#111827;">${p.name}</td>
        <td style="padding:12px 16px;color:#6b7280;">Every ${p.wateringIntervalDays} day${p.wateringIntervalDays !== 1 ? 's' : ''}</td>
        <td style="padding:12px 16px;">${overdueLabel}</td>
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
          <p style="margin:8px 0 0;color:#dcfce7;font-size:16px;">Daily Watering Report — ${today}</p>
        </div>

        <!-- Summary Banner -->
        <div style="background:#fef9c3;border-left:4px solid #eab308;padding:16px 40px;font-size:15px;color:#713f12;">
          <strong>💧 ${plants.length} plant${plants.length !== 1 ? 's' : ''} need${plants.length === 1 ? 's' : ''} watering today.</strong>
          Time to show your green friends some love!
        </div>

        <!-- Table -->
        <div style="padding:24px 40px;">
          <table style="width:100%;border-collapse:collapse;">
            <thead>
              <tr style="background:#f9fafb;">
                <th style="padding:10px 16px;text-align:left;font-size:12px;text-transform:uppercase;color:#6b7280;letter-spacing:.05em;"></th>
                <th style="padding:10px 16px;text-align:left;font-size:12px;text-transform:uppercase;color:#6b7280;letter-spacing:.05em;">Plant</th>
                <th style="padding:10px 16px;text-align:left;font-size:12px;text-transform:uppercase;color:#6b7280;letter-spacing:.05em;">Interval</th>
                <th style="padding:10px 16px;text-align:left;font-size:12px;text-transform:uppercase;color:#6b7280;letter-spacing:.05em;">Status</th>
                <th style="padding:10px 16px;text-align:left;font-size:12px;text-transform:uppercase;color:#6b7280;letter-spacing:.05em;">Care Notes</th>
              </tr>
            </thead>
            <tbody>
              ${rows}
            </tbody>
          </table>
        </div>

        <!-- Footer -->
        <div style="background:#f9fafb;padding:24px 40px;text-align:center;border-top:1px solid #e5e7eb;">
          <p style="margin:0;color:#9ca3af;font-size:13px;">
            Sent automatically by GreenThumb Reminder every morning at 8:00 AM.<br/>
            Open the app to mark plants as watered.
          </p>
        </div>
      </div>
    </body>
    </html>
  `;
}

// ── Plain-text fallback ───────────────────────────────────────────────────────

function buildEmailText(plants, today) {
  const lines = plants.map((p) => {
    const status = p.nextWateringDate < today ? `OVERDUE (due ${p.nextWateringDate})` : 'Due Today';
    return `• ${p.name} — every ${p.wateringIntervalDays} day(s) — ${status}`;
  });
  return [
    `GreenThumb Reminder — Daily Report (${today})`,
    '='.repeat(50),
    `${plants.length} plant(s) need watering:`,
    '',
    ...lines,
    '',
    'Open the GreenThumb app to mark them as watered.',
  ].join('\n');
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Sends the daily watering report email.
 * @param {Array} plants – Plants that are due or overdue for watering.
 * @returns {Promise<void>}
 */
async function sendDailyReport(plants) {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.warn('[Email] SMTP credentials not configured. Skipping email send.');
    return;
  }

  const recipient = process.env.RECIPIENT_EMAIL || process.env.SMTP_USER;
  const today     = new Date().toISOString().split('T')[0];

  const transporter = createTransporter();
  const subject     = `🌿 GreenThumb: ${plants.length} plant${plants.length !== 1 ? 's' : ''} need watering today (${today})`;

  const info = await transporter.sendMail({
    from:    `"GreenThumb Reminder" <${process.env.SMTP_USER}>`,
    to:      recipient,
    subject,
    text:    buildEmailText(plants, today),
    html:    buildEmailHtml(plants, today),
  });

  console.log(`[Email] Daily report sent → ${recipient} (messageId: ${info.messageId})`);
}

module.exports = { sendDailyReport };
