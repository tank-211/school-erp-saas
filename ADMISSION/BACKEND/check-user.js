import pool from './db/pool.js';

const email = process.argv[2] || 'admin@test.com';

async function run(){
  const res = await pool.query('SELECT id, email, status, password_hash FROM app_user WHERE email=$1', [email]);
  console.log(res.rows);
  await pool.end();
}

run().catch(err=>{console.error(err); process.exit(1)});
