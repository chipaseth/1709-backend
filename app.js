require('dotenv').config();
const express = require('express');
const app = express();
const cors = require('cors');
const pool = require('./models/db');

app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:3000', 'http://127.0.0.1:5173'],
  credentials: true
}));
app.use(express.json());
+ // allow larger JSON payloads (adjust as needed)
+ app.use(express.json({ limit: '1mb' }));
+ app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// Add some basic logging
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path}`);
  next();
});

// Health check endpoint
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

// Test endpoint to check if tables exist
app.get('/api/test-db', async (req, res) => {
  try {
    // Check if customers table exists
    const customersResult = await pool.query(`
      SELECT COUNT(*) as count FROM customers
    `);
    
    // Check if orders table exists
    const ordersResult = await pool.query(`
      SELECT COUNT(*) as count FROM orders
    `);
    
    // Check if pgcrypto extension is installed
    const extensionResult = await pool.query(`
      SELECT COUNT(*) as count FROM pg_extension WHERE extname = 'pgcrypto'
    `);
    
    res.json({
      customers_table: customersResult.rows[0].count,
      orders_table: ordersResult.rows[0].count,
      pgcrypto_extension: extensionResult.rows[0].count > 0,
      status: 'ok'
    });
  } catch (error) {
    res.status(500).json({
      error: error.message,
      status: 'error'
    });
  }
});

app.use('/api/orders', require('./routes/orders'));
app.use('/api/customers', require('./routes/customers'));
app.use('/api/webhooks', require('./routes/webhooks'));

// Basic error handling
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something broke!' });
});

app.listen(4000, () => console.log('Backend running on port 4000'));
