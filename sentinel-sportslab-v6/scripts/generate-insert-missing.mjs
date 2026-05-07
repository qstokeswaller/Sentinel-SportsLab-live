import { readFileSync, writeFileSync } from 'fs';
import { randomUUID } from 'crypto';

const exercises = JSON.parse(readFileSync('./data/missing-common-exercises.json', 'utf-8'));
const BATCH_SIZE = 50;

function esc(s) { return s ? s.replace(/'/g, "''") : ''; }

function toSql(ex) {
  const id = randomUUID();
  const name = esc(ex.name);
  const desc = esc(ex.description || '');
  const bodyParts = `ARRAY[${(ex.body_parts || []).map(b => `'${esc(b)}'`).join(',')}]::text[]`;
  const categories = `ARRAY[${(ex.categories || []).map(c => `'${esc(c)}'`).join(',')}]::text[]`;
  const equipment = `ARRAY[${(ex.equipment || []).map(e => `'${esc(e)}'`).join(',')}]::text[]`;
  const tags = `ARRAY[${(ex.tags || []).map(t => `'${esc(t)}'`).join(',')}]::text[]`;
  const tracking = ex.tracking_type || 'weight_reps';
  const opts = JSON.stringify(ex.options || {}).replace(/'/g, "''");

  return `  ('${id}', '${name}', '${desc}', ${bodyParts}, ${categories}, ${equipment}, ${tags}, '${tracking}', '${opts}'::jsonb)`;
}

const batches = [];
for (let i = 0; i < exercises.length; i += BATCH_SIZE) {
  const batch = exercises.slice(i, i + BATCH_SIZE);
  const values = batch.map(toSql).join(',\n');
  const sql = `INSERT INTO exercises (id, name, description, body_parts, categories, equipment, tags, tracking_type, options)
VALUES
${values}
ON CONFLICT (id) DO NOTHING;`;
  batches.push(sql);
}

for (let i = 0; i < batches.length; i++) {
  writeFileSync(`./data/insert-missing-batch-${i}.sql`, batches[i]);
  const count = (batches[i].match(/\('[\da-f-]{36}'/g) || []).length;
  console.log(`Batch ${i}: ${count} exercises, ${batches[i].length} bytes`);
}
console.log(`\nTotal: ${exercises.length} exercises in ${batches.length} batches`);
