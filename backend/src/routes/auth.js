const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const config = require('../config');
const repo = require('../db/repo');
const { authRequired } = require('../middleware/auth');

// Register
router.post('/register', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password || username.trim().length < 3 || password.length < 5) {
      return res.status(400).json({ error: 'Username must be at least 3 chars and password at least 5 chars.' });
    }

    const trimmedUser = username.trim();
    const existing = await repo.getUserByUsername(trimmedUser);
    if (existing) {
      return res.status(400).json({ error: 'Username already taken.' });
    }

    const salt = bcrypt.genSaltSync(10);
    const hash = bcrypt.hashSync(password, salt);

    const user = await repo.createUser({
      username: trimmedUser,
      password_hash: hash,
      balance: 10.0,
      role: 'user'
    });

    const token = jwt.sign({ id: user.id, username: trimmedUser }, config.jwtSecret, { expiresIn: '7d' });

    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        username: user.username,
        balance: 10.0,
        role: 'user'
      }
    });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ error: 'Registration failed.' });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password required.' });
    }

    const user = await repo.getUserByUsername(username.trim());
    if (!user) {
      return res.status(401).json({ error: 'Invalid username or password.' });
    }

    const match = bcrypt.compareSync(password, user.password_hash);
    if (!match) {
      return res.status(401).json({ error: 'Invalid username or password.' });
    }

    const token = jwt.sign({ id: user.id, username: user.username }, config.jwtSecret, { expiresIn: '7d' });

    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        username: user.username,
        balance: user.balance,
        role: user.role,
        telegram_id: user.telegram_id
      }
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Login failed.' });
  }
});

// Current user profile
router.get('/me', authRequired, (req, res) => {
  res.json({ success: true, user: req.user });
});

module.exports = router;
