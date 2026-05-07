import { readFileSync } from 'fs';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://zlrpqcftufaljpwfsxbt.supabase.co';
const supabaseKey = readFileSync('.env.local', 'utf-8')
  .split('\n')
  .find(l => l.startsWith('VITE_SUPABASE_ANON_KEY='))
  ?.split('=').slice(1).join('=')?.trim();

const supabase = createClient(supabaseUrl, supabaseKey);

const exercises = JSON.parse(readFileSync('./data/exercise-video-map.json', 'utf-8'));
const withDemos = exercises.filter(e => e.video_demo);

// Fetch ALL exercises with pagination
let allDbExercises = [];
let offset = 0;
const pageSize = 1000;

while (true) {
  const { data, error } = await supabase
    .from('exercises')
    .select('id, name, video_url')
    .range(offset, offset + pageSize - 1);

  if (error) { console.error('Fetch error:', error); break; }
  allDbExercises = allDbExercises.concat(data);
  console.log(`Fetched ${data.length} exercises (total: ${allDbExercises.length})`);
  if (data.length < pageSize) break;
  offset += pageSize;
}

console.log(`Total DB exercises: ${allDbExercises.length}`);

// Build lookup
const nameToId = {};
for (const ex of allDbExercises) {
  nameToId[ex.name.trim().toLowerCase()] = { id: ex.id, video_url: ex.video_url };
}

// Only update exercises that still have empty video_url
const updates = [];
let alreadySet = 0;
let unmatched = 0;
const unmatchedNames = [];

for (const ex of withDemos) {
  const key = ex.name.trim().toLowerCase();
  const match = nameToId[key];
  if (match) {
    if (match.video_url && match.video_url.length > 0) {
      alreadySet++;
    } else {
      updates.push({ id: match.id, video_url: ex.video_demo });
    }
  } else {
    unmatched++;
    if (unmatchedNames.length < 20) unmatchedNames.push(ex.name);
  }
}

console.log(`Already set: ${alreadySet}, Need update: ${updates.length}, Unmatched: ${unmatched}`);
if (unmatchedNames.length > 0) {
  console.log(`Sample unmatched:\n  ${unmatchedNames.join('\n  ')}`);
}

// Execute updates in batches with retry
const batchSize = 50;
let updated = 0;
let errors = 0;

for (let i = 0; i < updates.length; i += batchSize) {
  const batch = updates.slice(i, i + batchSize);
  const promises = batch.map(u =>
    supabase.from('exercises').update({ video_url: u.video_url }).eq('id', u.id)
  );

  const results = await Promise.all(promises);
  for (const r of results) {
    if (r.error) {
      errors++;
      if (errors <= 3) console.error('Error:', r.error.message);
    } else {
      updated++;
    }
  }

  if ((i + batchSize) % 200 === 0 || i + batchSize >= updates.length) {
    console.log(`Progress: ${Math.min(i + batchSize, updates.length)}/${updates.length}`);
  }

  // Small delay to avoid rate limits
  await new Promise(r => setTimeout(r, 100));
}

console.log(`\nDone! Updated: ${updated}, Errors: ${errors}, Already set: ${alreadySet}`);

// Final count
const { data: finalCheck } = await supabase
  .from('exercises')
  .select('id', { count: 'exact', head: true })
  .neq('video_url', '');

console.log(`Exercises with video_url set: check DB for final count`);
