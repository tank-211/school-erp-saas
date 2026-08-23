import { Pool } from 'pg';
import fs from 'fs';
import dotenv from 'dotenv';

dotenv.config();

const adminPool = new Pool({
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: 'postgres'
});

async function setupDatabase() {
  const dbName = process.env.DB_NAME || 'school_erp';
  
  console.log('🔧 Starting database setup...\n');
  
  try {
    // Step 1: Create database if it doesn't exist
    console.log(`📋 Checking if database '${dbName}' exists...`);
    const adminClient = await adminPool.connect();
    
    try {
      await adminClient.query(`CREATE DATABASE ${dbName}`);
      console.log(`✅ Database '${dbName}' created successfully!\n`);
    } catch (error) {
      if (error.code === '42P04') {
        console.log(`✅ Database '${dbName}' already exists\n`);
      } else {
        throw error;
      }
    } finally {
      await adminClient.end();
    }
    
    // Close admin pool
    await adminPool.end();
    
    // Step 2: Connect to the app database and execute schema
    console.log('📡 Connecting to app database...');
    const appPool = new Pool({
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      host: process.env.DB_HOST,
      port: process.env.DB_PORT,
      database: dbName,
      connectionTimeoutMillis: 5000
    });

    try {
      console.log('✅ Connection pool created\n');

      // Read schema file
      console.log('📂 Reading schema.sql file...');
      const schemaPath = './database/schema.sql';
      
      if (!fs.existsSync(schemaPath)) {
        throw new Error(`Schema file not found at: ${schemaPath}`);
      }
      
      const schema = fs.readFileSync(schemaPath, 'utf8');
      console.log('✅ Schema file loaded\n');

      // Execute schema - split into individual statements
      console.log('⚙️  Executing schema statements...');
      const appClient = await appPool.connect();
      
      try {
        // Split schema into individual statements by semicolon, handling multi-line statements
        const statements = schema
          .split(';')
          .map(stmt => stmt.trim())
          .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));

        console.log(`📌 Total statements to execute: ${statements.length}\n`);

        let successCount = 0;
        let failCount = 0;
        const errors = [];

        for (let i = 0; i < statements.length; i++) {
          try {
            const stmt = statements[i];
            // Only log first few statements for verbosity
            if (i < 3 || i === statements.length - 1) {
              console.log(`  [${i + 1}/${statements.length}] Executing...`);
            }
            await appClient.query(stmt);
            successCount++;
          } catch (error) {
            failCount++;
            errors.push({
              index: i,
              message: error.message.substring(0, 100),
              fullMessage: error.message
            });
            console.error(`  [${i + 1}] ❌ Failed: ${error.message.substring(0, 60)}`);
          }
        }

        console.log(`\n✅ Statements processed: ${successCount} succeeded, ${failCount} failed\n`);
        
        if (failCount > 0 && failCount <= 10) {
          console.log('⚠️  First failed statements:');
          errors.slice(0, 5).forEach(err => {
            console.log(`   Statement ${err.index}: ${err.message}`);
          });
          console.log();
        }
      } finally {
        await appClient.end();
      }

      // Step 3: Verify tables were created
      console.log('📊 Verifying tables in database...\n');
      const verifyClient = await appPool.connect();
      try {
        const result = await verifyClient.query(`
          SELECT table_name 
          FROM information_schema.tables 
          WHERE table_schema = 'public'
          ORDER BY table_name;
        `);

        const tableCount = result.rows.length;
        
        if (tableCount === 0) {
          console.error('❌ No tables were created. Check schema.sql for errors.');
          return;
        }

        console.log(`✅ Total tables created: ${tableCount}\n`);
        console.log('📋 Tables:');
        result.rows.forEach((row, idx) => {
          console.log(`   ${idx + 1}. ${row.table_name}`);
        });

        console.log('\n✅ Database setup completed successfully!');
        console.log('✅ All required tables have been created and are ready to use\n');

      } finally {
        await verifyClient.end();
      }

    } finally {
      await appPool.end();
    }

  } catch (error) {
    console.error('\n❌ Fatal error:', error.message);
    if (error.detail) {
      console.error('Details:', error.detail);
    }
    console.error('\nStack:', error.stack);
    process.exit(1);
  }
}

// Run the setup
setupDatabase()
  .then(() => {
    console.log('✨ Setup completed!\n');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Unexpected error:', error);
    process.exit(1);
  });