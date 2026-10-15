const express = require('express');
const db = require('../config/db');
const { authRequired, optionalAuth } = require('../middleware/auth');
const { getWeather } = require('../services/weatherService');
const { computeIrrigationPlan } = require('../services/irrigationEngine');

const router = express.Router();

// List farms (of current user or all for demo)
router.get('/', optionalAuth, async (req, res) => {
  try {
    let query = `SELECT f.*, u.full_name AS owner_name
                 FROM farms f LEFT JOIN users u ON u.id = f.owner_id`;
    const params = [];
    if (req.user) {
      query += ` WHERE f.owner_id = $1`;
      params.push(req.user.id);
    }
    query += ` ORDER BY f.created_at DESC`;
    const { rows } = await db.query(query, params);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to list farms' });
  }
});

// Create farm
router.post('/', authRequired, async (req, res) => {
  try {
    const { name, latitude, longitude, elevation_m, region } = req.body;
    if (!name || latitude == null || longitude == null) {
      return res.status(400).json({ error: 'name, latitude, longitude required' });
    }
    const { rows } = await db.query(
      `INSERT INTO farms (owner_id, name, latitude, longitude, elevation_m, region)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [req.user.id, name, latitude, longitude, elevation_m || null, region || 'Grombalia']
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create farm' });
  }
});

// Get one farm + fields + latest sensor values
router.get('/:id', optionalAuth, async (req, res) => {
  try {
    const { rows: farms } = await db.query(`SELECT * FROM farms WHERE id = $1`, [req.params.id]);
    if (!farms.length) return res.status(404).json({ error: 'Farm not found' });
    const farm = farms[0];

    const { rows: fields } = await db.query(
      `SELECT f.*,
         (SELECT value FROM sensor_readings sr
          JOIN sensors s ON s.id = sr.sensor_id
          WHERE s.field_id = f.id AND s.type = 'soil_moisture'
          ORDER BY sr.recorded_at DESC LIMIT 1) AS latest_moisture
       FROM fields f WHERE f.farm_id = $1`,
      [farm.id]
    );

    res.json({ ...farm, fields });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to get farm' });
  }
});

// Weather for a farm
router.get('/:id/weather', async (req, res) => {
  try {
    const { rows } = await db.query(`SELECT latitude, longitude FROM farms WHERE id = $1`, [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'Farm not found' });
    const weather = await getWeather(rows[0].latitude, rows[0].longitude);
    res.json(weather);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Weather service unavailable' });
  }
});

// Generate irrigation plans for all fields of a farm
router.get('/:id/irrigation-plan', async (req, res) => {
  try {
    const { rows: farms } = await db.query(`SELECT * FROM farms WHERE id = $1`, [req.params.id]);
    if (!farms.length) return res.status(404).json({ error: 'Farm not found' });
    const farm = farms[0];

    const weather = await getWeather(farm.latitude, farm.longitude);

    const { rows: fields } = await db.query(`SELECT * FROM fields WHERE farm_id = $1`, [farm.id]);

    const plans = [];
    for (const field of fields) {
      const { rows: moist } = await db.query(
        `SELECT sr.value FROM sensor_readings sr
         JOIN sensors s ON s.id = sr.sensor_id
         WHERE s.field_id = $1 AND s.type = 'soil_moisture'
         ORDER BY sr.recorded_at DESC LIMIT 1`,
        [field.id]
      );
      const moisture = moist[0]?.value ?? 35;
      const plan = computeIrrigationPlan(field, moisture, weather);
      plans.push(plan);

      // Persist plan
      await db.query(
        `INSERT INTO irrigation_plans (field_id, plan_date, start_time, duration_min, volume_m3, reason)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [field.id, plan.plan_date, plan.start_time, plan.duration_min, plan.volume_m3, plan.reason]
      );
    }

    res.json({ farm_id: farm.id, generated_at: new Date().toISOString(), plans });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to generate irrigation plan' });
  }
});

module.exports = router;
