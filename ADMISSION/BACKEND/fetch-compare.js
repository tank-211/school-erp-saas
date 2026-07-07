import pool from './db/pool.js';
import bcrypt from 'bcryptjs';

async function run(){
  const res = await pool.query('SELECT password_hash FROM app_user WHERE email=$1', ['admin@test.com']);
  const hash = res.rows[0].password_hash;
  console.log('DB hash:', hash);
  console.log('compareSync:', bcrypt.compareSync('123456', hash));
  await pool.end();
}

run().catch(err=>{console.error(err); process.exit(1)});
