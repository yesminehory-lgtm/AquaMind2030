const express = require('express');
const db = require('../config/db');
const { optionalAuth } = require('../middleware/auth');

const router = express.Router();

/**
 * Ingest a sensor reading (called by ESP32 / LoRa gateway / MQTT bridge)
 * POST /api/sensors/readings
 * body: { device_id, value, unit?, recorded_at? }
 */
router.post('/readings', async (req, res) => {
  try {
    const { device_id, value, unit, recorded_at } = req.body;
    if (!device_id || value == null) {
      return res.status(400).json({ error: 'device_id and value are required' });
    }

    const { rows: sensors } = await db.query(
      `SELECT id, field_id, farm_id, type FROM sensors WHERE device_id = $1`,
      [device_id]
    );
    if (!sensors.length) {
      return res.status(404).json({ error: 'Unknown device_id. Register the sensor first.' });
    }
    const sensor = sensors[0];

    await db.query(
      `UPDATE sensors SET last_seen = NOW(), status = 'active' WHERE id = $1`,
      [sensor.id]
    );

    const { rows } = await db.query(
      `INSERT INTO sensor_readings (sensor_id, field_id, value, unit, recorded_at)
       VALUES ($1, $2, $3, $4, COALESCE($5, NOW())) RETURNING *`,
      [sensor.id, sensor.field_id, value, unit || null, recorded_at || null]
    );

    // Simple leak / anomaly check for flow sensors
    if (sensor.type === 'flow' && value > 1.5) {
      // example: high night flow → possible leak
      const hour = new Date().getHours();
      if (hour >= 0 && hour <= 5) {
        await db.query(
          `INSERT INTO alerts (farm_id, field_id, type, severity, message)
           VALUES ($1, $2, 'leak', 'warning', $3)`,
          [sensor.farm_id, sensor.field_id, `Possible leak detected: ${value} m³/h on device ${device_id} at night`]
        );
      }
    }

    res.status(201).json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to store reading' });
  }
});

// Latest readings for a field
router.get('/field/:fieldId/latest', async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT s.type, s.device_id, s.status, sr.value, sr.unit, sr.recorded_at
       FROM sensors s
       LEFT JOIN LATERAL (
         SELECT value, unit, recorded_at FROM sensor_readings
         WHERE sensor_id = s.id ORDER BY recorded_at DESC LIMIT 1
       ) sr ON true
       WHERE s.field_id = $1`,
      [req.params.fieldId]
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch readings' });
  }
});

// History for charts
router.get('/field/:fieldId/history', async (req, res) => {
  try {
    const hours = Number(req.query.hours) || 24;
    const { rows } = await db.query(
      `SELECT s.type, sr.value, sr.unit, sr.recorded_at
       FROM sensor_readings sr
       JOIN sensors s ON s.id = sr.sensor_id
       WHERE s.field_id = $1 AND sr.recorded_at > NOW() - ($2 || ' hours')::INTERVAL
       ORDER BY sr.recorded_at ASC`,
      [req.params.fieldId, hours]
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch history' });
  }
});

// Register a new sensor
router.post('/', async (req, res) => {
  try {
    const { field_id, farm_id, type, device_id } = req.body;
    const { rows } = await db.query(
      `INSERT INTO sensors (field_id, farm_id, type, device_id, status, last_seen)
       VALUES ($1, $2, $3, $4, 'active', NOW()) RETURNING *`,
      [field_id, farm_id, type, device_id]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'device_id already exists' });
    console.error(err);
    res.status(500).json({ error: 'Failed to register sensor' });
  }
});

module.exports = router;
