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
    console.log('🔧 Updating admission status check constraint...');

    // First, let's check the current constraint
    const constraints = await client.query(`
      SELECT constraint_name FROM information_schema.table_constraints
      WHERE table_name='admission' AND constraint_type='CHECK'
    `);

    console.log('Current constraints:', constraints.rows);

    // Drop the old constraint if it exists
    try {
      await client.query(`
        ALTER TABLE admission DROP CONSTRAINT admission_status_check
      `);
      console.log('✅ Dropped old admission_status_check constraint');
    } catch (e) {
      console.log('ℹ️  No old constraint to drop');
    }

    // Add the new constraint with all statuses
    await client.query(`
      ALTER TABLE admission ADD CONSTRAINT admission_status_check 
      CHECK (status IN ('active', 'on-leave', 'suspended', 'withdrawn', 'draft', 'submitted'))
    `);

    console.log('✅ Updated admission_status_check constraint with draft and submitted statuses');

    // Also ensure admission_type_check allows all types
    try {
      await client.query(`
        ALTER TABLE admission DROP CONSTRAINT admission_type_check
      `);
      console.log('✅ Dropped old admission_type_check constraint');
    } catch (e) {
      console.log('ℹ️  No old admission_type_check constraint to drop');
    }

    await client.query(`
      ALTER TABLE admission ADD CONSTRAINT admission_type_check 
      CHECK (admission_type IN ('new', 'transfer', 'regular'))
    `);

    console.log('✅ Updated admission_type_check constraint');

  } catch (error) {
    console.error('❌ Migration error:', error.message);
  } finally {
    await client.end();
    await pool.end();
  }
}

migrate();
