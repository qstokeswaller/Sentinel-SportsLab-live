// Seed script — inserts realistic data into Supabase as user stokeswallerq@gmail.com
import { createClient } from '@supabase/supabase-js';

const sb = createClient(
  'https://zlrpqcftufaljpwfsxbt.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpscnBxY2Z0dWZhbGpwd2ZzeGJ0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTk3NDczOCwiZXhwIjoyMDg3NTUwNzM4fQ.oq80X774_-gycy96YPA26cFJvyOLCIGEE9keQ87DMiw'
);

const USER_ID = '32eeb1d6-fcc5-4b6a-9645-c6dd50e31385';

// ─── Helpers ──────────────────────────────────────────────────────────────────
function uuid() { return crypto.randomUUID(); }
function d(offset) {
  const dt = new Date();
  dt.setDate(dt.getDate() + offset);
  return dt.toISOString().split('T')[0];
}

// ─── 1. Find exercises ────────────────────────────────────────────────────────
console.log('Finding exercises...');
const { data: allEx } = await sb.from('exercises').select('id,name').order('name');

const pick = (keyword) => {
  const found = allEx.find(e => e.name.toLowerCase().includes(keyword.toLowerCase()));
  if (!found) console.warn(`  ⚠ Exercise not found: "${keyword}"`);
  return found;
};

// Build exercise map
const EX = {
  benchPress:     pick('Barbell Bench Press'),
  inclineBench:   pick('Barbell Incline Bench Press'),
  declineBench:   pick('Barbell Decline Bench Press'),
  cgBench:        pick('Barbell Close Grip Bench Press'),
  ohp:            pick('Barbell Overhead Press'),
  deadlift:       pick('Barbell Conventional Deadlift'),
  rdl:            pick('Barbell Romanian Deadlift'),
  bentRow:        pick('Barbell Bent Over Row'),
  hipThrust:      pick('Barbell Hip Thrust'),
  bbCurl:         pick('Barbell Bicep Curl'),
  hangClean:      pick('Barbell Hang Power Clean'),
  skullCrusher:   pick('Barbell Decline Bench Skull Crusher'),
  tricepExt:      pick('Barbell Seated Overhead Tricep Extension'),
  boxSquat:       pick('Barbell Box Back Squat'),
  bss:            pick('Barbell Back Rack Bulgarian Split Squat'),
  walkLunge:      pick('Barbell Back Rack Walking Lunge'),
  revLunge:       pick('Barbell Back Rack Alternating Reverse Lunge'),
  calfRaise:      pick('Barbell Back Rack Calf Raise'),
  pushUp:         pick('Bodyweight Push Up'),
  gluteBridge:    pick('Bodyweight Glute Bridge'),
  birdDog:        pick('Bodyweight Bird Dog'),
  deadBug:        pick('Bodyweight Dead Bug'),
  nordic:         pick('Bodyweight Nordic Hamstring Curl'),
  plank:          pick('Bodyweight Forearm Plank'),
  facePull:       pick('Cable Face Pull'),
  cableFly:       pick('Double Cable Chest Fly'),
  gobletSquat:    pick('Dumbbell Goblet Squat'),
  sbDeadBug:      pick('Stability Ball Dead Bug'),
  russianTwist:   pick('Stability Ball Russian Twist'),
};

console.log(`Found ${Object.values(EX).filter(Boolean).length}/${Object.keys(EX).length} exercises`);

const exId = (key) => EX[key]?.id ?? key;

// ─── 2. Create Chelsea FC team ────────────────────────────────────────────────
console.log('\nCreating Chelsea FC team...');
const chelseaId = uuid();
const { error: teamErr } = await sb.from('teams').insert({
  id: chelseaId,
  name: 'Chelsea FC',
  user_id: USER_ID,
});
if (teamErr) console.error('Team error:', teamErr.message);
else console.log('  ✓ Chelsea FC created');

// ─── 3. Create athletes ──────────────────────────────────────────────────────
console.log('\nCreating athletes...');

// Chelsea 2024/25 squad
const chelseaRoster = [
  'Robert Sanchez', 'Filip Jorgensen', 'Marcus Bettinelli',
  'Reece James', 'Marc Cucurella', 'Wesley Fofana', 'Levi Colwill', 'Benoit Badiashile', 'Malo Gusto', 'Axel Disasi',
  'Moises Caicedo', 'Enzo Fernandez', 'Romeo Lavia', 'Kiernan Dewsbury-Hall', 'Carney Chukwuemeka',
  'Cole Palmer', 'Noni Madueke', 'Mykhailo Mudryk', 'Pedro Neto', 'Jadon Sancho',
  'Nicolas Jackson', 'Christopher Nkunku', 'Marc Guiu', 'Joao Felix',
];

const athletes = chelseaRoster.map(name => ({
  id: uuid(),
  name,
  team_id: chelseaId,
  user_id: USER_ID,
}));

// Private clients (no team)
const privateClients = [
  { id: uuid(), name: 'Eric Mabaso', team_id: null, user_id: USER_ID },
  { id: uuid(), name: 'Quintin Stokes-Waller', team_id: null, user_id: USER_ID },
  { id: uuid(), name: 'Khatide Vilakazi', team_id: null, user_id: USER_ID },
];

const allAthletes = [...athletes, ...privateClients];
const { error: athErr } = await sb.from('athletes').insert(allAthletes);
if (athErr) console.error('Athletes error:', athErr.message);
else console.log(`  ✓ ${chelseaRoster.length} Chelsea players + 3 private clients created`);

const eric = privateClients[0];
const quintin = privateClients[1];
const khatide = privateClients[2];

// ─── 4. Create Workout Programs ──────────────────────────────────────────────
console.log('\nCreating workout programs...');

// Helper to create a full program
async function createProgram(name, overview, tags, days) {
  const progId = uuid();
  const now = new Date().toISOString();
  await sb.from('workout_programs').insert({
    id: progId, user_id: USER_ID, name, overview, tags, created_at: now, updated_at: now,
  });

  for (const day of days) {
    const dayId = uuid();
    await sb.from('workout_days').insert({
      id: dayId, program_id: progId, user_id: USER_ID,
      day_number: day.dayNumber, name: day.name, instructions: day.instructions || null,
    });

    for (let i = 0; i < day.exercises.length; i++) {
      const ex = day.exercises[i];
      await sb.from('workout_day_exercises').insert({
        id: uuid(), day_id: dayId, user_id: USER_ID,
        exercise_id: exId(ex.key),
        section: ex.section,
        order_index: i,
        sets: ex.sets || null,
        reps: ex.reps || null,
        rest_min: ex.restMin ?? 0,
        rest_sec: ex.restSec ?? 0,
        rir: ex.rir || null,
        rpe: ex.rpe || null,
        intensity: ex.intensity || null,
        tempo: ex.tempo || null,
        notes: ex.notes || null,
      });
    }
  }
  console.log(`  ✓ ${name} (${days.length} days)`);
  return progId;
}

// Program A: Push/Pull/Full Body Split (7 days)
await createProgram(
  'Push/Pull/Full Body Split',
  'Weekly split alternating push, pull, and full body sessions with strategic rest days for optimal recovery.',
  ['Strength', 'Hypertrophy', '7-Day'],
  [
    { dayNumber: 1, name: 'Pull Day', instructions: 'Focus on back and biceps. Control the eccentric on all rows.', exercises: [
      { key: 'deadBug', section: 'warmup', sets: '2', reps: '10', restMin: 0, restSec: 30 },
      { key: 'birdDog', section: 'warmup', sets: '2', reps: '8', restMin: 0, restSec: 30 },
      { key: 'deadlift', section: 'workout', sets: '4', reps: '5', restMin: 2, restSec: 30, rpe: '8', intensity: '80%', notes: 'Reset between reps' },
      { key: 'bentRow', section: 'workout', sets: '4', reps: '8', restMin: 1, restSec: 30, rpe: '7' },
      { key: 'facePull', section: 'workout', sets: '3', reps: '15', restMin: 1, restSec: 0, notes: 'Squeeze at peak contraction' },
      { key: 'bbCurl', section: 'workout', sets: '3', reps: '12', restMin: 1, restSec: 0, rpe: '7' },
      { key: 'plank', section: 'cooldown', sets: '3', reps: '30s', restMin: 0, restSec: 45 },
    ]},
    { dayNumber: 2, name: 'Push Day', instructions: 'Chest, shoulders, triceps. Warm up shoulders thoroughly.', exercises: [
      { key: 'pushUp', section: 'warmup', sets: '2', reps: '15', restMin: 0, restSec: 30 },
      { key: 'gluteBridge', section: 'warmup', sets: '2', reps: '12', restMin: 0, restSec: 30 },
      { key: 'benchPress', section: 'workout', sets: '4', reps: '6', restMin: 2, restSec: 30, rpe: '8', intensity: '78%' },
      { key: 'ohp', section: 'workout', sets: '4', reps: '8', restMin: 2, restSec: 0, rpe: '7' },
      { key: 'inclineBench', section: 'workout', sets: '3', reps: '10', restMin: 1, restSec: 30, rpe: '7' },
      { key: 'cableFly', section: 'workout', sets: '3', reps: '12', restMin: 1, restSec: 0 },
      { key: 'skullCrusher', section: 'workout', sets: '3', reps: '12', restMin: 1, restSec: 0, rpe: '7' },
      { key: 'russianTwist', section: 'cooldown', sets: '3', reps: '20', restMin: 0, restSec: 30 },
    ]},
    { dayNumber: 3, name: 'Rest', instructions: 'Active recovery — light walk or foam rolling. Stay hydrated.', exercises: [] },
    { dayNumber: 4, name: 'Full Body A', instructions: 'Compound-focused full body session. Keep rest strict.', exercises: [
      { key: 'birdDog', section: 'warmup', sets: '2', reps: '8', restMin: 0, restSec: 30 },
      { key: 'gobletSquat', section: 'warmup', sets: '2', reps: '10', restMin: 0, restSec: 30 },
      { key: 'boxSquat', section: 'workout', sets: '4', reps: '6', restMin: 2, restSec: 30, rpe: '8', intensity: '75%' },
      { key: 'benchPress', section: 'workout', sets: '3', reps: '8', restMin: 2, restSec: 0, rpe: '7' },
      { key: 'bentRow', section: 'workout', sets: '3', reps: '8', restMin: 1, restSec: 30, rpe: '7' },
      { key: 'hipThrust', section: 'workout', sets: '3', reps: '10', restMin: 1, restSec: 30, rpe: '7' },
      { key: 'plank', section: 'cooldown', sets: '3', reps: '45s', restMin: 0, restSec: 30 },
    ]},
    { dayNumber: 5, name: 'Full Body B', instructions: 'Power and accessory focus. Explosive on cleans.', exercises: [
      { key: 'deadBug', section: 'warmup', sets: '2', reps: '10', restMin: 0, restSec: 30 },
      { key: 'pushUp', section: 'warmup', sets: '2', reps: '12', restMin: 0, restSec: 30 },
      { key: 'hangClean', section: 'workout', sets: '5', reps: '3', restMin: 2, restSec: 0, rpe: '7', notes: 'Focus on triple extension' },
      { key: 'ohp', section: 'workout', sets: '3', reps: '8', restMin: 2, restSec: 0, rpe: '7' },
      { key: 'rdl', section: 'workout', sets: '4', reps: '8', restMin: 1, restSec: 30, rpe: '7', tempo: '3-1-1-0' },
      { key: 'bss', section: 'workout', sets: '3', reps: '10', restMin: 1, restSec: 30, notes: 'Each leg' },
      { key: 'sbDeadBug', section: 'cooldown', sets: '2', reps: '12', restMin: 0, restSec: 30 },
    ]},
    { dayNumber: 6, name: 'Rest', instructions: 'Full rest day. Prioritise sleep and nutrition.', exercises: [] },
    { dayNumber: 7, name: 'Rest', instructions: 'Light stretching or yoga if desired.', exercises: [] },
  ]
);

// Program B: 4-Day Full Body
await createProgram(
  '4-Day Full Body Program',
  'Four full body sessions per week — ideal for athletes needing frequency over volume. Each day targets all major movement patterns.',
  ['Full Body', 'Athletic', '4-Day'],
  [
    { dayNumber: 1, name: 'Full Body — Strength', instructions: 'Heavy compounds. Long rest between main lifts.', exercises: [
      { key: 'gluteBridge', section: 'warmup', sets: '2', reps: '12', restMin: 0, restSec: 30 },
      { key: 'birdDog', section: 'warmup', sets: '2', reps: '8', restMin: 0, restSec: 30 },
      { key: 'boxSquat', section: 'workout', sets: '5', reps: '5', restMin: 3, restSec: 0, rpe: '8', intensity: '82%' },
      { key: 'benchPress', section: 'workout', sets: '5', reps: '5', restMin: 3, restSec: 0, rpe: '8', intensity: '80%' },
      { key: 'bentRow', section: 'workout', sets: '4', reps: '6', restMin: 2, restSec: 0, rpe: '8' },
      { key: 'calfRaise', section: 'workout', sets: '3', reps: '15', restMin: 1, restSec: 0 },
      { key: 'plank', section: 'cooldown', sets: '3', reps: '45s', restMin: 0, restSec: 30 },
    ]},
    { dayNumber: 2, name: 'Full Body — Power', instructions: 'Explosive movements. Quality over quantity.', exercises: [
      { key: 'deadBug', section: 'warmup', sets: '2', reps: '10', restMin: 0, restSec: 30 },
      { key: 'pushUp', section: 'warmup', sets: '2', reps: '10', restMin: 0, restSec: 30 },
      { key: 'hangClean', section: 'workout', sets: '5', reps: '3', restMin: 2, restSec: 30, rpe: '7', notes: 'Fast elbows' },
      { key: 'ohp', section: 'workout', sets: '4', reps: '6', restMin: 2, restSec: 0, rpe: '7' },
      { key: 'deadlift', section: 'workout', sets: '4', reps: '5', restMin: 2, restSec: 30, rpe: '8' },
      { key: 'nordic', section: 'workout', sets: '3', reps: '5', restMin: 1, restSec: 30, notes: 'Slow eccentric' },
      { key: 'russianTwist', section: 'cooldown', sets: '3', reps: '20', restMin: 0, restSec: 30 },
    ]},
    { dayNumber: 3, name: 'Full Body — Hypertrophy', instructions: 'Moderate weight, higher reps. Feel the muscle work.', exercises: [
      { key: 'gobletSquat', section: 'warmup', sets: '2', reps: '10', restMin: 0, restSec: 30 },
      { key: 'gluteBridge', section: 'warmup', sets: '2', reps: '12', restMin: 0, restSec: 30 },
      { key: 'inclineBench', section: 'workout', sets: '4', reps: '10', restMin: 1, restSec: 30, rpe: '7', tempo: '3-1-1-0' },
      { key: 'rdl', section: 'workout', sets: '4', reps: '10', restMin: 1, restSec: 30, rpe: '7' },
      { key: 'walkLunge', section: 'workout', sets: '3', reps: '12', restMin: 1, restSec: 30, notes: 'Each leg' },
      { key: 'facePull', section: 'workout', sets: '3', reps: '15', restMin: 1, restSec: 0 },
      { key: 'bbCurl', section: 'workout', sets: '3', reps: '12', restMin: 1, restSec: 0 },
      { key: 'sbDeadBug', section: 'cooldown', sets: '2', reps: '10', restMin: 0, restSec: 30 },
    ]},
    { dayNumber: 4, name: 'Full Body — Conditioning', instructions: 'Circuit-style. Keep rest periods short.', exercises: [
      { key: 'birdDog', section: 'warmup', sets: '2', reps: '8', restMin: 0, restSec: 30 },
      { key: 'deadBug', section: 'warmup', sets: '2', reps: '10', restMin: 0, restSec: 30 },
      { key: 'gobletSquat', section: 'workout', sets: '4', reps: '12', restMin: 1, restSec: 0, rpe: '7' },
      { key: 'pushUp', section: 'workout', sets: '4', reps: '15', restMin: 0, restSec: 45 },
      { key: 'hipThrust', section: 'workout', sets: '3', reps: '12', restMin: 1, restSec: 0, rpe: '7' },
      { key: 'revLunge', section: 'workout', sets: '3', reps: '10', restMin: 1, restSec: 0, notes: 'Each leg' },
      { key: 'cableFly', section: 'workout', sets: '3', reps: '15', restMin: 0, restSec: 45 },
      { key: 'plank', section: 'cooldown', sets: '3', reps: '60s', restMin: 0, restSec: 30 },
    ]},
  ]
);

// Program C: Push/Pull Repeat
await createProgram(
  'Push/Pull Repeat',
  'Simple 4-day push/pull alternation. High frequency, moderate volume. Great for intermediate lifters.',
  ['Push Pull', 'Intermediate', '4-Day'],
  [
    { dayNumber: 1, name: 'Push A — Heavy', instructions: 'Strength-focused push. Big lifts first.', exercises: [
      { key: 'pushUp', section: 'warmup', sets: '2', reps: '15', restMin: 0, restSec: 30 },
      { key: 'benchPress', section: 'workout', sets: '5', reps: '5', restMin: 2, restSec: 30, rpe: '8', intensity: '82%' },
      { key: 'ohp', section: 'workout', sets: '4', reps: '6', restMin: 2, restSec: 0, rpe: '8' },
      { key: 'cableFly', section: 'workout', sets: '3', reps: '12', restMin: 1, restSec: 0 },
      { key: 'tricepExt', section: 'workout', sets: '3', reps: '12', restMin: 1, restSec: 0 },
      { key: 'russianTwist', section: 'cooldown', sets: '3', reps: '20', restMin: 0, restSec: 30 },
    ]},
    { dayNumber: 2, name: 'Pull A — Heavy', instructions: 'Strength-focused pull. Brace hard on deadlifts.', exercises: [
      { key: 'birdDog', section: 'warmup', sets: '2', reps: '8', restMin: 0, restSec: 30 },
      { key: 'deadlift', section: 'workout', sets: '5', reps: '5', restMin: 3, restSec: 0, rpe: '8', intensity: '82%' },
      { key: 'bentRow', section: 'workout', sets: '4', reps: '6', restMin: 2, restSec: 0, rpe: '8' },
      { key: 'facePull', section: 'workout', sets: '3', reps: '15', restMin: 1, restSec: 0 },
      { key: 'bbCurl', section: 'workout', sets: '3', reps: '10', restMin: 1, restSec: 0 },
      { key: 'plank', section: 'cooldown', sets: '3', reps: '45s', restMin: 0, restSec: 30 },
    ]},
    { dayNumber: 3, name: 'Push B — Volume', instructions: 'Higher reps, controlled tempo. Chase the pump.', exercises: [
      { key: 'gluteBridge', section: 'warmup', sets: '2', reps: '12', restMin: 0, restSec: 30 },
      { key: 'inclineBench', section: 'workout', sets: '4', reps: '10', restMin: 1, restSec: 30, rpe: '7', tempo: '3-1-1-0' },
      { key: 'cgBench', section: 'workout', sets: '3', reps: '10', restMin: 1, restSec: 30, rpe: '7' },
      { key: 'declineBench', section: 'workout', sets: '3', reps: '10', restMin: 1, restSec: 30 },
      { key: 'skullCrusher', section: 'workout', sets: '3', reps: '12', restMin: 1, restSec: 0 },
      { key: 'sbDeadBug', section: 'cooldown', sets: '2', reps: '12', restMin: 0, restSec: 30 },
    ]},
    { dayNumber: 4, name: 'Pull B — Volume', instructions: 'Higher reps. Squeeze at top of every row.', exercises: [
      { key: 'deadBug', section: 'warmup', sets: '2', reps: '10', restMin: 0, restSec: 30 },
      { key: 'rdl', section: 'workout', sets: '4', reps: '10', restMin: 1, restSec: 30, rpe: '7', tempo: '3-1-1-0' },
      { key: 'bentRow', section: 'workout', sets: '4', reps: '10', restMin: 1, restSec: 30, rpe: '7' },
      { key: 'hipThrust', section: 'workout', sets: '3', reps: '12', restMin: 1, restSec: 30 },
      { key: 'bbCurl', section: 'workout', sets: '3', reps: '12', restMin: 1, restSec: 0 },
      { key: 'nordic', section: 'workout', sets: '3', reps: '5', restMin: 1, restSec: 30, notes: '5s eccentric' },
      { key: 'plank', section: 'cooldown', sets: '3', reps: '60s', restMin: 0, restSec: 30 },
    ]},
  ]
);

// ─── 5. Create Workout Packets/Templates ─────────────────────────────────────
console.log('\nCreating workout packets...');

const packets = [
  // Eric Mabaso - 3 packets
  { name: 'Eric — Strength Session A', training_phase: 'Strength', load: 'High', sections: {
    warmup: [
      { exerciseId: exId('gluteBridge'), exerciseName: 'Bodyweight Glute Bridge', sets: '2', reps: '12', rest: '30', rpe: '', notes: '' },
      { exerciseId: exId('deadBug'), exerciseName: 'Bodyweight Dead Bug', sets: '2', reps: '10', rest: '30', rpe: '', notes: '' },
    ],
    workout: [
      { exerciseId: exId('boxSquat'), exerciseName: 'Barbell Box Back Squat', sets: '5', reps: '5', rest: '180', rpe: '8', notes: '82% 1RM' },
      { exerciseId: exId('benchPress'), exerciseName: 'Barbell Bench Press', sets: '4', reps: '6', rest: '150', rpe: '8', notes: '' },
      { exerciseId: exId('bentRow'), exerciseName: 'Barbell Bent Over Row', sets: '4', reps: '8', rest: '90', rpe: '7', notes: '' },
      { exerciseId: exId('calfRaise'), exerciseName: 'Barbell Back Rack Calf Raise', sets: '3', reps: '15', rest: '60', rpe: '', notes: '' },
    ],
    cooldown: [
      { exerciseId: exId('plank'), exerciseName: 'Bodyweight Forearm Plank', sets: '3', reps: '45s', rest: '30', rpe: '', notes: '' },
    ],
  }},
  { name: 'Eric — Power Session', training_phase: 'Power', load: 'High', sections: {
    warmup: [
      { exerciseId: exId('birdDog'), exerciseName: 'Bodyweight Bird Dog', sets: '2', reps: '8', rest: '30', rpe: '', notes: '' },
    ],
    workout: [
      { exerciseId: exId('hangClean'), exerciseName: 'Barbell Hang Power Clean', sets: '5', reps: '3', rest: '150', rpe: '7', notes: 'Explosive triple extension' },
      { exerciseId: exId('ohp'), exerciseName: 'Barbell Overhead Press', sets: '4', reps: '6', rest: '120', rpe: '7', notes: '' },
      { exerciseId: exId('hipThrust'), exerciseName: 'Barbell Hip Thrust', sets: '4', reps: '8', rest: '90', rpe: '7', notes: '' },
    ],
    cooldown: [
      { exerciseId: exId('russianTwist'), exerciseName: 'Stability Ball Russian Twist', sets: '3', reps: '20', rest: '30', rpe: '', notes: '' },
    ],
  }},
  { name: 'Eric — Conditioning', training_phase: 'Conditioning', load: 'Medium', sections: {
    warmup: [
      { exerciseId: exId('pushUp'), exerciseName: 'Bodyweight Push Up', sets: '2', reps: '15', rest: '30', rpe: '', notes: '' },
      { exerciseId: exId('gobletSquat'), exerciseName: 'Dumbbell Goblet Squat', sets: '2', reps: '10', rest: '30', rpe: '', notes: '' },
    ],
    workout: [
      { exerciseId: exId('gobletSquat'), exerciseName: 'Dumbbell Goblet Squat', sets: '4', reps: '12', rest: '60', rpe: '7', notes: '' },
      { exerciseId: exId('revLunge'), exerciseName: 'Barbell Back Rack Alternating Reverse Lunge', sets: '3', reps: '10', rest: '60', rpe: '7', notes: 'Each leg' },
      { exerciseId: exId('rdl'), exerciseName: 'Barbell Romanian Deadlift', sets: '3', reps: '12', rest: '60', rpe: '7', notes: '' },
    ],
    cooldown: [
      { exerciseId: exId('plank'), exerciseName: 'Bodyweight Forearm Plank', sets: '3', reps: '60s', rest: '30', rpe: '', notes: '' },
    ],
  }},
  // Quintin Stokes-Waller - 3 packets
  { name: 'Quintin — Upper Body Hypertrophy', training_phase: 'Hypertrophy', load: 'Medium', sections: {
    warmup: [
      { exerciseId: exId('pushUp'), exerciseName: 'Bodyweight Push Up', sets: '2', reps: '12', rest: '30', rpe: '', notes: '' },
    ],
    workout: [
      { exerciseId: exId('inclineBench'), exerciseName: 'Barbell Incline Bench Press', sets: '4', reps: '10', rest: '90', rpe: '7', notes: 'Tempo 3-1-1-0' },
      { exerciseId: exId('bentRow'), exerciseName: 'Barbell Bent Over Row', sets: '4', reps: '10', rest: '90', rpe: '7', notes: '' },
      { exerciseId: exId('ohp'), exerciseName: 'Barbell Overhead Press', sets: '3', reps: '10', rest: '90', rpe: '7', notes: '' },
      { exerciseId: exId('cableFly'), exerciseName: 'Double Cable Chest Fly', sets: '3', reps: '12', rest: '60', rpe: '', notes: '' },
      { exerciseId: exId('bbCurl'), exerciseName: 'Barbell Bicep Curl', sets: '3', reps: '12', rest: '60', rpe: '7', notes: '' },
    ],
    cooldown: [
      { exerciseId: exId('sbDeadBug'), exerciseName: 'Stability Ball Dead Bug', sets: '2', reps: '12', rest: '30', rpe: '', notes: '' },
    ],
  }},
  { name: 'Quintin — Lower Body Strength', training_phase: 'Strength', load: 'High', sections: {
    warmup: [
      { exerciseId: exId('gluteBridge'), exerciseName: 'Bodyweight Glute Bridge', sets: '2', reps: '12', rest: '30', rpe: '', notes: '' },
      { exerciseId: exId('gobletSquat'), exerciseName: 'Dumbbell Goblet Squat', sets: '2', reps: '10', rest: '30', rpe: '', notes: '' },
    ],
    workout: [
      { exerciseId: exId('boxSquat'), exerciseName: 'Barbell Box Back Squat', sets: '5', reps: '5', rest: '180', rpe: '8', notes: '' },
      { exerciseId: exId('rdl'), exerciseName: 'Barbell Romanian Deadlift', sets: '4', reps: '8', rest: '120', rpe: '7', notes: '' },
      { exerciseId: exId('bss'), exerciseName: 'Barbell Back Rack Bulgarian Split Squat', sets: '3', reps: '8', rest: '90', rpe: '7', notes: 'Each leg' },
      { exerciseId: exId('hipThrust'), exerciseName: 'Barbell Hip Thrust', sets: '4', reps: '8', rest: '90', rpe: '8', notes: '' },
    ],
    cooldown: [
      { exerciseId: exId('plank'), exerciseName: 'Bodyweight Forearm Plank', sets: '3', reps: '45s', rest: '30', rpe: '', notes: '' },
    ],
  }},
  { name: 'Quintin — Full Body Circuit', training_phase: 'Conditioning', load: 'Medium', sections: {
    warmup: [
      { exerciseId: exId('birdDog'), exerciseName: 'Bodyweight Bird Dog', sets: '2', reps: '8', rest: '30', rpe: '', notes: '' },
    ],
    workout: [
      { exerciseId: exId('deadlift'), exerciseName: 'Barbell Conventional Deadlift', sets: '3', reps: '8', rest: '90', rpe: '7', notes: '' },
      { exerciseId: exId('benchPress'), exerciseName: 'Barbell Bench Press', sets: '3', reps: '10', rest: '60', rpe: '7', notes: '' },
      { exerciseId: exId('walkLunge'), exerciseName: 'Barbell Back Rack Walking Lunge', sets: '3', reps: '12', rest: '60', rpe: '', notes: 'Each leg' },
      { exerciseId: exId('facePull'), exerciseName: 'Cable Face Pull', sets: '3', reps: '15', rest: '45', rpe: '', notes: '' },
    ],
    cooldown: [
      { exerciseId: exId('russianTwist'), exerciseName: 'Stability Ball Russian Twist', sets: '3', reps: '20', rest: '30', rpe: '', notes: '' },
    ],
  }},
  // Khatide Vilakazi - 3 packets
  { name: 'Khatide — Push Focus', training_phase: 'Hypertrophy', load: 'Medium', sections: {
    warmup: [
      { exerciseId: exId('pushUp'), exerciseName: 'Bodyweight Push Up', sets: '2', reps: '15', rest: '30', rpe: '', notes: '' },
    ],
    workout: [
      { exerciseId: exId('benchPress'), exerciseName: 'Barbell Bench Press', sets: '4', reps: '8', rest: '120', rpe: '7', notes: '' },
      { exerciseId: exId('inclineBench'), exerciseName: 'Barbell Incline Bench Press', sets: '3', reps: '10', rest: '90', rpe: '7', notes: '' },
      { exerciseId: exId('ohp'), exerciseName: 'Barbell Overhead Press', sets: '3', reps: '10', rest: '90', rpe: '7', notes: '' },
      { exerciseId: exId('skullCrusher'), exerciseName: 'Barbell Decline Bench Skull Crusher', sets: '3', reps: '12', rest: '60', rpe: '', notes: '' },
    ],
    cooldown: [
      { exerciseId: exId('plank'), exerciseName: 'Bodyweight Forearm Plank', sets: '3', reps: '45s', rest: '30', rpe: '', notes: '' },
    ],
  }},
  { name: 'Khatide — Pull Focus', training_phase: 'Strength', load: 'High', sections: {
    warmup: [
      { exerciseId: exId('deadBug'), exerciseName: 'Bodyweight Dead Bug', sets: '2', reps: '10', rest: '30', rpe: '', notes: '' },
    ],
    workout: [
      { exerciseId: exId('deadlift'), exerciseName: 'Barbell Conventional Deadlift', sets: '5', reps: '5', rest: '180', rpe: '8', notes: '' },
      { exerciseId: exId('bentRow'), exerciseName: 'Barbell Bent Over Row', sets: '4', reps: '8', rest: '90', rpe: '7', notes: '' },
      { exerciseId: exId('facePull'), exerciseName: 'Cable Face Pull', sets: '3', reps: '15', rest: '60', rpe: '', notes: '' },
      { exerciseId: exId('bbCurl'), exerciseName: 'Barbell Bicep Curl', sets: '3', reps: '12', rest: '60', rpe: '7', notes: '' },
    ],
    cooldown: [
      { exerciseId: exId('sbDeadBug'), exerciseName: 'Stability Ball Dead Bug', sets: '2', reps: '10', rest: '30', rpe: '', notes: '' },
    ],
  }},
  { name: 'Khatide — Legs & Core', training_phase: 'Strength', load: 'High', sections: {
    warmup: [
      { exerciseId: exId('gluteBridge'), exerciseName: 'Bodyweight Glute Bridge', sets: '2', reps: '12', rest: '30', rpe: '', notes: '' },
      { exerciseId: exId('birdDog'), exerciseName: 'Bodyweight Bird Dog', sets: '2', reps: '8', rest: '30', rpe: '', notes: '' },
    ],
    workout: [
      { exerciseId: exId('boxSquat'), exerciseName: 'Barbell Box Back Squat', sets: '5', reps: '5', rest: '180', rpe: '8', notes: '' },
      { exerciseId: exId('rdl'), exerciseName: 'Barbell Romanian Deadlift', sets: '4', reps: '8', rest: '120', rpe: '7', notes: '' },
      { exerciseId: exId('bss'), exerciseName: 'Barbell Back Rack Bulgarian Split Squat', sets: '3', reps: '8', rest: '90', rpe: '7', notes: 'Each leg' },
      { exerciseId: exId('nordic'), exerciseName: 'Bodyweight Nordic Hamstring Curl', sets: '3', reps: '5', rest: '90', rpe: '', notes: 'Slow eccentric' },
    ],
    cooldown: [
      { exerciseId: exId('russianTwist'), exerciseName: 'Stability Ball Russian Twist', sets: '3', reps: '20', rest: '30', rpe: '', notes: '' },
      { exerciseId: exId('plank'), exerciseName: 'Bodyweight Forearm Plank', sets: '3', reps: '60s', rest: '30', rpe: '', notes: '' },
    ],
  }},
];

for (const p of packets) {
  const { error } = await sb.from('workout_templates').insert({
    id: uuid(), user_id: USER_ID, name: p.name,
    training_phase: p.training_phase, load: p.load, sections: p.sections,
    created_at: new Date().toISOString(),
  });
  if (error) console.error(`  ✗ ${p.name}: ${error.message}`);
  else console.log(`  ✓ ${p.name}`);
}

// ─── 6. Create Scheduled Sessions ────────────────────────────────────────────
console.log('\nCreating scheduled sessions...');

// Check column structure first
const { data: colCheck } = await sb.from('scheduled_sessions').select('*').limit(0);

const sessions = [
  // Past completed sessions (workout history)
  { title: 'Eric — Strength Session A', date: d(-7), time: '07:00', target_type: 'Individual', target_id: eric.id, training_phase: 'Strength', load: 'High', status: 'Completed', actual_duration: 55 },
  { title: 'Quintin — Upper Body', date: d(-6), time: '08:00', target_type: 'Individual', target_id: quintin.id, training_phase: 'Hypertrophy', load: 'Medium', status: 'Completed', actual_duration: 48 },
  { title: 'Khatide — Pull Focus', date: d(-5), time: '06:30', target_type: 'Individual', target_id: khatide.id, training_phase: 'Strength', load: 'High', status: 'Completed', actual_duration: 52 },
  { title: 'Eric — Power Session', date: d(-4), time: '07:00', target_type: 'Individual', target_id: eric.id, training_phase: 'Power', load: 'High', status: 'Completed', actual_duration: 45 },
  { title: 'Chelsea Team Session', date: d(-3), time: '09:00', target_type: 'Team', target_id: chelseaId, training_phase: 'Conditioning', load: 'Medium', status: 'Completed', actual_duration: 60 },
  { title: 'Quintin — Lower Body', date: d(-2), time: '07:30', target_type: 'Individual', target_id: quintin.id, training_phase: 'Strength', load: 'High', status: 'Completed', actual_duration: 50 },
  // Upcoming scheduled sessions
  { title: 'Eric — Conditioning', date: d(0), time: '07:00', target_type: 'Individual', target_id: eric.id, training_phase: 'Conditioning', load: 'Medium', status: 'Scheduled' },
  { title: 'Khatide — Push Focus', date: d(0), time: '16:00', target_type: 'Individual', target_id: khatide.id, training_phase: 'Hypertrophy', load: 'Medium', status: 'Scheduled' },
  { title: 'Chelsea Gym Session', date: d(1), time: '10:00', target_type: 'Team', target_id: chelseaId, training_phase: 'Strength', load: 'High', status: 'Scheduled' },
  { title: 'Quintin — Full Body Circuit', date: d(2), time: '08:00', target_type: 'Individual', target_id: quintin.id, training_phase: 'Conditioning', load: 'Medium', status: 'Scheduled' },
  { title: 'Eric — Strength Session A', date: d(3), time: '07:00', target_type: 'Individual', target_id: eric.id, training_phase: 'Strength', load: 'High', status: 'Scheduled' },
  { title: 'Khatide — Legs & Core', date: d(4), time: '06:30', target_type: 'Individual', target_id: khatide.id, training_phase: 'Strength', load: 'High', status: 'Scheduled' },
  { title: 'Chelsea Recovery Session', date: d(5), time: '10:00', target_type: 'Team', target_id: chelseaId, training_phase: 'Recovery', load: 'Low', status: 'Scheduled' },
  { title: 'Eric — Power Session', date: d(7), time: '07:00', target_type: 'Individual', target_id: eric.id, training_phase: 'Power', load: 'High', status: 'Scheduled' },
  { title: 'Quintin — Upper Body', date: d(8), time: '08:00', target_type: 'Individual', target_id: quintin.id, training_phase: 'Hypertrophy', load: 'Medium', status: 'Scheduled' },
  { title: 'Khatide — Pull Focus', date: d(10), time: '06:30', target_type: 'Individual', target_id: khatide.id, training_phase: 'Strength', load: 'High', status: 'Scheduled' },
];

for (const s of sessions) {
  const { error } = await sb.from('scheduled_sessions').insert({
    id: uuid(),
    user_id: USER_ID,
    target_id: s.target_id,
    target_type: s.target_type,
    date: s.date,
    title: s.title,
    load: s.load,
    training_phase: s.training_phase,
    status: s.status,
    planned_duration: 60,
    actual_duration: s.actual_duration ?? null,
    exercise_ids: [],
    notes: null,
  });
  if (error) console.error(`  ✗ ${s.title} (${s.date}): ${error.message}`);
  else console.log(`  ✓ ${s.title} — ${s.date} [${s.status}]`);
}

console.log('\n✅ Seed complete!');
