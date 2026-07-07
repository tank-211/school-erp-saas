import pool from './config/db.js';

const runSql = async () => {
  try {
    console.log('Checking lead table columns...');
    const result = await pool.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'lead'");
    const rows = result.rows;
    const columns = rows.map(r => r.column_name);
    console.log('Existing columns:', columns);

    const assignedToCol = rows.find(r => r.column_name === 'assigned_to');
    if (assignedToCol && assignedToCol.data_type === 'character varying') {
        console.log('Dropping existing VARCHAR assigned_to column...');
        await pool.query('ALTER TABLE lead DROP COLUMN assigned_to CASCADE');
        console.log('Adding assigned_to as BIGINT FK...');
        await pool.query('ALTER TABLE lead ADD COLUMN assigned_to BIGINT REFERENCES app_user(id) ON DELETE SET NULL');
    } else if (!columns.includes('assigned_to')) {
        console.log('Adding assigned_to as BIGINT FK (not found)...');
        await pool.query('ALTER TABLE lead ADD COLUMN assigned_to BIGINT REFERENCES app_user(id) ON DELETE SET NULL');
    }

    if (!columns.includes('follow_up_date')) {
        console.log('Adding follow_up_date column...');
        await pool.query('ALTER TABLE lead ADD COLUMN follow_up_date DATE');
    }
    
    console.log('✅ SQL fixes applied successfully.');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error applying SQL fixes:', error);
    process.exit(1);
  }
};

runSql();
