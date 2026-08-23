/**
 * db/pool.js
 * PostgreSQL Connection Pool using pg package
 * 
 * Creates and exports a connection pool with environment variables:
 * DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD
 */

dotenv.config();
import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';
dotenv.config();
console.log('DB ENV:', {
  DB_HOST: process.env.DB_HOST,
  DB_PORT: process.env.DB_PORT,
  DB_USER: process.env.DB_USER,
  DB_PASSWORD: process.env.DB_PASSWORD,
  DB_NAME: process.env.DB_NAME
});

/**
 * Create PostgreSQL connection pool
 * Reads configuration from environment variables
 */
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT) || 5432,
  database: process.env.DB_NAME || 'school_erp',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Log connection success
pool.on('connect', () => {
  console.log('✓ PostgreSQL Client connected to pool');
});

// Handle pool errors
pool.on('error', (err, client) => {
  console.error('❌ Unexpected error on idle client:', err);
});

export default pool;
