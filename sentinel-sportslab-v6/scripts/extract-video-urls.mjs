import XLSX from 'xlsx';
import { readFileSync, writeFileSync } from 'fs';

const filePath = './Functional+Fitness+Exercise+Database+(version+2.9).xlsx';
const workbook = XLSX.readFile(filePath, { cellStyles: true, cellNF: true });

const results = [];

for (const sheetName of workbook.SheetNames) {
  const sheet = workbook.Sheets[sheetName];
  const range = XLSX.utils.decode_range(sheet['!ref'] || 'A1');

  // Check for hyperlinks in the sheet
  const hyperlinks = sheet['!hyperlinks'] || [];

  // Also check individual cells for links
  for (let row = range.s.r; row <= range.e.r; row++) {
    for (let col = range.s.c; col <= range.e.c; col++) {
      const cellRef = XLSX.utils.encode_cell({ r: row, c: col });
      const cell = sheet[cellRef];
      if (!cell) continue;

      // Check if cell has a hyperlink
      if (cell.l && cell.l.Target) {
        results.push({
          sheet: sheetName,
          cell: cellRef,
          row: row + 1,
          col: col + 1,
          displayText: cell.v || cell.w || '',
          url: cell.l.Target
        });
      }
    }
  }
}

console.log(`Found ${results.length} hyperlinks total\n`);

// Group by sheet
const bySheet = {};
for (const r of results) {
  if (!bySheet[r.sheet]) bySheet[r.sheet] = [];
  bySheet[r.sheet].push(r);
}

for (const [sheet, links] of Object.entries(bySheet)) {
  console.log(`=== Sheet: ${sheet} (${links.length} links) ===`);
  for (const link of links.slice(0, 10)) {
    console.log(`  Row ${link.row}: "${link.displayText}" -> ${link.url}`);
  }
  if (links.length > 10) console.log(`  ... and ${links.length - 10} more`);
  console.log('');
}

// Save full results to JSON
writeFileSync('./data/exercise-video-urls.json', JSON.stringify(results, null, 2));
console.log(`Full results saved to data/exercise-video-urls.json`);
