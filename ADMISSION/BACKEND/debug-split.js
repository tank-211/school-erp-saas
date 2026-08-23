import fs from 'fs';

const schema = fs.readFileSync('./database/schema.sql', 'utf8');

// Show what happens when we split by semicolon
const parts = schema.split(';');
console.log(` Total parts after split: ${parts.length}`);

console.log('\nFirst 15 parts (truncated):');
for (let i = 0; i < 15; i++) {
  const part = parts[i].trim();
  const preview = part.substring(0, 80).replace(/\n/g, ' ').replace(/  +/g, ' ');
  console.log(`[${i}] ${preview}...`);
}

console.log('\n\nLooking at parts around CREATE TABLE school:');
for (let i = 0; i < parts.length; i++) {
  if (parts[i].includes('CREATE TABLE school')) {
    console.log(`Found at part ${i}`);
    console.log('Previous part:', parts[i-1].substring(0, 60));
    console.log('Current part:', parts[i].substring(0, 60));
    console.log('Next part:', parts[i+1].substring(0, 60));
    break;
  }
}
