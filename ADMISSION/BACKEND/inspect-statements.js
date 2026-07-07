import fs from 'fs';

const schema = fs.readFileSync('./database/schema.sql', 'utf8');

const statements = [];
let current = '';
let inDollarQuote = false;
let dollarQuoteTag = '';

for (let i = 0; i < schema.length; i++) {
  const char = schema[i];

  // Detect dollar quote start/end
  if (char === '$' && (i === 0 || schema[i - 1] !== '\\')) {
    const rest = schema.substring(i);
    const dollarMatch = rest.match(/^\$[a-zA-Z0-9_]*\$/);
    
    if (dollarMatch) {
      const tag = dollarMatch[0];
      if (inDollarQuote && tag === dollarQuoteTag) {
        inDollarQuote = false;
        current += tag;
        i += tag.length - 1;
      } else if (!inDollarQuote) {
        inDollarQuote = true;
        dollarQuoteTag = tag;
        current += tag;
        i += tag.length - 1;
      }
      continue;
    }
  }

  current += char;

  if (char === ';' && !inDollarQuote) {
    const stmt = current.trim();
    if (stmt && !stmt.startsWith('--')) {
      statements.push(stmt);
    }
    current = '';
  }
}

if (current.trim() && !current.trim().startsWith('--')) {
  statements.push(current.trim());
}

// Write all statements to a file for inspection
const output = statements.map((stmt, idx) => {
  const preview = stmt.substring(0, 120).replace(/\n/g, ' ').replace(/  +/g, ' ');
  return `[${idx}] ${preview}...`;
}).join('\n');

fs.writeFileSync('./parsed-statements.txt', output);
console.log(`✅ Wrote ${statements.length} statements to parsed-statements.txt`);

// Also find CREATE TABLE
console.log('\nCREATE TABLE statements:');
statements.forEach((stmt, idx) => {
  if (stmt.includes('CREATE TABLE')) {
    console.log(`[${idx}] ${stmt.substring(0, 80)}...`);
  }
});
