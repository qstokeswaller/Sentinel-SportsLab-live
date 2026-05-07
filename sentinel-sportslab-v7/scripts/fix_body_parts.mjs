/**
 * Fix body_parts and tags for all exercises in Supabase.
 * The original seed missed populating these columns.
 */
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const sb = createClient(
  'https://zlrpqcftufaljpwfsxbt.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpscnBxY2Z0dWZhbGpwd2ZzeGJ0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTk3NDczOCwiZXhwIjoyMDg3NTUwNzM4fQ.oq80X774_-gycy96YPA26cFJvyOLCIGEE9keQ87DMiw'
);

const rawPath = path.resolve(__dirname, '../data/exercises_data.json');
const raw = JSON.parse(readFileSync(rawPath, 'utf8'));

console.log(`Fixing body_parts & tags for ${raw.length} exercises...`);

let updated = 0;
let errors = 0;

for (const e of raw) {
  const tags = [
    e.movementPattern,
    e.mechanics,
    e.posture,
    e.grip,
    e.alternating === true ? 'Alternating' : null,
  ].filter(Boolean);

  const { error } = await sb
    .from('exercises')
    .update({
      body_parts: e.muscleGroup ? [e.muscleGroup] : null,
      tags: tags.length ? tags : null,
      options: {
        posture: e.posture || null,
        grip: e.grip || null,
        alternating: e.alternating || false,
        movementPattern: e.movementPattern || null,
        mechanics: e.mechanics || null,
        longVideoUrl: e.longVideoUrl || null,
      },
    })
    .eq('id', e.id);

  if (error) {
    errors++;
    if (errors <= 3) console.error(`  Error on ${e.id}:`, error.message);
  } else {
    updated++;
    if (updated % 500 === 0) process.stdout.write(`\r  Updated ${updated}/${raw.length}`);
  }
}

console.log(`\nDone. ${updated} exercises updated, ${errors} errors.`);

// Verify
const { data: sample } = await sb.from('exercises').select('name, body_parts, tags').limit(5);
console.log('\nVerification sample:');
sample?.forEach(e => console.log(`  ${e.name}: body_parts=${JSON.stringify(e.body_parts)}, tags=${JSON.stringify(e.tags)}`));
