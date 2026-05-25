-- GreenThumb Reminder - Database Schema
-- Using SQLite via better-sqlite3

CREATE TABLE IF NOT EXISTS plants (
  id                  TEXT PRIMARY KEY,          -- UUID string
  name                TEXT NOT NULL,             -- Plant display name
  wateringIntervalDays INTEGER NOT NULL,         -- e.g. 7 = water every 7 days
  careInstructions    TEXT DEFAULT '',           -- Optional freeform notes
  image               TEXT DEFAULT '',           -- URL or Base64 data URI
  startDate           TEXT NOT NULL,             -- ISO date string YYYY-MM-DD
  lastWateredDate     TEXT NOT NULL,             -- ISO date string YYYY-MM-DD
  createdAt           TEXT NOT NULL DEFAULT (datetime('now')),
  updatedAt           TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Trigger: auto-update updatedAt on every row update
CREATE TRIGGER IF NOT EXISTS plants_updatedAt
  AFTER UPDATE ON plants
  FOR EACH ROW
BEGIN
  UPDATE plants SET updatedAt = datetime('now') WHERE id = OLD.id;
END;
