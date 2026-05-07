/**
 * Seed exercises from data/exercises_data.json into Supabase exercises table.
 * Safe to run multiple times (upsert on conflict of id).
 */
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const SUPABASE_URL = 'https://zlrpqcftufaljpwfsxbt.supabase.co';
const SUPABASE_KEY = 'sb_publishable_01xG_1-8lVJgblKRqknhqA_w3CBzAIN';
const BATCH_SIZE = 100;

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const rawPath = path.resolve(__dirname, '../data/exercises_data.json');
const raw = JSON.parse(readFileSync(rawPath, 'utf8'));

const exercises = raw.map(e => {
  // Build tags from structured fields
  const tags = [
    e.movementPattern,
    e.mechanics,
    e.posture,
    e.grip,
    e.alternating === true ? 'Alternating' : null,
  ].filter(Boolean);

  return {
    id: e.id,
    club_id: null,          // null = global (shared across all users)
    name: e.name,
    description: e.description && e.description !== 'No description provided.' ? e.description : null,
    body_parts: e.muscleGroup ? [e.muscleGroup] : null,
    categories: e.categories?.length ? e.categories : null,
    video_url: e.videoUrl || null,
    tags: tags.length ? tags : null,
    options: e.longVideoUrl ? { longVideoUrl: e.longVideoUrl } : null,
    tracking_type: null,    // to be enriched later
    equipment: null,        // not in source data
  };
});

console.log(`Seeding ${exercises.length} exercises in batches of ${BATCH_SIZE}...`);

let upserted = 0;
let errors = 0;

for (let i = 0; i < exercises.length; i += BATCH_SIZE) {
  const batch = exercises.slice(i, i + BATCH_SIZE);

  const { error } = await supabase
    .from('exercises')
    .upsert(batch, { onConflict: 'id' });

  if (error) {
    console.error(`  Batch ${i / BATCH_SIZE + 1} error:`, error.message);
    errors++;
  } else {
    upserted += batch.length;
    process.stdout.write(`\r  Upserted ${upserted}/${exercises.length}`);
  }
}

console.log(`\nDone. ${upserted} exercises upserted, ${errors} batch error(s).`);
