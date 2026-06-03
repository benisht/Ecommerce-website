const express = require('express');
const router = express.Router();
const db = require('../db');
const { authenticateToken, isAdmin } = require('../middleware/auth');

// ── GET ALL CATEGORIES (Public) ─────────────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const result = await db.query('SELECT name FROM categories ORDER BY name ASC');
    res.json(result.rows.map(row => row.name));
  } catch (err) {
    console.error('Fetch categories error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ── CREATE CATEGORY (Admin Only) ────────────────────────────────────────────
router.post('/', authenticateToken, isAdmin, async (req, res) => {
  const { name } = req.body;

  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'Category name is required' });
  }

  try {
    await db.query(
      'INSERT INTO categories (name) VALUES ($1) ON CONFLICT (name) DO NOTHING',
      [name.trim()]
    );
    res.json({ success: true });
  } catch (err) {
    console.error('Create category error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ── DELETE CATEGORY (Admin Only) ────────────────────────────────────────────
router.delete('/:name', authenticateToken, isAdmin, async (req, res) => {
  const { name } = req.params;
  try {
    await db.query('DELETE FROM categories WHERE name = $1', [name]);
    res.json({ success: true });
  } catch (err) {
    console.error('Delete category error:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
