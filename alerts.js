const express = require('express');
const db = require('../config/db');
const { optionalAuth } = require('../middleware/auth');

const router = express.Router();

router.get('/', optionalAuth, async (req, res) => {
  try {
    const { farm_id } = req.query;
    let q = `SELECT * FROM alerts WHERE acknowledged = false`;
    const params = [];
    if (farm_id) {
      q += ` AND farm_id = $1`;
      params.push(farm_id);
    }
    q += ` ORDER BY created_at DESC LIMIT 50`;
    const { rows } = await db.query(q, params);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to list alerts' });
  }
});

router.patch('/:id/ack', async (req, res) => {
  try {
    const { rows } = await db.query(
      `UPDATE alerts SET acknowledged = true WHERE id = $1 RETURNING *`,
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Alert not found' });
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to acknowledge alert' });
  }
});

module.exports = router;
