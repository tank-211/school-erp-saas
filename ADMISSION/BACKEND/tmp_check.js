import pool from './config/db.js';
async function test() {
  try {
    const res1 = await pool.query("SELECT channel, COUNT(*) FROM communication_log GROUP BY channel LIMIT 10");
    console.log('Channels:', res1.rows);
    const res2 = await pool.query("SELECT * FROM communication_log LIMIT 5");
    console.log('Logs:', res2.rows);
    const res3 = await pool.query("SELECT * FROM campaign LIMIT 5");
    console.log('Campaigns:', res3.rows);
  } catch (err) {
    console.error(err);
  } finally {
    process.exit();
  }
}
test();
