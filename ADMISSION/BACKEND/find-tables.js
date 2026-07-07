import fs from 'fs';

const schema = fs.readFileSync('./database/schema.sql', 'utf8');
const lines = schema.split('\n');

console.log('CREATE TABLE locations:');
lines.forEach((line, idx) => {
  if (line.includes('CREATE TABLE')) {
    console.log(`Line ${idx + 1}: ${line}`);
  }
});

console.log('\n\nFirst CREATE TABLE context (lines 20-50):\n');
lines.slice(20, 50).forEach((line, idx) => {
  console.log(`${21 + idx}: ${line}`);
});
