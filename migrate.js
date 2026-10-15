/**
 * Simple migration script – creates all required tables for AquaMind
 * Run: npm run db:migrate
 */
const { pool } = require('./db');

const schema = `
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users (farmers, admins, cooperatives)
CREATE TABLE IF NOT EXISTS users (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email         VARCHAR(255) UNIQUE,
  phone         VARCHAR(30),
  password_hash VARCHAR(255),
  full_name     VARCHAR(150) NOT NULL,
  role          VARCHAR(30) DEFAULT 'farmer', -- farmer | admin | cooperative
  language      VARCHAR(10) DEFAULT 'fr',
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Farms
CREATE TABLE IF NOT EXISTS farms (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id      UUID REFERENCES users(id) ON DELETE SET NULL,
  name          VARCHAR(150) NOT NULL,
  latitude      DOUBLE PRECISION NOT NULL,
  longitude     DOUBLE PRECISION NOT NULL,
  elevation_m   REAL,
  region        VARCHAR(100) DEFAULT 'Grombalia',
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Fields (parcels inside a farm)
CREATE TABLE IF NOT EXISTS fields (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  farm_id       UUID NOT NULL REFERENCES farms(id) ON DELETE CASCADE,
  name          VARCHAR(100) NOT NULL,
  crop          VARCHAR(80) DEFAULT 'Citrus',
  area_ha       REAL DEFAULT 1.0,
  target_moisture REAL DEFAULT 45,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Sensors
CREATE TABLE IF NOT EXISTS sensors (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  field_id      UUID REFERENCES fields(id) ON DELETE CASCADE,
  farm_id       UUID REFERENCES farms(id) ON DELETE CASCADE,
  type          VARCHAR(40) NOT NULL, -- soil_moisture | flow | temperature | rainfall
  device_id     VARCHAR(80) UNIQUE,
  status        VARCHAR(20) DEFAULT 'active', -- active | offline | maintenance
  last_seen     TIMESTAMPTZ,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Time-series sensor readings
CREATE TABLE IF NOT EXISTS sensor_readings (
  id            BIGSERIAL PRIMARY KEY,
  sensor_id     UUID NOT NULL REFERENCES sensors(id) ON DELETE CASCADE,
  field_id      UUID REFERENCES fields(id),
  value         DOUBLE PRECISION NOT NULL,
  unit          VARCHAR(20),
  recorded_at   TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_readings_sensor_time ON sensor_readings(sensor_id, recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_readings_field_time ON sensor_readings(field_id, recorded_at DESC);

-- Irrigation plans (AI generated)
CREATE TABLE IF NOT EXISTS irrigation_plans (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  field_id      UUID NOT NULL REFERENCES fields(id) ON DELETE CASCADE,
  plan_date     DATE NOT NULL,
  start_time    TIME,
  duration_min  INTEGER,
  volume_m3     REAL,
  reason        TEXT,
  status        VARCHAR(20) DEFAULT 'planned', -- planned | sent | completed | skipped
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Alerts (leaks, low moisture, sensor offline…)
CREATE TABLE IF NOT EXISTS alerts (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  farm_id       UUID REFERENCES farms(id),
  field_id      UUID REFERENCES fields(id),
  type          VARCHAR(40) NOT NULL, -- leak | low_moisture | sensor_offline | high_flow
  severity      VARCHAR(20) DEFAULT 'warning', -- info | warning | critical
  message       TEXT NOT NULL,
  acknowledged  BOOLEAN DEFAULT FALSE,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Weather cache (optional)
CREATE TABLE IF NOT EXISTS weather_cache (
  id            SERIAL PRIMARY KEY,
  latitude      DOUBLE PRECISION,
  longitude     DOUBLE PRECISION,
  data          JSONB,
  fetched_at    TIMESTAMPTZ DEFAULT NOW()
);
`;

async function migrate() {
  const client = await pool.connect();
  try {
    console.log('Running AquaMind migrations...');
    await client.query(schema);
    console.log('✅ All tables created successfully');
  } catch (err) {
    console.error('Migration failed:', err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

migrate();
