import pkg from 'pg';
import dotenv from 'dotenv';

const { Pool } = pkg;
dotenv.config();

const pool = new Pool({
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME || 'postgres'
});

async function migrate() {
  const client = await pool.connect();
  try {
    console.log('🔧 Adding lead_id column to admission table...');
    
    // Check if column already exists
    const checkColumn = await client.query(`
      SELECT column_name FROM information_schema.columns 
      WHERE table_name='admission' AND column_name='lead_id'
    `);
    
    if (checkColumn.rows.length > 0) {
      console.log('✅ lead_id column already exists');
      return;
    }
    
    // Add the column
    await client.query(`
      ALTER TABLE admission ADD COLUMN lead_id BIGINT REFERENCES lead(id) ON DELETE SET NULL
    `);
    
    // Create index for better query performance
    await client.query(`
      CREATE INDEX idx_admission_lead_id ON admission(lead_id)
    `);
    
    console.log('✅ Successfully added lead_id column and index');
  } catch (error) {
    console.error('❌ Migration error:', error.message);
  } finally {
    await client.end();
    await pool.end();
  }
}

migrate();
