import XLSX from 'xlsx';
import { writeFileSync } from 'fs';

const filePath = './Functional+Fitness+Exercise+Database+(version+2.9).xlsx';
const workbook = XLSX.readFile(filePath);
const sheet = workbook.Sheets['Exercises'];
const range = XLSX.utils.decode_range(sheet['!ref']);

const exercises = [];
let noVideoCount = 0;

// Data starts at row 17 (index 16), Col B=1 is exercise name, Col C=2 is demo, Col D=3 is explanation
for (let row = 16; row <= range.e.r; row++) {
  const nameCell = sheet[XLSX.utils.encode_cell({ r: row, c: 1 })]; // Col B
  const demoCell = sheet[XLSX.utils.encode_cell({ r: row, c: 2 })]; // Col C
  const explainCell = sheet[XLSX.utils.encode_cell({ r: row, c: 3 })]; // Col D

  const name = nameCell ? String(nameCell.v || '').trim() : '';
  if (!name) continue;

  const demoUrl = demoCell && demoCell.l ? demoCell.l.Target : null;
  const explainUrl = explainCell && explainCell.l ? explainCell.l.Target : null;

  if (!demoUrl && !explainUrl) {
    noVideoCount++;
    continue;
  }

  exercises.push({
    name,
    video_demo: demoUrl,
    video_explain: explainUrl
  });
}

console.log(`Total exercises with video links: ${exercises.length}`);
console.log(`Exercises without any video: ${noVideoCount}`);
console.log(`\nSample entries:`);
exercises.slice(0, 5).forEach(e => {
  console.log(`  ${e.name}`);
  console.log(`    Demo: ${e.video_demo || '—'}`);
  console.log(`    Explain: ${e.video_explain || '—'}`);
});

writeFileSync('./data/exercise-video-map.json', JSON.stringify(exercises, null, 2));
console.log(`\nFull map saved to data/exercise-video-map.json`);
