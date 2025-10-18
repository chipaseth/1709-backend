require('dotenv').config();
const express = require('express');
const cors = require('cors');
const pool = require('./models/db');

const app = express();

// CORS: prefer explicit FRONTEND_URL if set, otherwise allow common local dev origins
const allowedOrigins = process.env.FRONTEND_URL
  ? [process.env.FRONTEND_URL]
  : ['http://localhost:5173', 'http://localhost:3000', 'http://127.0.0.1:5173'];

// --- changed code: robust origin check and explicit preflight handling ---
app.use(cors({
  origin: (origin, callback) => {
    // origin is undefined for server-side requests (curl, Postman) — allow those
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    return callback(new Error(`CORS blocked: origin ${origin} not allowed`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'X-Requested-With']
}));

// ensure OPTIONS preflight returns correct headers quickly
app.options('*', cors());

// Body parsers
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// Basic request logging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} ${req.method} ${req.originalUrl}`);
  next();
});

// Health check
app.get('/api/health', async (req, res) => {
  try {
    const result = await pool.query('SELECT NOW()');
    res.json({
      status: 'ok',
      timestamp: result.rows[0].now,
      database: 'connected',
      env_vars: {
        DATABASE_URL: process.env.DATABASE_URL ? 'set' : 'not set',
        PG_CRYPTO_KEY: process.env.PG_CRYPTO_KEY ? 'set' : 'not set'
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      error: error.message,
      database: 'disconnected'
    });
  }
});

// Quick DB test
app.get('/api/test-db', async (req, res) => {
  try {
    const customersResult = await pool.query(`SELECT COUNT(*) as count FROM customers`);
    const ordersResult = await pool.query(`SELECT COUNT(*) as count FROM orders`);
    const extensionResult = await pool.query(`SELECT COUNT(*) as count FROM pg_extension WHERE extname = 'pgcrypto'`);

    res.json({
      customers_table: Number(customersResult.rows[0].count),
      orders_table: Number(ordersResult.rows[0].count),
      pgcrypto_extension: extensionResult.rows[0].count > 0,
      status: 'ok'
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      error: error.message
    });
  }
});

// Route mounting
// Note: if your webhook provider requires the raw request body for signature verification,
// replace the webhooks mount with:
// app.use('/api/webhooks', express.raw({ type: '*/*' }), require('./routes/webhooks'));
app.use('/api/orders', require('./routes/orders'));
app.use('/api/customers', require('./routes/customers'));
app.use('/api/webhooks', require('./routes/webhooks'));

// Basic error handler
app.use((err, req, res, next) => {
  console.error(err && err.stack ? err.stack : err);
  res.status(500).json({ error: 'Something broke!' });
});

// Start server
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`Backend running on port ${PORT}`));
