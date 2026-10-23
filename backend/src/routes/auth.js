const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../config/database');
const { validateRegister, validateLogin } = require('../middleware/validation');
const authMiddleware = require('../middleware/auth');
const emailService = require('../services/emailService');
const { getCookieOptions, getCookieClearOptions } = require('../utils/cookieOptions');

// Helper function to generate tokens
const generateTokens = (userId, email) => {
  const jwtOptions = {
    algorithm: 'HS256',
    issuer: process.env.JWT_ISSUER || 'NexaStrike'
  };

  const token = jwt.sign(
    { userId, email },
    process.env.JWT_SECRET,
    { ...jwtOptions, expiresIn: process.env.JWT_EXPIRY || '24h' }
  );

  const refreshToken = jwt.sign(
    { userId, email },
    process.env.JWT_REFRESH_SECRET,
    { ...jwtOptions, expiresIn: process.env.JWT_REFRESH_EXPIRY || '7d' }
  );

  return { token, refreshToken };
};

// Register
router.post('/register', validateRegister, async (req, res) => {
  try {
    const { email, password, username } = req.body;

    // Check if user exists
    const userExists = await pool.query('SELECT id FROM users WHERE email = $1 OR username = $2', [email, username]);
    if (userExists.rows.length > 0) {
      return res.status(409).json({ error: 'Email or username already exists' });
    }

    // Hash password with configured rounds
    const bcryptRounds = parseInt(process.env.BCRYPT_ROUNDS || '10');
    const hashedPassword = await bcrypt.hash(password, bcryptRounds);

    // Insert user
    const result = await pool.query(
      'INSERT INTO users (email, password, username, created_at) VALUES ($1, $2, $3, CURRENT_TIMESTAMP) RETURNING id, email, username, created_at',
      [email, hashedPassword, username]
    );

    const newUser = result.rows[0];

    // Send welcome email asynchronously (don't wait for it)
    emailService.sendWelcomeEmail(email, username);

    res.status(201).json({ 
      message: 'User registered successfully',
      user: newUser 
    });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// Login
router.post('/login', validateLogin, async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find user with role
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = result.rows[0];

    // Check if user is banned
    if (user.banned) {
      return res.status(403).json({ 
        error: 'Your account has been banned',
        ban_reason: user.ban_reason,
        banned_at: user.banned_at
      });
    }

    // Check password
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Generate tokens
    const { token, refreshToken } = generateTokens(user.id, user.email);

    // Store refresh token in database
    await pool.query(
      'UPDATE users SET refresh_token = $1, last_login = CURRENT_TIMESTAMP WHERE id = $2',
      [refreshToken, user.id]
    );

    const cookieOptions = getCookieOptions(process.env, { maxAgeMs: 24 * 60 * 60 * 1000, path: '/' });

    res.cookie('token', token, cookieOptions);

    res.cookie('refreshToken', refreshToken, {
      ...cookieOptions,
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: '/api/auth'
    });

    res.json({ 
      token, 
      refreshToken,
      user: { 
        id: user.id, 
        email: user.email, 
        username: user.username,
        role: user.role,
        steam_id: user.steam_id
      } 
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Login failed' });
  }
});

// Refresh token
router.post('/refresh', async (req, res) => {
  try {
    let { refreshToken } = req.body;

    if (!refreshToken && req.headers.cookie) {
      const cookies = req.headers.cookie.split(';').reduce((cookies, pair) => {
        const [key, ...rest] = pair.trim().split('=');
        if (!key) return cookies;
        cookies[key] = rest.join('=');
        return cookies;
      }, {});
      refreshToken = cookies.refreshToken;
    }

    if (!refreshToken) {
      return res.status(400).json({ error: 'Refresh token required' });
    }

    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET, {
      algorithms: ['HS256'],
      issuer: process.env.JWT_ISSUER || 'NexaStrike'
    });

    // Check if refresh token matches in database
    const result = await pool.query(
      'SELECT id, email FROM users WHERE id = $1 AND refresh_token = $2',
      [decoded.userId, refreshToken]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid refresh token' });
    }

    const user = result.rows[0];

    // Generate new tokens
    const { token, refreshToken: newRefreshToken } = generateTokens(user.id, user.email);

    // Update refresh token in database
    await pool.query(
      'UPDATE users SET refresh_token = $1 WHERE id = $2',
      [newRefreshToken, user.id]
    );

    const cookieOptions = getCookieOptions(process.env, { maxAgeMs: 24 * 60 * 60 * 1000, path: '/' });

    res.cookie('token', token, cookieOptions);

    res.cookie('refreshToken', newRefreshToken, {
      ...cookieOptions,
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: '/api/auth'
    });

    res.json({ token, refreshToken: newRefreshToken });
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Refresh token expired' });
    }
    if (err.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'Invalid refresh token' });
    }
    console.error('Refresh error:', err);
    res.status(500).json({ error: 'Token refresh failed' });
  }
});

// Logout
router.post('/logout', authMiddleware, async (req, res) => {
  try {
    // Clear refresh token
    await pool.query(
      'UPDATE users SET refresh_token = NULL WHERE id = $1',
      [req.user.userId]
    );

    res.clearCookie('token', getCookieClearOptions(process.env, '/'));
    res.clearCookie('refreshToken', getCookieClearOptions(process.env, '/api/auth'));

    res.json({ message: 'Logged out successfully' });
  } catch (err) {
    console.error('Logout error:', err);
    res.status(500).json({ error: 'Logout failed' });
  }
});

module.exports = router;
