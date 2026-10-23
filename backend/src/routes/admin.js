const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const authMiddleware = require('../middleware/auth');
const { validateMapAndPointId, validateId } = require('../middleware/validation');
const { uploadLimiter } = require('../middleware/rateLimiter');
const multer = require('multer');
const path = require('path');

// Multer setup for utility images/videos
const utilityStorage = multer.diskStorage({
  destination: 'uploads/utility/',
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});

const utilityUpload = multer({ 
  storage: utilityStorage,
  limits: { fileSize: 12 * 1024 * 1024 },
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

// Multer setup for map images
const mapStorage = multer.diskStorage({
  destination: 'uploads/maps/',
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});

const mapUpload = multer({ 
  storage: mapStorage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only image files are allowed for maps'));
    }
  }
});

// Check if user is admin
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

// Create utility point (admin only)
router.post('/maps/:mapId/points', authMiddleware, adminMiddleware, uploadLimiter, utilityUpload.single('file'), validateUtilityPoint, handleValidationErrors, async (req, res) => {
  try {
    const { name, utility_type, x, y, description, team } = req.body;
    const mapId = req.params.mapId;
    const filePath = req.file ? `/uploads/utility/${req.file.filename}` : null;
    
    // Determine if it's image or video
    const isVideo = req.file && /mp4|webm/.test(req.file.mimetype);
    const imageUrl = !isVideo && filePath ? filePath : null;
    const videoUrl = isVideo && filePath ? filePath : null;

    const result = await pool.query(
      'INSERT INTO utility_points (map_id, name, utility_type, team, x, y, description, image_url, video_url) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *',
      [mapId, name, utility_type, team || 't', x, y, description, imageUrl, videoUrl]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update utility point (admin only)
router.put('/maps/:mapId/points/:pointId', authMiddleware, adminMiddleware, uploadLimiter, utilityUpload.single('file'), validateMapAndPointId, validateUtilityPoint, handleValidationErrors, async (req, res) => {
  try {
    const { name, utility_type, x, y, description, team } = req.body;
    const { mapId, pointId } = req.params;

    let imageUrl = null;
    let videoUrl = null;

    if (req.file) {
      const filePath = `/uploads/utility/${req.file.filename}`;
      const isVideo = /mp4|webm/.test(req.file.mimetype);
      imageUrl = !isVideo ? filePath : null;
      videoUrl = isVideo ? filePath : null;
    }

    const updateQuery = `
      UPDATE utility_points 
      SET 
        name = COALESCE($1, name),
        utility_type = COALESCE($2, utility_type),
        team = COALESCE($3, team),
        x = COALESCE($4, x),
        y = COALESCE($5, y),
        description = COALESCE($6, description),
        image_url = COALESCE($7, image_url),
        video_url = COALESCE($8, video_url),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $9 AND map_id = $10
      RETURNING *
    `;

    const result = await pool.query(updateQuery, [
      name, utility_type, team || 't', x, y, description, imageUrl, videoUrl, pointId, mapId
    ]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Utility point not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete utility point (admin only)
router.delete('/maps/:mapId/points/:pointId', authMiddleware, adminMiddleware, validateMapAndPointId, handleValidationErrors, async (req, res) => {
  try {
    const { mapId, pointId } = req.params;

    const result = await pool.query(
      'DELETE FROM utility_points WHERE id = $1 AND map_id = $2 RETURNING id',
      [pointId, mapId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Utility point not found' });
    }

    res.json({ message: 'Utility point deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update map info (admin only)
router.put('/maps/:id', authMiddleware, adminMiddleware, uploadLimiter, mapUpload.single('image'), validateId, handleValidationErrors, async (req, res) => {
  try {
    const { name } = req.body;
    const mapId = req.params.id;
    const imageUrl = req.file ? `/uploads/maps/${req.file.filename}` : null;

    const updateQuery = `
      UPDATE maps 
      SET 
        name = COALESCE($1, name),
        image_url = COALESCE($2, image_url)
      WHERE id = $3
      RETURNING *
    `;

    const result = await pool.query(updateQuery, [name, imageUrl, mapId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Map not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
