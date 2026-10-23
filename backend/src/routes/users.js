const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const authMiddleware = require('../middleware/auth');
const emailService = require('../services/emailService');
const { validateId } = require('../middleware/validation');

// Admin middleware - check if user is admin
const adminMiddleware = async (req, res, next) => {
  try {
    const result = await pool.query('SELECT role FROM users WHERE id = $1', [req.user.userId]);
    if (result.rows.length === 0 || result.rows[0].role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }
    next();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Get current user profile
router.get('/profile', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.userId;
    const result = await pool.query('SELECT id, email, username, steam_id, profile_picture, created_at, role FROM users WHERE id = $1', [userId]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Admin: Get all users (for admin panel) - MUST be before /:id route
router.get('/admin/all', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, email, username, role, created_at, banned, ban_reason, banned_at FROM users ORDER BY created_at DESC'
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Admin: Ban a user
router.post('/admin/:id/ban', authMiddleware, adminMiddleware, validateId, handleValidationErrors, async (req, res) => {
  try {
    const userId = req.params.id;
    const { ban_reason } = req.body;

    // Prevent admin from banning themselves
    if (req.user.userId === parseInt(userId)) {
      return res.status(400).json({ error: 'Cannot ban yourself' });
    }

    // Get user info before banning
    const userResult = await pool.query('SELECT id, username, email FROM users WHERE id = $1', [userId]);
    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = userResult.rows[0];

    // Ban the user
    const result = await pool.query(
      'UPDATE users SET banned = true, ban_reason = $1, banned_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING id, username, banned, ban_reason, banned_at',
      [ban_reason || 'Banned by admin', userId]
    );

    // Send ban notification email asynchronously (don't wait for it)
    emailService.sendBanNotification(user.email, user.username, ban_reason || 'Banned by admin');

    res.json({ message: 'User banned successfully', user: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Admin: Unban a user
router.post('/admin/:id/unban', authMiddleware, adminMiddleware, validateId, handleValidationErrors, async (req, res) => {
  try {
    const userId = req.params.id;

    const result = await pool.query(
      'UPDATE users SET banned = false, ban_reason = NULL, banned_at = NULL WHERE id = $1 RETURNING id, username, banned',
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ message: 'User unbanned successfully', user: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get user by ID - MUST be after admin routes
router.get('/:id', validateId, async (req, res) => {
  try {
    const userId = req.params.id;
    const result = await pool.query('SELECT id, email, username, steam_id, profile_picture, created_at FROM users WHERE id = $1', [userId]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
