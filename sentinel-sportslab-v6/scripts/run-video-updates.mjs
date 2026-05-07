import { readFileSync, readdirSync } from 'fs';

// Read all batch files and combine into one big SQL
const files = readdirSync('./data')
  .filter(f => f.startsWith('video-update-batch-') && f.endsWith('.sql'))
  .sort((a, b) => {
    const numA = parseInt(a.match(/\d+/)[0]);
    const numB = parseInt(b.match(/\d+/)[0]);
    return numA - numB;
  });

let allSql = '';
for (const file of files) {
  allSql += readFileSync(`./data/${file}`, 'utf-8') + '\n';
}

// Output combined SQL
process.stdout.write(allSql);
