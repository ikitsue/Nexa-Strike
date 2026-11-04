const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const pool = require('../config/database');
const authMiddleware = require('../middleware/auth');
const { validateSuggestion, validateId, handleValidationErrors } = require('../middleware/validation');
const handleRouteError = require('../utils/routeError');

// Get all suggestions
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT s.*, u.username, u.steam_id FROM suggestions s JOIN users u ON s.user_id = u.id ORDER BY s.created_at DESC LIMIT 100'
    );
    res.json(result.rows);
  } catch (err) {
    handleRouteError(res, 'List suggestions', err);
  }
});

// Get suggestion by ID
router.get('/:id', validateId, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT s.*, u.username, u.steam_id FROM suggestions s JOIN users u ON s.user_id = u.id WHERE s.id = $1',
      [req.params.id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Suggestion not found' });
    }
    
    res.json(result.rows[0]);
  } catch (err) {
    handleRouteError(res, 'Get suggestion', err);
  }
});

// Create suggestion
router.post('/', authMiddleware, validateSuggestion, body('map_id').optional({ nullable: true }).isInt({ min: 1 }).withMessage('Invalid map ID'), handleValidationErrors, async (req, res) => {
  try {
    const { title, description, map_id, utility_type } = req.body;
    const userId = req.user.userId;

    // Validate map exists if provided
    if (map_id) {
      const mapCheck = await pool.query('SELECT id FROM maps WHERE id = $1', [map_id]);
      if (mapCheck.rows.length === 0) {
        return res.status(400).json({ error: 'Invalid map ID' });
      }
    }

    const result = await pool.query(
      'INSERT INTO suggestions (title, description, map_id, utility_type, user_id, status) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
      [title, description, map_id || null, utility_type, userId, 'pending']
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    handleRouteError(res, 'Create suggestion', err);
  }
});

// Approve/Reject suggestion (admin only)
router.patch('/:id', authMiddleware, validateId,
  body('status')
    .isIn(['pending', 'approved', 'rejected'])
    .withMessage('Invalid status value'),
  handleValidationErrors,
  async (req, res) => {
    try {
      // Check if user is admin
      const adminCheck = await pool.query(
        'SELECT role FROM users WHERE id = $1',
        [req.user.userId]
      );

      if (adminCheck.rows.length === 0 || adminCheck.rows[0].role !== 'admin') {
        return res.status(403).json({ error: 'Admin access required' });
      }

      const { status } = req.body;
      const result = await pool.query(
        'UPDATE suggestions SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *',
        [status, req.params.id]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Suggestion not found' });
      }

      res.json(result.rows[0]);
    } catch (err) {
      handleRouteError(res, 'Update suggestion', err);
    }
  }
);

// Delete suggestion (owner or admin only)
router.delete('/:id', authMiddleware, validateId, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    // Get suggestion to check ownership
    const suggestionCheck = await pool.query(
      'SELECT user_id FROM suggestions WHERE id = $1',
      [id]
    );

    if (suggestionCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Suggestion not found' });
    }

    // Check if user is owner or admin
    const userCheck = await pool.query(
      'SELECT role FROM users WHERE id = $1',
      [userId]
    );

    const isOwner = suggestionCheck.rows[0].user_id === userId;
    const isAdmin = userCheck.rows.length > 0 && userCheck.rows[0].role === 'admin';

    if (!isOwner && !isAdmin) {
      return res.status(403).json({ error: 'You can only delete your own suggestions' });
    }

    const result = await pool.query(
      'DELETE FROM suggestions WHERE id = $1 RETURNING *',
      [id]
    );

    res.json({ message: 'Suggestion deleted successfully', suggestion: result.rows[0] });
  } catch (err) {
    handleRouteError(res, 'Delete suggestion', err);
  }
});

module.exports = router;
