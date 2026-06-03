const express = require('express');
const router = express.Router();
const db = require('../db');
const { authenticateToken, isAdmin } = require('../middleware/auth');

// ── GET ALL CONTACT QUERIES (Admin Only) ────────────────────────────────────
router.get('/', authenticateToken, isAdmin, async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM contacts ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (err) {
    console.error('Fetch contacts error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ── SUBMIT CONTACT QUERY (Public) ──────────────────────────────────────────
router.post('/', async (req, res) => {
  const { name, email, phone, message } = req.body;

  if (!name || !email || !message) {
    return res.status(400).json({ error: 'Name, email, and message are required.' });
  }

  try {
    await db.query(
      'INSERT INTO contacts (name, email, phone, message, status) VALUES ($1, $2, $3, $4, $5)',
      [name, email, phone || null, message, 'unread']
    );
    res.json({ success: true });
  } catch (err) {
    console.error('Submit contact error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ── MARK QUERY AS READ (Admin Only) ─────────────────────────────────────────
router.put('/:id', authenticateToken, isAdmin, async (req, res) => {
  const { id } = req.params;
  try {
    await db.query("UPDATE contacts SET status = 'read' WHERE id = $1", [id]);
    res.json({ success: true });
  } catch (err) {
    console.error('Mark read contact error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ── DELETE QUERY (Admin Only) ───────────────────────────────────────────────
router.delete('/:id', authenticateToken, isAdmin, async (req, res) => {
  const { id } = req.params;
  try {
    await db.query('DELETE FROM contacts WHERE id = $1', [id]);
    res.json({ success: true });
  } catch (err) {
    console.error('Delete contact error:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
