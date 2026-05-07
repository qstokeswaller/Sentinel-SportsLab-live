import { readFileSync, readdirSync } from 'fs';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://zlrpqcftufaljpwfsxbt.supabase.co';
const supabaseKey = readFileSync('.env.local', 'utf-8')
  .split('\n')
  .find(l => l.startsWith('VITE_SUPABASE_ANON_KEY='))
  ?.split('=').slice(1).join('=')?.trim();

if (!supabaseKey) {
  // Fallback: use service role key from env or hardcoded anon key
  console.error('Could not read VITE_SUPABASE_ANON_KEY from .env.local');
  process.exit(1);
}

const exercises = JSON.parse(readFileSync('./data/exercise-video-map.json', 'utf-8'));
const withDemos = exercises.filter(e => e.video_demo);

console.log(`Updating ${withDemos.length} exercises with video URLs...`);

const supabase = createClient(supabaseUrl, supabaseKey);

// First, get all exercise names from DB for matching
const { data: dbExercises, error: fetchErr } = await supabase
  .from('exercises')
  .select('id, name');

if (fetchErr) {
  console.error('Failed to fetch exercises:', fetchErr);
  process.exit(1);
}

console.log(`Found ${dbExercises.length} exercises in DB`);

// Build lookup map (lowercase trimmed name -> id)
const nameToId = {};
for (const ex of dbExercises) {
  nameToId[ex.name.trim().toLowerCase()] = ex.id;
}

// Match and update
let matched = 0;
let unmatched = 0;
const unmatchedNames = [];
const updates = [];

for (const ex of withDemos) {
  const key = ex.name.trim().toLowerCase();
  const id = nameToId[key];
  if (id) {
    updates.push({ id, video_url: ex.video_demo });
    matched++;
  } else {
    unmatched++;
    if (unmatchedNames.length < 20) unmatchedNames.push(ex.name);
  }
}

console.log(`Matched: ${matched}, Unmatched: ${unmatched}`);
if (unmatchedNames.length > 0) {
  console.log(`Sample unmatched: ${unmatchedNames.join(', ')}`);
}

// Execute updates in batches of 100
const batchSize = 100;
let updated = 0;
let errors = 0;

for (let i = 0; i < updates.length; i += batchSize) {
  const batch = updates.slice(i, i + batchSize);

  // Use individual updates (Supabase JS doesn't support bulk update well)
  const promises = batch.map(u =>
    supabase.from('exercises').update({ video_url: u.video_url }).eq('id', u.id)
  );

  const results = await Promise.all(promises);

  for (const r of results) {
    if (r.error) {
      errors++;
      if (errors <= 3) console.error('Update error:', r.error);
    } else {
      updated++;
    }
  }

  console.log(`Progress: ${Math.min(i + batchSize, updates.length)}/${updates.length}`);
}

console.log(`\nDone! Updated: ${updated}, Errors: ${errors}`);
