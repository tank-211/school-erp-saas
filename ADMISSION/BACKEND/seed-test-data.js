import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

async function seedData() {
  const pool = new Pool({
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    database: process.env.DB_NAME || 'school_erp'
  });

  const client = await pool.connect();

  try {
    console.log('\n🌱 Seeding test data...\n');

    // 1. Create test school
    console.log('1️⃣ Creating test school...');
    await client.query(`
      INSERT INTO school (name, email, phone, address, city, state, postal_code, country, principal_name, status, created_by)
      VALUES ('Test School', 'school@test.com', '+91 9999999999', 'Test Address', 'Test City', 'Test State', '100001', 'India', 'Principal Name', 'active', 'system')
      ON CONFLICT (name) DO NOTHING
    `);
    console.log('✅ Test school created\n');

    // 2. Create academic year
    console.log('2️⃣ Creating academic year...');
    await client.query(`
      INSERT INTO academic_year (school_id, year_name, start_date, end_date, is_active, status, created_by)
      VALUES (1, '2025-26', '2025-04-01', '2026-03-31', true, 'active', 'system')
      ON CONFLICT (school_id, year_name) DO NOTHING
    `);
    console.log('✅ Academic year created\n');

    // 3. Create test user - password "123456" pre-hashed with bcrypt
    // Hash: $2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcg7b3XeKeUxWdeS86E36DxYBfq
    console.log('3️⃣ Creating test user...');
    await client.query(`
      INSERT INTO app_user (school_id, name, email, password_hash, role, status, created_by)
      VALUES (
        1,
        'Admin User',
        'admin@test.com',
        '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcg7b3XeKeUxWdeS86E36DxYBfq',
        'admin',
        'active',
        'system'
      )
      ON CONFLICT (email) DO NOTHING
    `);
    console.log('✅ Test user created\n');

    console.log('📋 Test Credentials:');
    console.log('   Email: admin@test.com');
    console.log('   Password: 123456\n');

    console.log('✅ Seed data completed!\n');

  } catch (error) {
    console.error('❌ Error seeding data:', error.message);
    throw error;
  } finally {
    await client.end();
    await pool.end();
  }
}

seedData().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
