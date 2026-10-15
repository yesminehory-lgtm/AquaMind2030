/**
 * Seed demo data for Grombalia pilot
 * Run: npm run db:seed
 */
const { pool } = require('./db');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

async function seed() {
  const client = await pool.connect();
  try {
    console.log('Seeding AquaMind demo data...');

    // Demo farmer
    const passwordHash = await bcrypt.hash('aquamind2026', 10);
    const userRes = await client.query(
      `INSERT INTO users (email, phone, password_hash, full_name, role, language)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (email) DO UPDATE SET full_name = EXCLUDED.full_name
       RETURNING id`,
      ['farmer@grombalia.tn', '+21620000000', passwordHash, 'Mohamed Ben Ali', 'farmer', 'fr']
    );
    const userId = userRes.rows[0].id;

    // Demo farm
    const farmRes = await client.query(
      `INSERT INTO farms (owner_id, name, latitude, longitude, elevation_m, region)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id`,
      [userId, 'Ferme Grombalia Demo', 36.6, 10.5, 48, 'Grombalia']
    );
    const farmId = farmRes.rows[0].id;

    // Fields
    const fields = [
      { name: 'Citrus A', crop: 'Citrus', area: 2.0, target: 42 },
      { name: 'Olives B', crop: 'Olives', area: 1.5, target: 38 },
      { name: 'Tomatoes C', crop: 'Tomatoes', area: 0.8, target: 50 },
    ];

    for (const f of fields) {
      const fieldRes = await client.query(
        `INSERT INTO fields (farm_id, name, crop, area_ha, target_moisture)
         VALUES ($1, $2, $3, $4, $5) RETURNING id`,
        [farmId, f.name, f.crop, f.area, f.target]
      );
      const fieldId = fieldRes.rows[0].id;

      // Soil moisture sensor
      await client.query(
        `INSERT INTO sensors (field_id, farm_id, type, device_id, status, last_seen)
         VALUES ($1, $2, 'soil_moisture', $3, 'active', NOW())`,
        [fieldId, farmId, `SM-${fieldId.slice(0, 8)}`]
      );

      // Flow meter
      await client.query(
        `INSERT INTO sensors (field_id, farm_id, type, device_id, status, last_seen)
         VALUES ($1, $2, 'flow', $3, 'active', NOW())`,
        [fieldId, farmId, `FL-${fieldId.slice(0, 8)}`]
      );

      // Sample readings
      const moisture = 30 + Math.random() * 25;
      await client.query(
        `INSERT INTO sensor_readings (sensor_id, field_id, value, unit)
         SELECT id, $1, $2, '%' FROM sensors WHERE field_id = $1 AND type = 'soil_moisture' LIMIT 1`,
        [fieldId, moisture]
      );
    }

    console.log('✅ Seed completed');
    console.log('Demo login → email: farmer@grombalia.tn  /  password: aquamind2026');
  } catch (err) {
    console.error('Seed failed:', err.message);
  } finally {
    client.release();
    await pool.end();
  }
}

seed();
