import { createClient } from '@supabase/supabase-js';

const sb = createClient(
  'https://zlrpqcftufaljpwfsxbt.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpscnBxY2Z0dWZhbGpwd2ZzeGJ0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTk3NDczOCwiZXhwIjoyMDg3NTUwNzM4fQ.oq80X774_-gycy96YPA26cFJvyOLCIGEE9keQ87DMiw'
);

const { data: templates } = await sb.from('workout_templates').select('id, name, sections');
console.log('Templates:', templates?.map(t => t.name));

const { data: sessions } = await sb.from('scheduled_sessions').select('id, title, exercises');
console.log('Sessions:', sessions?.length, 'total');

const noExercises = sessions?.filter(s => {
  if (!s.exercises) return true;
  if (Array.isArray(s.exercises) && s.exercises.length === 0) return true;
  return false;
});
console.log('Sessions without exercises:', noExercises?.length);

let updated = 0;
for (const session of noExercises || []) {
  // Match session title to template name
  const tpl = templates?.find(t => session.title === t.name || session.title?.includes(t.name));
  if (tpl && tpl.sections) {
    const { error } = await sb
      .from('scheduled_sessions')
      .update({ exercises: tpl.sections })
      .eq('id', session.id);
    if (!error) {
      updated++;
      console.log('  ✓', session.title, '→', tpl.name);
    } else {
      console.log('  ✗', session.title, error.message);
    }
  } else {
    console.log('  ⚠ No template match:', session.title);
  }
}
console.log('\nUpdated', updated, 'sessions with exercise data');
