import pkg from 'pg';
import dotenv from 'dotenv';

const { Pool } = pkg;
dotenv.config();

const pool = new Pool({
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME || 'postgres'
});

async function migrate() {
  const client = await pool.connect();
  try {
    console.log('🔧 Creating application_progress table...');
    
    // Create application_progress table
    const checkApplicationProgress = await client.query(`
      SELECT table_name FROM information_schema.tables 
      WHERE table_name='application_progress'
    `);
    
    if (checkApplicationProgress.rows.length === 0) {
      await client.query(`
        CREATE TABLE application_progress (
          id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
          admission_id BIGINT NOT NULL UNIQUE REFERENCES admission(id) ON DELETE CASCADE,
          student_info_status VARCHAR(50) DEFAULT 'pending' CHECK (student_info_status IN ('pending', 'completed')),
          parent_info_status VARCHAR(50) DEFAULT 'pending' CHECK (parent_info_status IN ('pending', 'completed')),
          academic_details_status VARCHAR(50) DEFAULT 'pending' CHECK (academic_details_status IN ('pending', 'completed')),
          photos_status VARCHAR(50) DEFAULT 'pending' CHECK (photos_status IN ('pending', 'completed')),
          documents_status VARCHAR(50) DEFAULT 'pending' CHECK (documents_status IN ('pending', 'completed')),
          review_status VARCHAR(50) DEFAULT 'pending' CHECK (review_status IN ('pending', 'completed')),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
      
      await client.query(`
        CREATE INDEX idx_application_progress_admission_id ON application_progress(admission_id)
      `);
      
      console.log('✅ Created application_progress table');
    } else {
      console.log('ℹ️  application_progress table already exists');
    }
    
    console.log('🔧 Creating documents table...');
    
    // Create documents table
    const checkDocuments = await client.query(`
      SELECT table_name FROM information_schema.tables 
      WHERE table_name='documents'
    `);
    
    if (checkDocuments.rows.length === 0) {
      await client.query(`
        CREATE TABLE documents (
          id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
          admission_id BIGINT NOT NULL REFERENCES admission(id) ON DELETE CASCADE,
          document_type VARCHAR(100) NOT NULL CHECK (
            document_type IN (
              'student_photo',
              'aadhar_card',
              'birth_certificate',
              'transfer_certificate',
              'previous_marksheet',
              'other'
            )
          ),
          file_name VARCHAR(255) NOT NULL,
          file_path VARCHAR(500) NOT NULL,
          file_size INT,
          mime_type VARCHAR(100),
          uploaded_by VARCHAR(100),
          upload_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
      
      await client.query(`
        CREATE INDEX idx_documents_admission_id ON documents(admission_id)
      `);
      
      await client.query(`
        CREATE INDEX idx_documents_document_type ON documents(document_type)
      `);
      
      console.log('✅ Created documents table');
    } else {
      console.log('ℹ️  documents table already exists');
    }
    
  } catch (error) {
    console.error('❌ Migration error:', error.message);
    console.error('Error code:', error.code);
  } finally {
    await client.end();
    await pool.end();
  }
}

migrate();
