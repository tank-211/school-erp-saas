import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

/**
 * PostgreSQL Connection Pool Configuration
 * 
 * This module creates and exports a connection pool to PostgreSQL
 * using the pg package. The pool manages multiple connections
 * and provides better performance than individual connections.
 */

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME || 'postgres',
  min: parseInt(process.env.DB_POOL_MIN) || 2,
  max: parseInt(process.env.DB_POOL_MAX) || 10,
  idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT) || 30000,
  connectionTimeoutMillis: parseInt(process.env.DB_CONNECTION_TIMEOUT) || 10000,
  // Add query timeout
  statement_timeout: 30000,
  // Add SSL option for compatibility
  ssl: false,
});

// Handle pool connection errors
pool.on('error', (err, client) => {
  console.error('⚠️ Unexpected error on idle client:', err.message);
  // Don't exit immediately - allow the app to keep running
  // process.exit(-1);
});

pool.on('connect', () => {
  console.log('✓ Client connected to PostgreSQL pool');
});

// Test the connection when the application starts
pool.query('SELECT NOW()', (err, result) => {
  if (err) {
    console.error('❌ Database Connection Error:', err.message);
    console.error('\n📋 Connection Details:');
    console.error('   Host:', process.env.DB_HOST || 'localhost');
    console.error('   Port:', process.env.DB_PORT || 5432);
    console.error('   User:', process.env.DB_USER || 'postgres');
    console.error('   Database:', process.env.DB_NAME || 'postgres');
    console.error('\n💡 Troubleshooting:');
    console.error('   1. Ensure PostgreSQL is running: services.msc → postgresql-x64-17');
    console.error('   2. Verify database exists: CREATE DATABASE school_erp;');
    console.error('   3. Check credentials in .env file');
    console.error('   4. Ensure user "postgres" has access to "school_erp" database');
    console.error('\n');
    // Don't exit - allow server to start and handle graceful reconnection
  } else {
    console.log('✅ PostgreSQL Database Connected Successfully');
    console.log('   Database:', process.env.DB_NAME);
    console.log('   Host:', process.env.DB_HOST);
    console.log('   Time from DB:', result.rows[0].now);
  }
});

/**
 * Query method with error handling
 * 
 * @param {string} text - SQL query
 * @param {array} params - Query parameters
 * @returns {Promise} Query result
 */
pool.queryAsync = async (text, params) => {
  const start = Date.now();
  try {
    const result = await pool.query(text, params);
    const duration = Date.now() - start;
    console.log('Executed query', { text, duration, rows: result.rowCount });
    return result;
  } catch (error) {
    console.error('Database query error:', {
      text,
      error: error.message,
      detail: error.detail
    });
    throw error;
  }
};

export default pool; 
