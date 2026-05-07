// Insert pre-parsed GPS data into Supabase using service role key (bypasses RLS)
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUTPUT_DIR = path.join(__dirname, 'gps-import-output');

const SUPABASE_URL = 'https://zlrpqcftufaljpwfsxbt.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpscnBxY2Z0dWZhbGpwd2ZzeGJ0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTk3NDczOCwiZXhwIjoyMDg3NTUwNzM4fQ.oq80X774_-gycy96YPA26cFJvyOLCIGEE9keQ87DMiw';
const BRYANT_USER_ID = '47a85539-0179-4708-bb4a-ccd3edc77129';

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

async function upsert(key, value) {
  const { error } = await supabase
    .from('user_data')
    .upsert({ user_id: BRYANT_USER_ID, key, value }, { onConflict: 'user_id,key' });
  if (error) throw new Error(`Failed to upsert ${key}: ${error.message}`);
}

async function main() {
  const gpsData = JSON.parse(fs.readFileSync(path.join(OUTPUT_DIR, 'gps_data.json'), 'utf-8'));
  const profiles = JSON.parse(fs.readFileSync(path.join(OUTPUT_DIR, 'gps_team_profiles.json'), 'utf-8'));
  const categories = JSON.parse(fs.readFileSync(path.join(OUTPUT_DIR, 'gps_categories.json'), 'utf-8'));

  console.log(`Inserting ${gpsData.length} GPS records...`);
  await upsert('gps_data', gpsData);
  console.log('gps_data ✓');

  console.log('Inserting GPS team profile...');
  await upsert('gps_team_profiles', profiles);
  console.log('gps_team_profiles ✓');

  console.log('Inserting GPS categories...');
  await upsert('gps_categories', categories);
  console.log('gps_categories ✓');

  // Verify
  const { data: verify } = await supabase
    .from('user_data')
    .select('key, value')
    .eq('user_id', BRYANT_USER_ID)
    .in('key', ['gps_data', 'gps_team_profiles', 'gps_categories']);

  console.log('\n=== Verification ===');
  for (const row of verify || []) {
    const count = Array.isArray(row.value) ? row.value.length : 1;
    console.log(`${row.key}: ${count} items`);
  }
  console.log('\nDone. All GPS data live on Bryant\'s account.');
}

main().catch(err => { console.error('FATAL:', err.message); process.exit(1); });
