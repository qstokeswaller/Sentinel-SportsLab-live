import { readFileSync, writeFileSync } from 'fs';

const exercises = JSON.parse(readFileSync('./data/exercise-video-map.json', 'utf-8'));

// Filter to only those with demo URLs
const withDemos = exercises.filter(e => e.video_demo);

// Build batched UPDATE ... FROM VALUES statements
const batchSize = 200;
const batches = [];

for (let i = 0; i < withDemos.length; i += batchSize) {
  const batch = withDemos.slice(i, i + batchSize);
  const values = batch.map(e => {
    const name = e.name.replace(/'/g, "''").trim();
    const url = e.video_demo.replace(/'/g, "''");
    return `('${name}', '${url}')`;
  }).join(',\n  ');

  const sql = `UPDATE exercises AS e
SET video_url = v.url
FROM (VALUES
  ${values}
) AS v(name, url)
WHERE LOWER(TRIM(e.name)) = LOWER(v.name);`;

  batches.push(sql);
}

batches.forEach((sql, i) => {
  writeFileSync(`./data/video-bulk-batch-${i}.sql`, sql);
});

console.log(`Generated ${batches.length} bulk update batches of up to ${batchSize} each`);
console.log(`Total exercises to update: ${withDemos.length}`);
