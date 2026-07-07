import { Client } from 'pg';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

async function runApplicationMigration() {
  console.log('\n🚀 APPLICATION SCHEMA MIGRATION\n');
  
  const dbName = process.env.DB_NAME || 'school_erp';
  
  // Connect to database
  const client = new Client({
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    database: dbName
  });

  try {
    console.log('📡 Connecting to database...');
    await client.connect();
    console.log('✅ Connected\n');

    // Read SQL file
    console.log('📄 Reading application schema...');
    const sqlPath = path.join(process.cwd(), 'database', 'application_schema.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    console.log('✅ Schema loaded\n');

    // Split statements by semicolon
    console.log('🔨 Executing migration statements...\n');
    const statements = sql
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0);

    let statementCount = 0;
    for (const statement of statements) {
      try {
        await client.query(statement);
        statementCount++;
        console.log(`✅ Statement ${statementCount} executed`);
      } catch (err) {
        console.error(`❌ Statement ${statementCount} failed:`);
        console.error(`   Error: ${err.message}`);
        console.error(`   SQL: ${statement.substring(0, 100)}...`);
        throw err;
      }
    }

    console.log(`\n✅ Migration completed successfully!`);
    console.log(`📊 Total statements executed: ${statementCount}\n`);

    // Verify tables were created
    console.log('🔍 Verifying created tables...\n');
    const tablesResult = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name LIKE 'application%'
      ORDER BY table_name
    `);

    if (tablesResult.rows.length > 0) {
      console.log('📋 Application tables created:');
      tablesResult.rows.forEach((row, i) => {
        console.log(`   ${i + 1}. ${row.table_name}`);
      });
    } else {
      console.warn('⚠️  No application tables found');
    }

    console.log('\n🎉 Migration ready for use!\n');

  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

runApplicationMigration();
