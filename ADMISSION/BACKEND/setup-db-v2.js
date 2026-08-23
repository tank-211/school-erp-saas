import { Pool, Client } from 'pg';
import fs from 'fs';
import dotenv from 'dotenv';

dotenv.config();

async function setupDatabase() {
  console.log('\n 🔧 SCHOOL ERP DATABASE SETUP\n');
  
  const dbName = process.env.DB_NAME || 'school_erp';
  const adminClient = new Client({
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    database: 'postgres'
  });

  try {
    // Connect as admin to postgres database
    console.log('1️⃣  Connecting to PostgreSQL admin...');
    await adminClient.connect();
    console.log('✅ Connected\n');

    // Create database if not exists
    console.log(`2️⃣  Creating database '${dbName}' if not exists...`);
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

    // Now connect to the app database and execute schema
    console.log(`3️⃣  Connecting to '${dbName}' database...`);
    const appClient = new Client({
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      host: process.env.DB_HOST,
      port: process.env.DB_PORT,
      database: dbName
    });

    await appClient.connect();
    console.log('✅ Connected\n');

    // Read schema file
    console.log('4️⃣  Reading schema.sql file...');
    let schema = fs.readFileSync('./database/schema.sql', 'utf8');
    console.log(`✅ File loaded (${Math.round(schema.length / 1024)}KB)\n`);

    // Use a regex-based approach to split statements more carefully
    // Split by semicolon but be careful with dollar-quoted strings
    console.log('5️⃣  Executing SQL statements...\n');

    const statements = [];
    let current = '';
    let inDollarQuote = false;
    let dollarQuoteTag = '';

    for (let i = 0; i < schema.length; i++) {
      const char = schema[i];
      const nextChar = schema[i + 1];

      // Detect dollar quote start/end
      if (char === '$' && (i === 0 || schema[i - 1] !== '\\')) {
        // Look for dollar Quote pattern
        const rest = schema.substring(i);
        const dollarMatch = rest.match(/^\$[a-zA-Z0-9_]*\$/);
        
        if (dollarMatch) {
          const tag = dollarMatch[0];
          if (inDollarQuote && tag === dollarQuoteTag) {
            inDollarQuote = false;
            current += tag;
            i += tag.length - 1;
          } else if (!inDollarQuote) {
            inDollarQuote = true;
            dollarQuoteTag = tag;
            current += tag;
            i += tag.length - 1;
          }
          continue;
        }
      }

      current += char;

      // Check for statement end (semicolon outside dollar quotes)
      if (char === ';' && !inDollarQuote) {
        const stmt = current.trim();
        if (stmt && !stmt.startsWith('--')) {
          statements.push(stmt);
        }
        current = '';
      }
    }

    // Add any remaining statement
    if (current.trim() && !current.trim().startsWith('--')) {
      statements.push(current.trim());
    }

    console.log(`📊 Total SQL statements parsed: ${statements.length}\n`);

    let successCount = 0;
    let failCount = 0;
    const failures = [];

    for (let i = 0; i < statements.length; i++) {
      try {
        await appClient.query(statements[i]);
        successCount++;
        
        // Show progress every 20 statements
        if ((i + 1) % 20 === 0) {
          console.log(`  ✓ ${i + 1}/${statements.length} executed`);
        }
      } catch (error) {
        failCount++;
        failures.push({
          index: i,
          error: error.message,
          statement: statements[i].substring(0, 60)
        });
        
        //Log errors immediately
        if (failCount <= 10) {
          console.log(`  ❌ [${i}] ${error.message.substring(0, 50)}`);
        }
      }
    }

    console.log(`\n✅ Execution complete: ${successCount} succeeded, ${failCount} failed\n`);

    // Verify tables were created
    console.log('6️⃣  Verifying tables...\n');
    const result = await appClient.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);

    const tableCount = result.rows.length;
    console.log(`📊 Tables created: ${tableCount}\n`);

    if (tableCount > 0) {
      console.log('📋 Tables:');
      result.rows.forEach((row, idx) => {
        console.log(`   ${idx + 1}. ${row.table_name}`);
      });
    }

    await appClient.end();

    console.log('\n✅ Database setup completed successfully!\n');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    if (error.detail) console.error('Details:', error.detail);
    process.exit(1);
  }
}

// Run setup
setupDatabase().catch(error => {
  console.error('Unhandled error:', error);
  process.exit(1);
});
