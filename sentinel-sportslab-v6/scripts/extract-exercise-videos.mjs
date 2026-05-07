import XLSX from 'xlsx';
import { writeFileSync } from 'fs';

const filePath = './Functional+Fitness+Exercise+Database+(version+2.9).xlsx';
const workbook = XLSX.readFile(filePath);
const sheet = workbook.Sheets['Exercises'];
const range = XLSX.utils.decode_range(sheet['!ref']);

// First, find the header row to understand column layout
const headers = [];
for (let col = range.s.c; col <= range.e.c; col++) {
  const cell = sheet[XLSX.utils.encode_cell({ r: 16, c: col })]; // Row 17 seems to be data start
  const headerCell = sheet[XLSX.utils.encode_cell({ r: 15, c: col })]; // Check row 16 for headers
  headers.push(headerCell ? (headerCell.v || headerCell.w || '') : '');
}

// Try multiple rows to find the actual header
for (let testRow = 0; testRow <= 20; testRow++) {
  const rowCells = [];
  for (let col = 0; col <= Math.min(range.e.c, 20); col++) {
    const cell = sheet[XLSX.utils.encode_cell({ r: testRow, c: col })];
    rowCells.push(cell ? String(cell.v || cell.w || '').substring(0, 40) : '');
  }
  const nonEmpty = rowCells.filter(c => c.length > 0);
  if (nonEmpty.length >= 3) {
    console.log(`Row ${testRow + 1}: ${rowCells.filter(c => c).join(' | ')}`);
  }
}

console.log('\n--- Checking columns with hyperlinks ---');

// Build a map: row -> { exerciseName, videoUrls[] }
const exerciseMap = {};
for (let row = 16; row <= Math.min(range.e.r, 25); row++) { // Sample first few data rows
  const rowData = {};
  for (let col = range.s.c; col <= Math.min(range.e.c, 20); col++) {
    const cellRef = XLSX.utils.encode_cell({ r: row, c: col });
    const cell = sheet[cellRef];
    if (cell) {
      rowData[col] = {
        value: cell.v || cell.w || '',
        link: cell.l ? cell.l.Target : null
      };
    }
  }
  console.log(`\nRow ${row + 1}:`);
  for (const [col, data] of Object.entries(rowData)) {
    const prefix = data.link ? '🔗' : '  ';
    console.log(`  ${prefix} Col ${Number(col) + 1}: "${String(data.value).substring(0, 60)}" ${data.link ? `-> ${data.link}` : ''}`);
  }
}
