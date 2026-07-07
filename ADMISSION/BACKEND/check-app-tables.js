import { Client } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

async function checkTables() {
  const client = new Client({
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    database: process.env.DB_NAME || 'school_erp'
  });

  try {
    await client.connect();
    const result = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema='public' 
      AND table_name LIKE 'application%' 
      ORDER BY table_name
    `);
    console.log('\n📋 Existing application tables:');
    if (result.rows.length === 0) {
      console.log('   No tables found yet');
    } else {
      result.rows.forEach((row, i) => {
        console.log(`   ${i + 1}. ${row.table_name}`);
      });
    }
  } finally {
    await client.end();
  }
}

checkTables();
