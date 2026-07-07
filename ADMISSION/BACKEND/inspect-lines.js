import fs from 'fs';

const schema = fs.readFileSync('./database/schema.sql', 'utf8');
const lines = schema.split('\n');

console.log('Lines around DROP TABLE school and CREATE TABLE academic_year:\n');

// Find the DROP TABLE school line
let startLine = -1;
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('DROP TABLE IF EXISTS school CASCADE')) {
    startLine = i;
    break;
  }
}

console.log(`DROP TABLE school at line ${startLine + 1}`);
console.log('\n--- FOLLOWING 80 LINES ---\n');

for (let i = startLine; i < Math.min(startLine + 80, lines.length); i++) {
  // Show line number, length, and content
  const len = lines[i].length;
  const content = lines[i].substring(0, 100);
  
  if (lines[i].includes('CREATE TABLE') || lines[i].includes('DROP') || lines[i].includes('-- TABLE')) {
    console.log(`Line ${i + 1} [${len}]: *** ${content}`);
  } else if (lines[i].trim() === '') {
    console.log(`Line ${i + 1} [${len}]: (blank)`);
  } else {
    console.log(`Line ${i + 1} [${len}]: ${content}`);
  }
}
