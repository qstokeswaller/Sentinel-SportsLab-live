/**
 * Seeds the missing 1,642 exercises (indices 1600–3241) into Supabase.
 * Run with: node scripts/seed-missing-exercises.mjs
 */
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Load env
const envPath = join(__dirname, '..', '.env.local');
const envContent = readFileSync(envPath, 'utf-8');
const env = Object.fromEntries(
  envContent.split('\n')
    .filter(l => l.includes('=') && !l.startsWith('#'))
    .map(l => { const i = l.indexOf('='); return [l.slice(0,i).trim(), l.slice(i+1).trim()]; })
);

const supabaseUrl = env.VITE_SUPABASE_URL;
const supabaseKey = env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Load exercises JSON
const dataPath = join(__dirname, '..', 'data', 'exercises_data.json');
const raw = JSON.parse(readFileSync(dataPath, 'utf-8'));
const all = Array.isArray(raw) ? raw : Object.values(raw);

// Only the missing slice (indices 1600 onwards)
const missing = all.slice(1600);
console.log(`Total missing exercises to seed: ${missing.length}`);
console.log(`First: ${missing[0].id} — ${missing[0].name}`);
console.log(`Last:  ${missing[missing.length-1].id} — ${missing[missing.length-1].name}`);

// Map to DB column names (matches how the first 1600 were inserted)
function mapExercise(e) {
  return {
    id:          e.id,
    name:        e.name || null,
    description: e.description || null,
    body_parts:  e.muscleGroup ? [e.muscleGroup] : [],
    categories:  Array.isArray(e.categories) ? e.categories : [],
    video_url:   e.videoUrl || null,
    options: {
      posture:         e.posture || null,
      grip:            e.grip || null,
      alternating:     e.alternating === true,
      movementPattern: e.movementPattern || null,
      mechanics:       e.mechanics || null,
      longVideoUrl:    e.longVideoUrl || null,
    },
  };
}

const rows = missing.map(mapExercise);

// Insert in batches of 200
const BATCH = 200;
let inserted = 0;
let errors = 0;

for (let i = 0; i < rows.length; i += BATCH) {
  const batch = rows.slice(i, i + BATCH);
  const { error } = await supabase
    .from('exercises')
    .upsert(batch, { onConflict: 'id' });

  if (error) {
    console.error(`Batch ${Math.floor(i/BATCH)+1} ERROR:`, error.message);
    errors++;
  } else {
    inserted += batch.length;
    process.stdout.write(`\rInserted ${inserted}/${rows.length}...`);
  }
}

console.log(`\nDone. Inserted: ${inserted}, Errors: ${errors}`);

// Verify total
const { count } = await supabase.from('exercises').select('*', { count: 'exact', head: true });
console.log(`Total exercises in DB: ${count}`);
