import { Client } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

async function debugApplicationSetup() {
  const client = new Client({
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    database: process.env.DB_NAME || 'school_erp'
  });

  try {
    await client.connect();
    
    console.log('\n' + '='.repeat(60));
    console.log('DEBUG: Application Creation Setup');
    console.log('='.repeat(60) + '\n');

    // Check schools
    console.log('📍 SCHOOLS (needed for school_id in JWT):');
    const schools = await client.query('SELECT id, name FROM school LIMIT 5');
    if (schools.rows.length === 0) {
      console.log('   ⚠️  NO SCHOOLS FOUND - Create a school first!');
    } else {
      schools.rows.forEach(s => console.log(`   - ID: ${s.id}, Name: ${s.name}`));
    }
    
    // Check academic years
    console.log('\n📚 ACADEMIC YEARS (needed for academic_year_id):');
    const years = await client.query('SELECT id, year_name FROM academic_year LIMIT 5');
    if (years.rows.length === 0) {
      console.log('   ⚠️  NO ACADEMIC YEARS FOUND - Create an academic year first!');
    } else {
      years.rows.forEach(y => console.log(`   - ID: ${y.id}, Year: ${y.year_name}`));
    }
    
    // Check leads
    console.log('\n👥 LEADS (needed for lead_id):');
    const leads = await client.query(
      'SELECT id, first_name, last_name, email FROM lead LIMIT 5'
    );
    if (leads.rows.length === 0) {
      console.log('   ⚠️  NO LEADS FOUND - Add a lead first!');
    } else {
      leads.rows.forEach(l => console.log(`   - ID: ${l.id}, Name: ${l.first_name} ${l.last_name}, Email: ${l.email}`));
    }

    // Check if application table exists
    console.log('\n🗂️  APPLICATION TABLE:');
    const appTable = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'application'
      ) as exists;
    `);
    if (appTable.rows[0].exists) {
      console.log('   ✅ application table exists');
      
      // Check existing applications
      const apps = await client.query(
        'SELECT id, lead_id, academic_year_id, status FROM application LIMIT 3'
      );
      if (apps.rows.length > 0) {
        console.log(`   📊 Existing applications: ${apps.rows.length}`);
        apps.rows.forEach(a => {
          console.log(`      - ID: ${a.id}, Lead: ${a.lead_id}, Year: ${a.academic_year_id}, Status: ${a.status}`);
        });
      } else {
        console.log('   (No applications yet)');
      }
    } else {
      console.log('   ❌ application table DOES NOT exist!');
    }

    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('CHECKLIST:');
    console.log('='.repeat(60));
    console.log(schools.rows.length > 0 ? '✅ Schools exist' : '❌ Add schools');
    console.log(years.rows.length > 0 ? '✅ Academic years exist' : '❌ Add academic years');
    console.log(leads.rows.length > 0 ? '✅ Leads exist' : '❌ Add leads');
    console.log(appTable.rows[0].exists ? '✅ Application table exists' : '❌ Run migration');
    console.log('\n');

    // Suggest IDs to use
    if (schools.rows.length > 0 && years.rows.length > 0 && leads.rows.length > 0) {
      console.log('👉 RECOMMENDED TEST VALUES:');
      console.log(`   - School ID: ${schools.rows[0].id}`);
      console.log(`   - Academic Year ID: ${years.rows[0].id}`);
      console.log(`   - Lead ID: ${leads.rows[0].id}`);
      console.log('\n   These values should be in your JWT token and form submission');
    }

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await client.end();
  }
}

debugApplicationSetup();
