import { Client } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

async function createMissingTables() {
  const client = new Client({
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    database: process.env.DB_NAME || 'school_erp'
  });

  try {
    await client.connect();
    
    console.log('📄 Creating missing application_photos table...\n');
    
    // Create photos table
    await client.query(`
      CREATE TABLE IF NOT EXISTS application_photos (
        id SERIAL PRIMARY KEY,
        application_id INTEGER NOT NULL REFERENCES application(id) ON DELETE CASCADE,
        photo_url VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✅ application_photos table created');

    // Create index if it doesn't exist
    try {
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_application_photos_app_id 
        ON application_photos(application_id)
      `);
      console.log('✅ Index created');
    } catch (err) {
      if (err.message.includes('already exists')) {
        console.log('ℹ️  Index already exists');
      } else {
        throw err;
      }
    }

    console.log('\n✅ All application tables are now ready!\n');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

createMissingTables();
