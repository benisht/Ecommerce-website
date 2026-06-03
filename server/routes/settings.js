const express = require('express');
const router = express.Router();
const db = require('../db');
const { authenticateToken, isAdmin } = require('../middleware/auth');

// In-memory cache for settings to avoid redundant database reads
const settingsCache = {};

// ── GET SETTING (Public) ────────────────────────────────────────────────────
router.get('/:key', async (req, res) => {
  const { key } = req.params;

  // Check cache first
  if (settingsCache[key] !== undefined) {
    return res.json({ value: settingsCache[key] });
  }

  try {
    const result = await db.query('SELECT value FROM settings WHERE key = $1', [key]);
    if (result.rows.length > 0) {
      let parsedValue = result.rows[0].value;
      try {
        parsedValue = typeof parsedValue === 'string' ? JSON.parse(parsedValue) : parsedValue;
      } catch (e) {}

      // Cache the parsed value
      settingsCache[key] = parsedValue;
      res.json({ value: parsedValue });
    } else {
      res.json({ value: null });
    }
  } catch (err) {
    console.error('Fetch settings error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ── UPDATE SETTING (Admin Only) ─────────────────────────────────────────────
router.put('/:key', authenticateToken, isAdmin, async (req, res) => {
  const { key } = req.params;
  const { value } = req.body;

  try {
    const stringifiedValue = JSON.stringify(value);
    await db.query(
      `INSERT INTO settings (key, value) VALUES ($1, $2)
       ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`,
      [key, stringifiedValue]
    );

    // Update / Invalidate Cache
    settingsCache[key] = value;
    res.json({ success: true });
  } catch (err) {
    console.error('Update settings error:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
