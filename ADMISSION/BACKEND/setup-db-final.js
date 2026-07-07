import { Pool, Client } from 'pg';
import fs from 'fs';
import dotenv from 'dotenv';

dotenv.config();

async function setupDatabase() {
  console.log('\n🔧 SCHOOL ERP DATABASE SETUP\n');
  
  const dbName = process.env.DB_NAME || 'school_erp';
  const adminClient = new Client({
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    database: 'postgres'
  });

  try {
    // Step 1: Connect and create database
    console.log('1️⃣ Creating database...');
    await adminClient.connect();
    
    try {
      await adminClient.query(`CREATE DATABASE ${dbName}`);
      console.log('✅ Database created\n');
    } catch (error) {
      if (error.code === '42P04') {
        console.log('✅ Database already exists\n');
      } else {
        throw error;
      }
    }
    await adminClient.end();

    // Step 2: Connect to app database and execute schema
    console.log(`2️⃣ Loading schema...\n`);
    const appClient = new Client({
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      host: process.env.DB_HOST,
      port: process.env.DB_PORT,
      database: dbName
    });
    await appClient.connect();

    // Read file and parse intelligently
    const schema = fs.readFileSync('./database/schema.sql', 'utf8');
    
    // Split by semicolon and remove SQL comments AFTER splitting
    const statements = schema
      .split(';')
      .map(stmt => {
        // Remove line comments (-- comment)
        const lines = stmt.split('\n');
        const cleaned = lines
          .map(line => {
            const commentIdx = line.indexOf('--');
            return commentIdx === -1 ? line : line.substring(0, commentIdx);
          })
          .join('\n')
          .trim();
        return cleaned;
      })
      .filter(stmt => stmt.length > 0);

    console.log(`3️⃣ Executing ${statements.length} SQL statements...\n`);

    let successCount = 0, failCount = 0;
    const failures = [];

    for (let i = 0; i < statements.length; i++) {
      try {
        await appClient.query(statements[i]);
        successCount++;
        
        if ((i + 1) % 30 === 0) {
          console.log(`  ✓ ${i + 1}/${statements.length}`);
        }
      } catch (error) {
        failCount++;
        if (failCount <= 5) {
          console.log(`  ❌ [${i}] ${error.message.substring(0, 50)}`);
        }
        failures.push({ index: i, error: error.message });
      }
    }

    console.log(`\n✅ Execution complete: ${successCount} succeeded, ${failCount} failed\n`);

    // Step 3: Verify
    console.log('4️⃣ Verifying tables...\n');
    const result = await appClient.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);

    const count = result.rows.length;
    console.log(`📊 Tables created: ${count}\n`);

    if (count > 0) {
      console.log('📋 Table list:');
      result.rows.forEach((row, idx) => {
        console.log(`   ${idx + 1}. ${row.table_name}`);
      });
    }

    await appClient.end();
    console.log('\n✅ Database setup completed!\n');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  }
}

setupDatabase().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
