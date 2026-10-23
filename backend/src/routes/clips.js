const express = require('express');
const router = express.Router();
const multer = require('multer');
const pool = require('../config/database');
const authMiddleware = require('../middleware/auth');
const { validateClip } = require('../middleware/validation');
const { uploadLimiter } = require('../middleware/rateLimiter');
const path = require('path');

// Multer setup
const storage = multer.diskStorage({
  destination: 'uploads/clips/',
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage,
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|mp4|webm/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only image and video files are allowed'));
    }
  }
});

// Get all clips
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT c.*, u.username FROM clips c JOIN users u ON c.user_id = u.id ORDER BY c.created_at DESC'
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Upload clip
router.post('/', authMiddleware, uploadLimiter, upload.single('file'), validateClip, async (req, res) => {
  try {
    const { title, description, map_id, utility_type } = req.body;
    const userId = req.user.userId;
    const filePath = `/uploads/clips/${req.file.filename}`;

    const result = await pool.query(
      'INSERT INTO clips (title, description, map_id, utility_type, user_id, file_path) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
      [title, description, map_id, utility_type, userId, filePath]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Clip upload error:', err);
    res.status(500).json({ error: 'Failed to upload clip' });
  }
});

module.exports = router;
