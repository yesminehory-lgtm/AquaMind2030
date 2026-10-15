# AquaMind Platform – Dynamic Backend + Frontend

**AI Platform for Precision Irrigation and Water Resilience among Smallholder Farmers in Tunisia**

IEEE ENSIT SIGHT Group

---

## Architecture

```
Sensors (ESP32 / LoRa)  →  POST /api/sensors/readings
                                ↓
                     Node.js + Express API
                                ↓
                     PostgreSQL (farms, fields, sensors, readings, plans, alerts)
                                ↓
                     Frontend (existing GitHub Pages UI + new API calls)
```

## Quick Start

### 1. Prerequisites
- Node.js ≥ 18
- PostgreSQL ≥ 14

### 2. Database setup

```bash
# Create user & database
sudo -u postgres psql
CREATE USER aquamind WITH PASSWORD 'aquamind';
CREATE DATABASE aquamind OWNER aquamind;
\q
```

### 3. Backend

```bash
cd backend
cp .env.example .env
# edit .env if needed

npm install
npm run db:migrate
npm run db:seed
npm run dev
```

API will be available at **http://localhost:4000**

Demo credentials after seed:
- Email: `farmer@grombalia.tn`
- Password: `aquamind2026`

### 4. Main API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | Health check |
| POST | `/api/auth/register` | Create account |
| POST | `/api/auth/login` | Login → JWT |
| GET | `/api/farms` | List farms |
| POST | `/api/farms` | Create farm |
| GET | `/api/farms/:id` | Farm + fields + moisture |
| GET | `/api/farms/:id/weather` | Live weather (Open-Meteo) |
| GET | `/api/farms/:id/irrigation-plan` | Generate AI irrigation plan |
| POST | `/api/sensors/readings` | Ingest sensor data |
| GET | `/api/sensors/field/:id/latest` | Latest readings |
| GET | `/api/alerts` | Active alerts |

### 5. Connecting the existing frontend

In your current frontend (`index.html` or the big inline script), replace simulated data with real API calls.

Example (add near the top of your script):

```js
const API = 'http://localhost:4000/api';   // or your deployed URL

async function loadFarm(farmId) {
  const res = await fetch(`${API}/farms/${farmId}`);
  return res.json();
}

async function loadWeather(farmId) {
  const res = await fetch(`${API}/farms/${farmId}/weather`);
  return res.json();
}

async function loadIrrigationPlan(farmId) {
  const res = await fetch(`${API}/farms/${farmId}/irrigation-plan`);
  return res.json();
}

async function sendSensorReading(deviceId, value, unit = '%') {
  await fetch(`${API}/sensors/readings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ device_id: deviceId, value, unit })
  });
}
```

Then call these functions instead of the hard-coded demo values.

### 6. Sensor → Platform connection

Any ESP32 / LoRa gateway can push data:

```http
POST /api/sensors/readings
Content-Type: application/json

{
  "device_id": "SM-abc12345",
  "value": 37.5,
  "unit": "%"
}
```

---

## Project structure

```
aquamind-platform/
├── backend/
│   ├── src/
│   │   ├── config/          # DB, migrations, seed
│   │   ├── middleware/      # Auth JWT
│   │   ├── routes/          # auth, farms, sensors, alerts
│   │   ├── services/        # weather, irrigation engine
│   │   └── server.js
│   ├── package.json
│   └── .env.example
├── frontend/                # (optional React upgrade later)
├── docs/
└── README.md
```

## Next steps you can take

1. Deploy backend on Railway / Render / a VPS
2. Point the GitHub Pages frontend to the deployed API URL
3. Add MQTT bridge for real LoRaWAN sensors
4. Replace the rule-based irrigation engine with a trained model
5. Add Twilio SMS for the fallback channel

---

Built with ❤️ by IEEE ENSIT SIGHT Group – AquaMind Team
