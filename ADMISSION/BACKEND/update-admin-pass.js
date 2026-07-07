import pool from './db/pool.js';
import bcrypt from 'bcryptjs';

async function run(){
  const pwd = '123456';
  const hash = await bcrypt.hash(pwd, 10);
  console.log('New hash:', hash);
  const res = await pool.query('UPDATE app_user SET password_hash=$1 WHERE email=$2 RETURNING id,email', [hash, 'admin@test.com']);
  console.log('Updated:', res.rows);
  await pool.end();
}

run().catch(err=>{console.error(err); process.exit(1)});
