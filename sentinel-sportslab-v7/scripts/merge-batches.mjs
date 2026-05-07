import { readFileSync, writeFileSync } from 'fs';

// Merge batches 1-5 into one SQL, and 6-10 into another
for (const [name, range] of [['1to5', [1,2,3,4,5]], ['6to10', [6,7,8,9,10]]]) {
  const allValues = [];
  for (const i of range) {
    const sql = readFileSync(`./data/video-bulk-batch-${i}.sql`, 'utf-8');
    // Extract just the VALUES portion between (VALUES and ) AS v
    const match = sql.match(/\(VALUES\n([\s\S]+?)\n\) AS v/);
    if (match) {
      allValues.push(match[1].trim());
    }
  }

  const merged = `UPDATE exercises AS e
SET video_url = v.url
FROM (VALUES
  ${allValues.join(',\n  ')}
) AS v(name, url)
WHERE LOWER(TRIM(e.name)) = LOWER(v.name);`;

  writeFileSync(`./data/video-merged-${name}.sql`, merged);
  const count = (merged.match(/\('/g) || []).length;
  console.log(`${name}: ${count} exercises, ${merged.length} bytes`);
}
