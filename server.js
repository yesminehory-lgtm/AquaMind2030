require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');

const authRoutes = require('./routes/auth');
const farmRoutes = require('./routes/farms');
const sensorRoutes = require('./routes/sensors');
const alertRoutes = require('./routes/alerts');

const app = express();
const PORT = process.env.PORT || 4000;

// Security & parsing
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({
  origin: [
    process.env.FRONTEND_URL || 'http://localhost:5173',
    'https://yesminehory-lgtm.github.io',
    'http://localhost:3000',
    'http://127.0.0.1:5500',
  ],
  credentials: true,
}));
app.use(express.json({ limit: '1mb' }));
app.use(morgan('dev'));

app.use(rateLimit({
  windowMs: 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
}));

// Health
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'AquaMind API',
    version: '1.0.0',
    time: new Date().toISOString(),
  });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/farms', farmRoutes);
app.use('/api/sensors', sensorRoutes);
app.use('/api/alerts', alertRoutes);

// 404
app.use((_req, res) => res.status(404).json({ error: 'Not found' }));

// Error handler
app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`\n🌱 AquaMind API running on http://localhost:${PORT}`);
  console.log(`   Health:  GET /api/health`);
  console.log(`   Farms:   GET /api/farms`);
  console.log(`   Sensors: POST /api/sensors/readings\n`);
});
