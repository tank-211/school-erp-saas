import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

console.log('🧪 Testing database connection...');
console.log('DB_HOST:', process.env.DB_HOST);
console.log('DB_PORT:', process.env.DB_PORT);
console.log('DB_USER:', process.env.DB_USER);
console.log('DB_NAME:', process.env.DB_NAME);
console.log();

const pool = new Pool({
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME
});

try {
  const client = await pool.connect();
  console.log('✅ Connected to database successfully!');
  
  const result = await client.query('SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = \'public\'');
  console.log(`📊 Tables in public schema: ${result.rows[0].count}`);
  
  const tables = await client.query(`SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name`);
  console.log('\n📋 Tables:');
  tables.rows.forEach((row, idx) => {
    console.log(`   ${idx + 1}. ${row.table_name}`);
  });
  
  await client.end();
  await pool.end();
  
  console.log('\n✅ Test completed!');
  process.exit(0);
} catch (error) {
  console.error('❌ Connection error:', error.message);
  console.error(error);
  process.exit(1);
}
