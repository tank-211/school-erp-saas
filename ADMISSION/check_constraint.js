import pool from './backend/config/db.js';

async function check() {
  try {
    const r = await pool.query("SELECT pg_get_constraintdef(oid) FROM pg_constraint WHERE conname = 'admission_status_check';");
    console.log(r.rows);
  } finally {
    pool.end();
  }
}

check();
