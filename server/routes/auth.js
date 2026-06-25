const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const db = require('../db');
const { JWT_SECRET } = require('../middleware/auth');
const rateLimiter = require('../middleware/rateLimiter');

// POST /api/auth/login
router.post('/login', rateLimiter, async (req, res) => {
  const { userId, password } = req.body;

  if (!userId || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }

  try {
    const result = await db.query('SELECT * FROM users WHERE username = $1', [userId]);
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid Username or Password' });
    }

    const user = result.rows[0];
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid Username or Password' });
    }

    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role },
      JWT_SECRET,
      { expiresIn: '1h' }
    );

    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        username: user.username,
        role: user.role
      }
    });
  } catch (err) {
    console.error('Login Error:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// POST /api/auth/seed-admin
router.post('/seed-admin', async (req, res) => {
  if (process.env.NODE_ENV === 'production') {
    return res.status(403).json({ error: 'Seeding admin accounts is disabled in production.' });
  }
  try {
    const result = await db.query('SELECT COUNT(*) as count FROM users');
    const userCount = parseInt(result.rows[0].count);

    if (userCount > 0) {
      return res.status(400).json({ error: 'Database is already seeded with admin accounts.' });
    }

    const defaultUsername = 'admin';
    const defaultPassword = 'admin123';
    const hashedPassword = await bcrypt.hash(defaultPassword, 10);

    await db.query(
      'INSERT INTO users (username, password, role) VALUES ($1, $2, $3)',
      [defaultUsername, hashedPassword, 'admin']
    );

    res.json({ success: true, message: 'Admin account seeded successfully.' });
  } catch (err) {
    console.error('Seed Error:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

module.exports = router;
