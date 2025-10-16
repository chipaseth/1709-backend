const { Pool } = require('pg');

// Get the database URL from environment or use a default
const databaseUrl = process.env.DATABASE_URL || 'postgresql://postgres:password@localhost:5432/1709coza';

console.log('Database URL:', databaseUrl.replace(/\/\/.*@/, '//***:***@')); // Log without credentials

const pool = new Pool({ 
  connectionString: databaseUrl
});

// Test the connection
pool.on('connect', () => {
  console.log('Connected to database');
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
  // Don't exit the process, just log the error
});

module.exports = pool;
