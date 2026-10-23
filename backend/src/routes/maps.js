const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const { validateId } = require('../middleware/validation');

// Get all maps
router.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM maps ORDER BY name ASC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get map by ID with all utility points
router.get('/:id', validateId, async (req, res) => {
  try {
    const mapId = req.params.id;
    const mapResult = await pool.query('SELECT * FROM maps WHERE id = $1', [mapId]);
    
    if (mapResult.rows.length === 0) {
      return res.status(404).json({ error: 'Map not found' });
    }

    const pointsResult = await pool.query(
      'SELECT * FROM utility_points WHERE map_id = $1 ORDER BY name ASC',
      [mapId]
    );

    res.json({
      map: mapResult.rows[0],
      points: pointsResult.rows
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
