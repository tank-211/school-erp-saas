import { Pool } from 'pg';
import fs from 'fs';
import dotenv from 'dotenv';

dotenv.config();

const appPool = new Pool({
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: 'school_erp',
  connectionTimeoutMillis: 3000
});

const appClient = await appPool.connect();

// Load schema
const schema = fs.readFileSync('./database/schema.sql', 'utf8');
const statements = schema
  .split(';')
  .map(s => s.trim())
  .filter(s => s.length > 0 && !s.startsWith('--'));

console.log(`Total statements: ${statements.length}\n`);

let success = 0, failed = 0;
const failures = [];

for (let i = 0; i < statements.length; i++) {
  try {
    await appClient.query(statements[i]);
    success++;
  } catch (err) {
    failed++;
    failures.push({
      index: i,
      error: err.message,
      statement: statements[i].substring(0, 100)
    });
  }
}

console.log(`\n✅ Success: ${success}, Failed: ${failed}\n`);

if (failures.length > 0) {
  console.log('❌ Failed statements:\n');
  failures.forEach(fail => {
    console.log(`[${fail.index}] ${fail.error}`);
    console.log(`   ${fail.statement.replace(/\n/g, ' ')}\n`);
  });
}

appClient.release();
await appPool.end();
