import { readFileSync, writeFileSync } from 'fs';

// Merge into groups of 2 batches each
const groups = [[1,2], [3,4], [5,6], [7,8], [9,10]];

for (let g = 0; g < groups.length; g++) {
  const range = groups[g];
  const allValues = [];
  for (const i of range) {
    const sql = readFileSync(`./data/video-bulk-batch-${i}.sql`, 'utf-8');
    const match = sql.match(/\(VALUES\n([\s\S]+?)\n\) AS v/);
    if (match) allValues.push(match[1].trim());
  }

  const merged = `UPDATE exercises AS e
SET video_url = v.url
FROM (VALUES
  ${allValues.join(',\n  ')}
) AS v(name, url)
WHERE LOWER(TRIM(e.name)) = LOWER(v.name);`;

  writeFileSync(`./data/video-group-${g}.sql`, merged);
  const count = (merged.match(/\('/g) || []).length;
  console.log(`Group ${g} (batches ${range.join(',')}): ${count} exercises, ${merged.length} bytes`);
}
