import fs from 'fs';
import dotenv from 'dotenv';

dotenv.config();

// Load schema
const schema = fs.readFileSync('./database/schema.sql', 'utf8');
const statements = schema
  .split(';')
  .map(s => s.trim())
  .filter(s => s.length > 0 && !s.startsWith('--'));

console.log(`Total statements: ${statements.length}\n`);
console.log('First 15 statements:\n');

for (let i = 0; i < Math.min(15, statements.length); i++) {
  const stmt = statements[i];
  const preview = stmt.substring(0, 80).replace(/\n/g, ' ');
  console.log(`[${i}] ${preview}...`);
}
