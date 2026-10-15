# AquaMind API Reference

Base URL: `http://localhost:4000/api`

## Authentication

### Register
```
POST /auth/register
{ "full_name": "Mohamed", "email": "m@example.com", "password": "secret", "phone": "+216..." }
```

### Login
```
POST /auth/login
{ "email": "farmer@grombalia.tn", "password": "aquamind2026" }
→ { user, token }
```

Use header: `Authorization: Bearer <token>`

---

## Farms

| Method | Path | Description |
|--------|------|-------------|
| GET | `/farms` | List farms |
| POST | `/farms` | Create farm (auth) |
| GET | `/farms/:id` | Farm details + fields + latest moisture |
| GET | `/farms/:id/weather` | Current + 5-day forecast (Open-Meteo) |
| GET | `/farms/:id/irrigation-plan` | Generate & store AI irrigation plans |

---

## Sensors

| Method | Path | Description |
|--------|------|-------------|
| POST | `/sensors/readings` | Ingest reading `{ device_id, value, unit }` |
| POST | `/sensors` | Register sensor |
| GET | `/sensors/field/:fieldId/latest` | Latest values per sensor type |
| GET | `/sensors/field/:fieldId/history?hours=24` | Time series |

---

## Alerts

| Method | Path | Description |
|--------|------|-------------|
| GET | `/alerts?farm_id=` | Active alerts |
| PATCH | `/alerts/:id/ack` | Acknowledge alert |
