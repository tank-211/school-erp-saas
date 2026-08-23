import fs from 'fs';

const schema = fs.readFileSync('./database/schema.sql', 'utf8');

// Split by semicolon
const parts = schema.split(';');

console.log(`Total parts after split: ${parts.length}\n`);

// Find where CREATE TABLE school appears
for (let i = 0; i < parts.length; i++) {
  if (parts[i].includes('CREATE TABLE school')) {
    console.log(`✅ Found "CREATE TABLE school" in part ${i}\n`);
    
    console.log(`Part ${i - 1} (previous):`);
    console.log(parts[i - 1].substring(parts[i - 1].length - 100));
    console.log('\n---\n');
    
    console.log(`Part ${i}:`);
    console.log(parts[i].substring(0, 200));
    console.log('\n---\n');
    
    console.log(`Part ${i + 1} (next):`);
    console.log(parts[i + 1].substring(0, 100));
    
    break;
  }
}

// Also check DROP TABLE statements
console.log('\n\nDROP TABLE appearances:');
for (let i = 0; i < parts.length; i++) {
  if (parts[i].includes('DROP TABLE')) {
    const match = parts[i].match(/DROP TABLE IF EXISTS (\w+)/);
    if (match) {
      console.log(`Part ${i}: DROP TABLE ${match[1]}`);
    }
  }
}
