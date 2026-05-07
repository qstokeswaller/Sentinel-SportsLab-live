import { createClient } from '@supabase/supabase-js';

const sb = createClient(
  'https://zlrpqcftufaljpwfsxbt.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpscnBxY2Z0dWZhbGpwd2ZzeGJ0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTk3NDczOCwiZXhwIjoyMDg3NTUwNzM4fQ.oq80X774_-gycy96YPA26cFJvyOLCIGEE9keQ87DMiw'
);

// Manual mapping for partial title matches
const TITLE_TO_TEMPLATE = {
  'Quintin — Upper Body': 'Quintin — Upper Body Hypertrophy',
  'Quintin — Lower Body': 'Quintin — Lower Body Strength',
};

const { data: templates } = await sb.from('workout_templates').select('id, name, sections');
const { data: sessions } = await sb.from('scheduled_sessions').select('id, title, exercises');

const noExercises = sessions?.filter(s => {
  if (!s.exercises) return true;
  if (Array.isArray(s.exercises) && s.exercises.length === 0) return true;
  return false;
});

console.log('Remaining sessions without exercises:', noExercises?.length);

let updated = 0;
for (const session of noExercises || []) {
  const mappedName = TITLE_TO_TEMPLATE[session.title];
  const tpl = templates?.find(t => t.name === mappedName);
  if (tpl && tpl.sections) {
    const { error } = await sb
      .from('scheduled_sessions')
      .update({ exercises: tpl.sections })
      .eq('id', session.id);
    if (!error) { updated++; console.log('  ✓', session.title, '→', tpl.name); }
    else console.log('  ✗', error.message);
  } else {
    console.log('  ⚠ Still unmatched:', session.title);
  }
}
console.log('\nUpdated', updated, 'more sessions');
