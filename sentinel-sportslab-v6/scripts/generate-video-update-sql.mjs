import { readFileSync, writeFileSync } from 'fs';

const exercises = JSON.parse(readFileSync('./data/exercise-video-map.json', 'utf-8'));

// Use video_demo as the primary video_url (it's the demonstration video)
const updates = exercises
  .filter(e => e.video_demo)
  .map(e => {
    const name = e.name.replace(/'/g, "''");
    const url = e.video_demo.replace(/'/g, "''");
    return `UPDATE exercises SET video_url = '${url}' WHERE LOWER(TRIM(name)) = LOWER('${name}');`;
  });

console.log(`Generated ${updates.length} UPDATE statements`);
console.log(`\nSample:`);
updates.slice(0, 3).forEach(u => console.log(u));

// Split into batches of 50 for Supabase execution
const batchSize = 50;
const batches = [];
for (let i = 0; i < updates.length; i += batchSize) {
  batches.push(updates.slice(i, i + batchSize).join('\n'));
}

console.log(`\nSplit into ${batches.length} batches of up to ${batchSize}`);

// Save batches
batches.forEach((batch, i) => {
  writeFileSync(`./data/video-update-batch-${i}.sql`, batch);
});

console.log(`Batch files saved to data/video-update-batch-*.sql`);
