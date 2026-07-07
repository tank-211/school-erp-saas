import { Pool } from 'pg';
import fs from 'fs';
import dotenv from 'dotenv';

dotenv.config();

console.log('\n=== DATABASE SETUP ===\n');

// Test 1: Admin connection
console.log('1️⃣  Testing admin connection to postgres...');
const adminPool = new Pool({
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: 'postgres',
  connectionTimeoutMillis: 3000
});

try {
  const adminClient = await adminPool.connect();
  console.log('✅ Admin connected\n');
  adminClient.release();
} catch (error) {
  console.error('❌ Admin connection failed:', error.message);
  process.exit(1);
}

// Test 2: App database connection
console.log('2️⃣  Testing connection to school_erp database...');
const appPool = new Pool({
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: 'school_erp',
  connectionTimeoutMillis: 3000
});

try {
  const appClient = await appPool.connect();
  console.log('✅ App connected\n');
  
  // Check existing tables
  const result =  await appClient.query(
    `SELECT COUNT(*) as count FROM information_schema.tables WHERE table_schema = 'public'`
  );
  console.log(`3️⃣  Tables in database: ${result.rows[0].count}\n`);
  
  // Load schema
  console.log('4️⃣  Loading schema.sql...');
  const schema = fs.readFileSync('./database/schema.sql', 'utf8');
  const statements = schema
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--'));
  
  console.log(`✅ Schema loaded: ${statements.length} statements\n`);
  
  // Execute statements
  console.log('5️⃣  Executing statements...');
  let success = 0, failed = 0;
  
  for (let i = 0; i < statements.length; i++) {
    try {
      await appClient.query(statements[i]);
      success++;
      if (i % 10 === 0) console.log(`  ${i}/${statements.length} executed`);
    } catch (err) {
      failed++;
      if (failed <= 5) {
        console.log(`  ❌ [${i}] ${err.message.substring(0, 50)}`);
      }
    }
  }
  
  console.log(`\n✅ Done: ${success} succeeded, ${failed} failed\n`);
  
  // Verify tables
  const verify = await appClient.query(
    `SELECT COUNT(*) as count FROM information_schema.tables WHERE table_schema = 'public'`
  );
  console.log(`6️⃣  Final table count: ${verify.rows[0].count}\n`);
  
  if (verify.rows[0].count > 0) {
    const tables = await appClient.query(
      `SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name`
    );
    console.log('📋 Tables created:');
    tables.rows.forEach((row, idx) => {
      console.log(`   ${idx + 1}. ${row.table_name}`);
    });
  }
  
  appClient.release();
  
} catch (error) {
  console.error('❌ Error:', error.message);
} finally {
  await adminPool.end();
  await appPool.end();
  console.log('\n✅ Done!\n');
  process.exit(0);
}
