import { readFileSync } from 'fs';

const groupNum = parseInt(process.argv[2]);
const sql = readFileSync(`./data/video-group-${groupNum}.sql`, 'utf-8');

// Compact: remove newlines and extra spaces from VALUES
const compact = sql
  .replace(/\n\s+\(/g, '(')
  .replace(/\),\n\s+\(/g, '),(')
  .replace(/\n/g, ' ')
  .replace(/\s+/g, ' ');

process.stdout.write(compact);
