// @ts-nocheck
// ─── Test Registry ─────────────────────────────────────────────────
// Data-driven definitions for all sports science tests.
// Each test is a config object; the generic TestEntryForm renders any test.

// ─── Types ─────────────────────────────────────────────────────────

export type TestCategory =
  | 'musculoskeletal'
  | 'strength_power'
  | 'speed_agility'
  | 'flexibility'
  | 'aerobic'
  | 'anaerobic'
  | 'anthropometry'
  | 'sport_specific';

export interface NormativeBand {
  label: string;                     // e.g. "Elite", "Good", "Average", "Below Average"
  color: string;                     // Tailwind color class
  min?: number;
  max?: number;
}

export interface AgeGroupNorms {
  label: string;                     // e.g. "18-25"
  minAge: number;
  maxAge: number;
  male?: NormativeBand[];
  female?: NormativeBand[];
  bands?: NormativeBand[];
}

export interface NormativeConfig {
  primaryField: string;              // field key to compare against
  genderSpecific?: boolean;
  male?: NormativeBand[];
  female?: NormativeBand[];
  bands?: NormativeBand[];           // when NOT gender-specific
  ageGroups?: AgeGroupNorms[];       // when age-specific norms available
}

export interface TestField {
  key: string;                       // JSONB storage key
  label: string;
  type: 'number' | 'number_pair' | 'time_seconds' | 'select' | 'score_pills' | 'pass_fail' | 'text' | 'calculated';
  unit?: string;                     // 'kg', 'cm', 's', 'N', 'W', '%', '°'
  options?: string[];                // for 'select'
  pillValues?: number[];             // for 'score_pills' (e.g. [0,1,2,3])
  required?: boolean;
  min?: number;
  max?: number;
  step?: number;
  bilateral?: boolean;               // renders _left/_right inputs with auto asymmetry calc
  placeholder?: string;
  helpText?: string;
}

export interface TestCalculation {
  key: string;
  label: string;
  unit?: string;
  formula: (values: Record<string, any>) => number | null;
}

export interface TestDefinition {
  id: string;                        // = test_type in assessments table
  name: string;
  shortName?: string;
  category: TestCategory;
  description: string;
  fields: TestField[];
  calculations?: TestCalculation[];
  norms?: NormativeConfig;
  equipmentRequired?: string[];
  estimatedDuration?: string;
  customComponent?: boolean;         // true → renders dedicated component (e.g. HamstringReport)
  vbtFields?: TestField[];           // VBT tab fields (velocity-based training) — only for barbell tests
  vbtCalculations?: TestCalculation[]; // VBT calculated metrics
}

export interface CategoryInfo {
  id: TestCategory;
  name: string;
  description: string;
  icon: string;                      // lucide icon name
  testCount: number;
}

// ─── VBT (Velocity-Based Training) shared field definitions ────────
// Reused across all barbell-based tests that support VBT tracking.
const VBT_FIELDS: TestField[] = [
  { key: 'vbt_load', label: 'Load', type: 'number', unit: 'kg', required: true, helpText: 'Weight on the bar for this set' },
  { key: 'vbt_mean_velocity', label: 'Mean Velocity', type: 'number', unit: 'm/s', required: true, step: 0.01, helpText: 'Mean concentric velocity from encoder/sensor' },
  { key: 'vbt_peak_velocity', label: 'Peak Velocity', type: 'number', unit: 'm/s', step: 0.01, helpText: 'Peak velocity during concentric phase' },
  { key: 'vbt_reps', label: 'Reps', type: 'number', min: 1, max: 30, helpText: 'Number of reps at this load' },
];

const VBT_CALCULATIONS: TestCalculation[] = [
  { key: 'vbt_e1rm', label: 'Estimated 1RM', unit: 'kg',
    formula: (v) => {
      if (!v.vbt_load || !v.vbt_mean_velocity) return null;
      // Jidovtseff et al. load-velocity linear regression approach:
      // At 1RM, mean velocity ≈ 0.17 m/s (back squat) — we use a generalised minimum velocity threshold
      const mvt = 0.2; // minimum velocity threshold (m/s) — conservative general value
      const mv = v.vbt_mean_velocity;
      if (mv <= mvt) return v.vbt_load; // already at/below 1RM velocity
      // Linear extrapolation: e1RM = load × (mv / mvt) simplified to load / (1 - ((mv - mvt) / mv))
      return +(v.vbt_load / (mvt / mv)).toFixed(1);
    }},
  { key: 'vbt_zone', label: 'Velocity Zone', unit: '',
    formula: (v) => {
      const mv = v.vbt_mean_velocity;
      if (!mv) return null;
      if (mv > 1.0) return 'Speed-Strength';
      if (mv > 0.75) return 'Power';
      if (mv > 0.5) return 'Strength-Speed';
      if (mv > 0.3) return 'Max Strength';
      return 'Near 1RM';
    }},
  { key: 'vbt_intensity', label: 'Est. Intensity', unit: '%',
    formula: (v) => {
      const mv = v.vbt_mean_velocity;
      if (!mv) return null;
      // Generalised mean velocity → %1RM mapping (Gonzalez-Badillo et al.)
      const pct = Math.round((-51.7 * mv + 114.3));
      return Math.max(30, Math.min(100, pct));
    }},
];

// ─── Categories ────────────────────────────────────────────────────

export const TEST_CATEGORIES: CategoryInfo[] = [
  { id: 'musculoskeletal', name: 'Musculoskeletal / Movement', description: 'FMS, Y-Balance, NordBord & Movement Screening', icon: 'Activity', testCount: 15 },
  { id: 'strength_power',  name: 'Strength / Power',           description: '1RM, CMJ, IMTP, Drop Jump & Power Tests',    icon: 'Dumbbell', testCount: 20 },
  { id: 'speed_agility',   name: 'Speed / Agility',            description: 'Sprints, 505, T-Test & Change of Direction',  icon: 'Zap',      testCount: 15 },
  { id: 'flexibility',     name: 'Flexibility / Mobility',     description: 'Sit & Reach, ROM & Shoulder Mobility',        icon: 'Move',     testCount: 8 },
  { id: 'aerobic',         name: 'Aerobic Capacity',           description: 'VO₂max, Beep Test, Yo-Yo & Cooper Test',      icon: 'Heart',    testCount: 10 },
  { id: 'anaerobic',       name: 'Anaerobic Capacity',         description: 'Wingate, RAST & Repeat Sprint',               icon: 'Flame',    testCount: 5 },
  { id: 'anthropometry',   name: 'Anthropometry',              description: 'Height, Weight, Skinfolds & Body Composition', icon: 'Ruler',    testCount: 9 },
  { id: 'sport_specific',  name: 'Sport-Specific',             description: 'Ice Hockey, Sport-Specific Endurance',         icon: 'Trophy',   testCount: 3 },
];

// ─── Helper: FMS score pills field ────────────────────────────────

const fmsScoreField = (key: string, label: string): TestField => ({
  key, label, type: 'score_pills', pillValues: [0, 1, 2, 3], required: true,
  helpText: '0 = Pain, 1 = Unable, 2 = With compensation, 3 = Perfect',
});

const bilateralFmsField = (key: string, label: string): TestField[] => [
  { key: `${key}_left`, label: `${label} (Left)`, type: 'score_pills', pillValues: [0, 1, 2, 3], required: true },
  { key: `${key}_right`, label: `${label} (Right)`, type: 'score_pills', pillValues: [0, 1, 2, 3], required: true },
];

// ─── Helper: Jackson-Pollock Body Density & Body Fat % Formulas ──────

/** Jackson-Pollock 3-site body density (male: chest, abdomen, thigh; female: tricep, suprailiac, thigh) */
function jacksonPollock3(sum: number, age: number, isMale: boolean): { density: number; bodyFat: number } | null {
  if (!sum || !age) return null;
  const s = sum;
  const density = isMale
    ? 1.10938 - (0.0008267 * s) + (0.0000016 * s * s) - (0.0002574 * age)
    : 1.0994921 - (0.0009929 * s) + (0.0000023 * s * s) - (0.0001392 * age);
  const bodyFat = (495 / density) - 450; // Siri equation
  return { density: +density.toFixed(5), bodyFat: +Math.max(bodyFat, 0).toFixed(1) };
}

/** Jackson-Pollock 7-site body density (all 7 sites) */
function jacksonPollock7(sum: number, age: number, isMale: boolean): { density: number; bodyFat: number } | null {
  if (!sum || !age) return null;
  const s = sum;
  const density = isMale
    ? 1.112 - (0.00043499 * s) + (0.00000055 * s * s) - (0.00028826 * age)
    : 1.097 - (0.00046971 * s) + (0.00000056 * s * s) - (0.00012828 * age);
  const bodyFat = (495 / density) - 450; // Siri equation
  return { density: +density.toFixed(5), bodyFat: +Math.max(bodyFat, 0).toFixed(1) };
}

// ─── Helper: Beep Test Lookup Table ──────────────────────────────────
// Maps level → number of shuttles at that level, cumulative distance

const BEEP_TEST_TABLE: { level: number; shuttles: number; speed: number }[] = [
  { level: 1,  shuttles: 7,  speed: 8.0 },
  { level: 2,  shuttles: 8,  speed: 9.0 },
  { level: 3,  shuttles: 8,  speed: 9.5 },
  { level: 4,  shuttles: 9,  speed: 10.0 },
  { level: 5,  shuttles: 9,  speed: 10.5 },
  { level: 6,  shuttles: 10, speed: 11.0 },
  { level: 7,  shuttles: 10, speed: 11.5 },
  { level: 8,  shuttles: 11, speed: 12.0 },
  { level: 9,  shuttles: 11, speed: 12.5 },
  { level: 10, shuttles: 11, speed: 13.0 },
  { level: 11, shuttles: 12, speed: 13.5 },
  { level: 12, shuttles: 12, speed: 14.0 },
  { level: 13, shuttles: 13, speed: 14.5 },
  { level: 14, shuttles: 13, speed: 15.0 },
  { level: 15, shuttles: 13, speed: 15.5 },
  { level: 16, shuttles: 14, speed: 16.0 },
  { level: 17, shuttles: 14, speed: 16.5 },
  { level: 18, shuttles: 15, speed: 17.0 },
  { level: 19, shuttles: 15, speed: 17.5 },
  { level: 20, shuttles: 16, speed: 18.0 },
  { level: 21, shuttles: 16, speed: 18.5 },
];

/** Calculate total shuttles and distance from beep test level + shuttle */
function beepTestLookup(level: number, shuttle: number): { totalShuttles: number; totalDistance: number; estimatedVO2max: number } | null {
  if (!level || level < 1 || level > 21) return null;
  let totalShuttles = 0;
  for (let i = 0; i < BEEP_TEST_TABLE.length; i++) {
    const row = BEEP_TEST_TABLE[i];
    if (row.level < level) {
      totalShuttles += row.shuttles;
    } else if (row.level === level) {
      totalShuttles += Math.min(shuttle || row.shuttles, row.shuttles);
      break;
    }
  }
  const totalDistance = totalShuttles * 20; // each shuttle is 20m
  // Léger formula: VO2max = 31.025 + 3.238 * speed - 3.248 * age + 0.1536 * speed * age
  // Simplified (no age): VO2max ≈ 3.46 * speed + 12.2
  const currentLevel = BEEP_TEST_TABLE.find(r => r.level === level);
  const speed = currentLevel?.speed || (8 + (level - 1) * 0.5);
  const estimatedVO2max = +(3.46 * speed + 12.2 - 0.16).toFixed(1);
  return { totalShuttles, totalDistance, estimatedVO2max };
}

/** Exported for components to get beep test info */
export { BEEP_TEST_TABLE, beepTestLookup };

// ─── Helper: Age-aware norm lookup ───────────────────────────────────

/** Get normative bands considering age if available */
export function getNormBands(
  norms: NormativeConfig,
  gender?: 'male' | 'female',
  age?: number
): NormativeBand[] {
  // Try age-specific first
  if (norms.ageGroups && age) {
    const ageGroup = norms.ageGroups.find(g => age >= g.minAge && age <= g.maxAge);
    if (ageGroup) {
      if (norms.genderSpecific && gender) {
        return (gender === 'female' ? ageGroup.female : ageGroup.male) || [];
      }
      return ageGroup.bands || [];
    }
  }
  // Fall back to standard bands
  if (norms.genderSpecific && gender) {
    return (gender === 'female' ? norms.female : norms.male) || [];
  }
  return norms.bands || [];
}

// ─── MUSCULOSKELETAL / MOVEMENT TESTS (15) ─────────────────────────

const musculoskeletalTests: TestDefinition[] = [
  // 1. FMS — Deep Squat
  {
    id: 'fms_deep_squat', name: 'FMS: Deep Squat', shortName: 'Deep Squat',
    category: 'musculoskeletal',
    description: 'Assess bilateral mobility of hips, knees, and ankles. Dowel held overhead.',
    fields: [fmsScoreField('score', 'Score')],
    equipmentRequired: ['FMS Kit (dowel)'],
    estimatedDuration: '2 min',
  },
  // 2. FMS — Hurdle Step
  {
    id: 'fms_hurdle_step', name: 'FMS: Hurdle Step', shortName: 'Hurdle Step',
    category: 'musculoskeletal',
    description: 'Step over hurdle at tibial tuberosity height. Tests stride mechanics.',
    fields: bilateralFmsField('score', 'Score'),
    equipmentRequired: ['FMS Kit (hurdle, dowel)'],
    estimatedDuration: '2 min',
  },
  // 3. FMS — In-Line Lunge
  {
    id: 'fms_inline_lunge', name: 'FMS: In-Line Lunge', shortName: 'In-Line Lunge',
    category: 'musculoskeletal',
    description: 'Lunge with dowel behind back. Assesses hip and ankle mobility, stability.',
    fields: bilateralFmsField('score', 'Score'),
    equipmentRequired: ['FMS Kit (dowel, 2×4 board)'],
    estimatedDuration: '2 min',
  },
  // 4. FMS — Shoulder Mobility
  {
    id: 'fms_shoulder_mobility', name: 'FMS: Shoulder Mobility', shortName: 'Shoulder Mob.',
    category: 'musculoskeletal',
    description: 'Reach behind back with both hands simultaneously. Tests shoulder ROM.',
    fields: [
      ...bilateralFmsField('score', 'Score'),
      { key: 'clearing_pain', label: 'Clearing Test Pain?', type: 'pass_fail' },
    ],
    estimatedDuration: '2 min',
  },
  // 5. FMS — Active Straight Leg Raise
  {
    id: 'fms_aslr', name: 'FMS: Active Straight Leg Raise', shortName: 'ASLR',
    category: 'musculoskeletal',
    description: 'Supine active leg raise. Tests hamstring and hip flexor flexibility.',
    fields: bilateralFmsField('score', 'Score'),
    estimatedDuration: '2 min',
  },
  // 6. FMS — Trunk Stability Push-Up
  {
    id: 'fms_trunk_pushup', name: 'FMS: Trunk Stability Push-Up', shortName: 'Trunk Push-Up',
    category: 'musculoskeletal',
    description: 'Push-up from specified hand position. Assesses core trunk stability.',
    fields: [
      fmsScoreField('score', 'Score'),
      { key: 'clearing_pain', label: 'Clearing Test Pain?', type: 'pass_fail' },
    ],
    estimatedDuration: '2 min',
  },
  // 7. FMS — Rotary Stability
  {
    id: 'fms_rotary_stability', name: 'FMS: Rotary Stability', shortName: 'Rotary Stab.',
    category: 'musculoskeletal',
    description: 'Quadruped same-side/diagonal reach. Tests multi-plane trunk stability.',
    fields: [
      ...bilateralFmsField('score', 'Score'),
      { key: 'clearing_pain', label: 'Clearing Test Pain?', type: 'pass_fail' },
    ],
    estimatedDuration: '2 min',
  },
  // 8. Movement Competency Screen (MCS)
  {
    id: 'mcs', name: 'Movement Competency Screen (MCS)', shortName: 'MCS',
    category: 'musculoskeletal',
    description: '7-movement screen assessing fundamental movement competency. Each scored 1–3, total out of 21.',
    fields: [
      { key: 'overhead_squat', label: 'Overhead Squat', type: 'number', min: 1, max: 3 },
      { key: 'single_leg_squat', label: 'Single Leg Squat', type: 'number', min: 1, max: 3 },
      { key: 'push_up', label: 'Push-Up', type: 'number', min: 1, max: 3 },
      { key: 'lunge', label: 'Lunge', type: 'number', min: 1, max: 3 },
      { key: 'bend_and_lift', label: 'Bend & Lift', type: 'number', min: 1, max: 3 },
      { key: 'step_down', label: 'Step Down', type: 'number', min: 1, max: 3 },
      { key: 'twist', label: 'Twist', type: 'number', min: 1, max: 3 },
    ],
    computeTotal: (vals: Record<string, any>) =>
      ['overhead_squat', 'single_leg_squat', 'push_up', 'lunge', 'bend_and_lift', 'step_down', 'twist']
        .reduce((s, k) => s + (Number(vals[k]) || 0), 0),
    maxTotal: 21,
    norms: { elite: 19, good: 16, average: 13, belowAverage: 10 },
    estimatedDuration: '10 min',
  },
  // 9. Y-Balance Test
  {
    id: 'y_balance', name: 'Y-Balance Test', shortName: 'YBT',
    category: 'musculoskeletal',
    description: 'Dynamic balance — reach in 3 directions on single leg. Anterior, PM, PL.',
    fields: [
      { key: 'leg_length', label: 'Leg Length (ASIS to medial malleolus)', type: 'number', unit: 'cm', required: true },
      { key: 'ant_left', label: 'Anterior Left', type: 'number', unit: 'cm', required: true },
      { key: 'ant_right', label: 'Anterior Right', type: 'number', unit: 'cm', required: true },
      { key: 'pm_left', label: 'Posteromedial Left', type: 'number', unit: 'cm', required: true },
      { key: 'pm_right', label: 'Posteromedial Right', type: 'number', unit: 'cm', required: true },
      { key: 'pl_left', label: 'Posterolateral Left', type: 'number', unit: 'cm', required: true },
      { key: 'pl_right', label: 'Posterolateral Right', type: 'number', unit: 'cm', required: true },
    ],
    calculations: [
      { key: 'composite_left', label: 'Composite Left', unit: '%',
        formula: (v) => v.leg_length ? +( ((v.ant_left||0)+(v.pm_left||0)+(v.pl_left||0)) / (v.leg_length*3) * 100 ).toFixed(1) : null },
      { key: 'composite_right', label: 'Composite Right', unit: '%',
        formula: (v) => v.leg_length ? +( ((v.ant_right||0)+(v.pm_right||0)+(v.pl_right||0)) / (v.leg_length*3) * 100 ).toFixed(1) : null },
      { key: 'ant_asymmetry', label: 'Anterior Asymmetry', unit: 'cm',
        formula: (v) => v.ant_left != null && v.ant_right != null ? +Math.abs(v.ant_left - v.ant_right).toFixed(1) : null },
    ],
    norms: {
      primaryField: 'composite_left',
      bands: [
        { label: 'Good', color: 'emerald', min: 94 },
        { label: 'Average', color: 'amber', min: 89, max: 94 },
        { label: 'Increased Risk', color: 'red', max: 89 },
      ],
    },
    equipmentRequired: ['Y-Balance Kit or tape'],
    estimatedDuration: '10-15 min',
  },
  // 9. Single Leg Balance
  {
    id: 'single_leg_balance', name: 'Single Leg Balance Test', shortName: 'SL Balance',
    category: 'musculoskeletal',
    description: 'Static balance on one leg — eyes open & eyes closed.',
    fields: [
      { key: 'eo_left', label: 'Eyes Open — Left (s)', type: 'number', unit: 's', max: 60, required: true },
      { key: 'eo_right', label: 'Eyes Open — Right (s)', type: 'number', unit: 's', max: 60, required: true },
      { key: 'ec_left', label: 'Eyes Closed — Left (s)', type: 'number', unit: 's', max: 45 },
      { key: 'ec_right', label: 'Eyes Closed — Right (s)', type: 'number', unit: 's', max: 45 },
    ],
    norms: {
      primaryField: 'eo_left',
      bands: [
        { label: 'Excellent', color: 'emerald', min: 50 },
        { label: 'Good', color: 'sky', min: 40, max: 50 },
        { label: 'Average', color: 'amber', min: 25, max: 40 },
        { label: 'Below Average', color: 'red', max: 25 },
      ],
    },
    estimatedDuration: '5 min',
  },
  // 10. NordBord Hamstring — custom component
  {
    id: 'nordbord_hamstring', name: 'NordBord Hamstring Strength Test', shortName: 'NordBord',
    category: 'musculoskeletal',
    description: 'Eccentric hamstring strength via Nordic curl. Risk threshold: 340N.',
    fields: [],
    customComponent: true,
    equipmentRequired: ['NordBord (VALD)'],
    estimatedDuration: '10 min',
  },
  // 11. Hip Adduction Squeeze — Short Lever
  {
    id: 'hip_add_short', name: 'Hip Adduction Squeeze (Short Lever)', shortName: 'Add Short',
    category: 'musculoskeletal',
    description: 'Bilateral hip adductor strength at 60° knee flexion. GroinBar/ForceFrame.',
    fields: [
      { key: 'force_left', label: 'Peak Force Left', type: 'number', unit: 'N', required: true },
      { key: 'force_right', label: 'Peak Force Right', type: 'number', unit: 'N', required: true },
      { key: 'body_mass', label: 'Body Mass', type: 'number', unit: 'kg', required: true },
      { key: 'pain_nrs', label: 'Pain (NRS 0-10)', type: 'number', min: 0, max: 10 },
      { key: 'position', label: 'Hip Flexion Angle', type: 'select', options: ['0°', '45°', '60°', '90°'] },
    ],
    calculations: [
      { key: 'rel_strength_left', label: 'Rel. Strength Left', unit: 'N/kg',
        formula: (v) => v.force_left && v.body_mass ? +(v.force_left / v.body_mass).toFixed(2) : null },
      { key: 'rel_strength_right', label: 'Rel. Strength Right', unit: 'N/kg',
        formula: (v) => v.force_right && v.body_mass ? +(v.force_right / v.body_mass).toFixed(2) : null },
      { key: 'asymmetry', label: 'Asymmetry', unit: '%',
        formula: (v) => v.force_left && v.force_right ? +(Math.abs(v.force_left - v.force_right) / Math.max(v.force_left, v.force_right) * 100).toFixed(1) : null },
    ],
    norms: {
      primaryField: 'rel_strength_left', genderSpecific: true,
      male: [
        { label: 'Elite', color: 'emerald', min: 3.5 },
        { label: 'Good', color: 'sky', min: 2.8, max: 3.5 },
        { label: 'Average', color: 'amber', min: 2.0, max: 2.8 },
        { label: 'Below Average', color: 'red', max: 2.0 },
      ],
      female: [
        { label: 'Elite', color: 'emerald', min: 3.0 },
        { label: 'Good', color: 'sky', min: 2.5, max: 3.0 },
        { label: 'Average', color: 'amber', min: 1.8, max: 2.5 },
        { label: 'Below Average', color: 'red', max: 1.8 },
      ],
    },
    equipmentRequired: ['GroinBar / ForceFrame'],
    estimatedDuration: '10 min',
  },
  // 12. Hip Abduction Press — Short Lever
  {
    id: 'hip_abd_short', name: 'Hip Abduction Press (Short Lever)', shortName: 'Abd Short',
    category: 'musculoskeletal',
    description: 'Bilateral hip abductor (glute med) strength. Push knees outward.',
    fields: [
      { key: 'force_left', label: 'Peak Force Left', type: 'number', unit: 'N', required: true },
      { key: 'force_right', label: 'Peak Force Right', type: 'number', unit: 'N', required: true },
      { key: 'body_mass', label: 'Body Mass', type: 'number', unit: 'kg', required: true },
      { key: 'pain_nrs', label: 'Pain (NRS 0-10)', type: 'number', min: 0, max: 10 },
    ],
    calculations: [
      { key: 'rel_strength_left', label: 'Rel. Strength Left', unit: 'N/kg',
        formula: (v) => v.force_left && v.body_mass ? +(v.force_left / v.body_mass).toFixed(2) : null },
      { key: 'rel_strength_right', label: 'Rel. Strength Right', unit: 'N/kg',
        formula: (v) => v.force_right && v.body_mass ? +(v.force_right / v.body_mass).toFixed(2) : null },
      { key: 'asymmetry', label: 'Asymmetry', unit: '%',
        formula: (v) => v.force_left && v.force_right ? +(Math.abs(v.force_left - v.force_right) / Math.max(v.force_left, v.force_right) * 100).toFixed(1) : null },
    ],
    norms: {
      primaryField: 'rel_strength_left', genderSpecific: true,
      male: [
        { label: 'Elite', color: 'emerald', min: 3.0 },
        { label: 'Good', color: 'sky', min: 2.5, max: 3.0 },
        { label: 'Average', color: 'amber', min: 2.0, max: 2.5 },
        { label: 'Below Average', color: 'red', max: 2.0 },
      ],
      female: [
        { label: 'Elite', color: 'emerald', min: 2.5 },
        { label: 'Good', color: 'sky', min: 2.0, max: 2.5 },
        { label: 'Average', color: 'amber', min: 1.5, max: 2.0 },
        { label: 'Below Average', color: 'red', max: 1.5 },
      ],
    },
    equipmentRequired: ['GroinBar / ForceFrame'],
    estimatedDuration: '10 min',
  },
  // 13. Hip Adduction — Long Lever (Copenhagen)
  {
    id: 'hip_add_long', name: 'Hip Adduction Squeeze (Long Lever)', shortName: 'Add Long',
    category: 'musculoskeletal',
    description: 'Copenhagen 5-second squeeze with straight legs. More sensitive to groin pain.',
    fields: [
      { key: 'peak_torque', label: 'Peak Torque', type: 'number', unit: 'Nm/kg', required: true },
      { key: 'body_mass', label: 'Body Mass', type: 'number', unit: 'kg' },
      { key: 'pain_nrs', label: 'Pain (NRS 0-10)', type: 'number', min: 0, max: 10 },
    ],
    equipmentRequired: ['Handheld Dynamometer / ForceFrame'],
    estimatedDuration: '10 min',
  },
  // 14. Hip Abduction — Long Lever
  {
    id: 'hip_abd_long', name: 'Hip Abduction Press (Long Lever)', shortName: 'Abd Long',
    category: 'musculoskeletal',
    description: 'Hip abductor strength with straight legs at ankles.',
    fields: [
      { key: 'peak_force', label: 'Peak Force', type: 'number', unit: 'N', required: true },
      { key: 'body_mass', label: 'Body Mass', type: 'number', unit: 'kg' },
    ],
    equipmentRequired: ['Handheld Dynamometer'],
    estimatedDuration: '10 min',
  },
  // 15. Hip Internal Rotation
  {
    id: 'hip_ir', name: 'Hip Internal Rotation Test', shortName: 'Hip IR',
    category: 'musculoskeletal',
    description: 'Prone hip internal rotation ROM. Normal: 35-45°.',
    fields: [
      { key: 'ir_left', label: 'IR Left', type: 'number', unit: '°', required: true },
      { key: 'ir_right', label: 'IR Right', type: 'number', unit: '°', required: true },
    ],
    calculations: [
      { key: 'asymmetry', label: 'Asymmetry', unit: '°',
        formula: (v) => v.ir_left != null && v.ir_right != null ? +Math.abs(v.ir_left - v.ir_right).toFixed(1) : null },
    ],
    norms: {
      primaryField: 'ir_left',
      bands: [
        { label: 'Normal', color: 'emerald', min: 35, max: 45 },
        { label: 'Limited', color: 'red', max: 30 },
        { label: 'Excessive', color: 'amber', min: 50 },
      ],
    },
    equipmentRequired: ['Goniometer'],
    estimatedDuration: '5 min',
  },
];

// We also need the movement screening tests that don't have dedicated entries above
// (Hip ER, Overhead Squat, Thomas, Ankle DF, Single Leg Squat, Trunk Stability)
const musculoskeletalExtras: TestDefinition[] = [
  {
    id: 'hip_er', name: 'Hip External Rotation Test', shortName: 'Hip ER',
    category: 'musculoskeletal',
    description: 'Prone hip external rotation ROM. Normal: 40-50°.',
    fields: [
      { key: 'er_left', label: 'ER Left', type: 'number', unit: '°', required: true },
      { key: 'er_right', label: 'ER Right', type: 'number', unit: '°', required: true },
    ],
    calculations: [
      { key: 'asymmetry', label: 'Asymmetry', unit: '°',
        formula: (v) => v.er_left != null && v.er_right != null ? +Math.abs(v.er_left - v.er_right).toFixed(1) : null },
    ],
    equipmentRequired: ['Goniometer'],
    estimatedDuration: '5 min',
  },
  {
    id: 'overhead_squat', name: 'Overhead Squat Assessment', shortName: 'OH Squat',
    category: 'musculoskeletal',
    description: 'Screen for mobility limitations with dowel overhead.',
    fields: [
      { key: 'result', label: 'Overall Result', type: 'pass_fail', required: true },
      { key: 'arms_fall', label: 'Arms Fall Forward', type: 'pass_fail' },
      { key: 'heels_lift', label: 'Heels Lift', type: 'pass_fail' },
      { key: 'knee_valgus', label: 'Knee Valgus', type: 'pass_fail' },
      { key: 'forward_lean', label: 'Excessive Forward Lean', type: 'pass_fail' },
      { key: 'notes', label: 'Notes', type: 'text' },
    ],
    estimatedDuration: '5 min',
  },
  {
    id: 'thomas_test', name: 'Thomas Test (Hip Flexor Length)', shortName: 'Thomas',
    category: 'musculoskeletal',
    description: 'Assess hip flexor (iliopsoas, rectus femoris) flexibility.',
    fields: [
      { key: 'grade_left', label: 'Grade Left', type: 'score_pills', pillValues: [0, 1, 2, 3], required: true,
        helpText: '0 = Excellent (below horiz.), 1 = Normal (horizontal), 2 = Moderate tightness, 3 = Severe' },
      { key: 'grade_right', label: 'Grade Right', type: 'score_pills', pillValues: [0, 1, 2, 3], required: true },
      { key: 'notes', label: 'Observations', type: 'text' },
    ],
    equipmentRequired: ['Treatment table'],
    estimatedDuration: '5 min',
  },
  {
    id: 'ankle_df', name: 'Ankle Dorsiflexion Test (WB Lunge)', shortName: 'Ankle DF',
    category: 'musculoskeletal',
    description: 'Weight-bearing lunge test for ankle dorsiflexion ROM.',
    fields: [
      { key: 'distance_left', label: 'Distance Left', type: 'number', unit: 'cm', required: true },
      { key: 'distance_right', label: 'Distance Right', type: 'number', unit: 'cm', required: true },
    ],
    calculations: [
      { key: 'asymmetry', label: 'Asymmetry', unit: 'cm',
        formula: (v) => v.distance_left != null && v.distance_right != null ? +Math.abs(v.distance_left - v.distance_right).toFixed(1) : null },
    ],
    norms: {
      primaryField: 'distance_left',
      bands: [
        { label: 'Excellent', color: 'emerald', min: 12 },
        { label: 'Good', color: 'sky', min: 10, max: 12 },
        { label: 'Average', color: 'amber', min: 8, max: 10 },
        { label: 'Limited', color: 'orange', min: 6, max: 8 },
        { label: 'Severe Restriction', color: 'red', max: 6 },
      ],
    },
    estimatedDuration: '5 min',
  },
  {
    id: 'single_leg_squat', name: 'Single Leg Squat Assessment', shortName: 'SL Squat',
    category: 'musculoskeletal',
    description: 'Dynamic lower extremity control. Observe knee alignment and trunk lean.',
    fields: [
      { key: 'grade_left', label: 'Grade Left', type: 'select', options: ['Good', 'Fair', 'Poor'], required: true },
      { key: 'grade_right', label: 'Grade Right', type: 'select', options: ['Good', 'Fair', 'Poor'], required: true },
      { key: 'knee_valgus_left', label: 'Knee Valgus Left', type: 'pass_fail' },
      { key: 'knee_valgus_right', label: 'Knee Valgus Right', type: 'pass_fail' },
      { key: 'trunk_lean', label: 'Trunk Lean', type: 'pass_fail' },
      { key: 'notes', label: 'Notes', type: 'text' },
    ],
    estimatedDuration: '5 min',
  },
  {
    id: 'trunk_stability', name: 'Trunk Stability Tests', shortName: 'Trunk Stab.',
    category: 'musculoskeletal',
    description: 'Front plank, side plank, prone extension hold times.',
    fields: [
      { key: 'front_plank', label: 'Front Plank', type: 'number', unit: 's', required: true },
      { key: 'side_plank_left', label: 'Side Plank Left', type: 'number', unit: 's' },
      { key: 'side_plank_right', label: 'Side Plank Right', type: 'number', unit: 's' },
      { key: 'prone_ext', label: 'Prone Extension Hold', type: 'number', unit: 's' },
    ],
    norms: {
      primaryField: 'front_plank',
      bands: [
        { label: 'Excellent', color: 'emerald', min: 90 },
        { label: 'Good', color: 'sky', min: 60, max: 90 },
        { label: 'Average', color: 'amber', min: 30, max: 60 },
        { label: 'Below Average', color: 'red', max: 30 },
      ],
    },
    estimatedDuration: '15 min',
  },
];

// ─── STRENGTH / POWER TESTS (20) ──────────────────────────────────

const strengthPowerTests: TestDefinition[] = [
  // 1RM Tests
  {
    id: 'rm_back_squat', name: '1RM Back Squat', shortName: 'Back Squat',
    category: 'strength_power',
    description: 'Maximal back squat strength. Barbell on upper traps/posterior delts.',
    fields: [
      { key: 'weight', label: '1RM Weight', type: 'number', unit: 'kg', required: true },
      { key: 'body_mass', label: 'Body Mass', type: 'number', unit: 'kg', required: true },
    ],
    calculations: [
      { key: 'relative', label: 'Relative Strength', unit: 'x BW',
        formula: (v) => v.weight && v.body_mass ? +(v.weight / v.body_mass).toFixed(2) : null },
    ],
    norms: {
      primaryField: 'relative', genderSpecific: true,
      male: [
        { label: 'Elite', color: 'emerald', min: 2.0 },
        { label: 'Advanced', color: 'sky', min: 1.5, max: 2.0 },
        { label: 'Intermediate', color: 'amber', min: 1.0, max: 1.5 },
        { label: 'Novice', color: 'red', max: 1.0 },
      ],
      female: [
        { label: 'Elite', color: 'emerald', min: 1.5 },
        { label: 'Advanced', color: 'sky', min: 1.0, max: 1.5 },
        { label: 'Intermediate', color: 'amber', min: 0.75, max: 1.0 },
        { label: 'Novice', color: 'red', max: 0.75 },
      ],
    },
    equipmentRequired: ['Barbell', 'Squat rack', 'Plates'],
    estimatedDuration: '30-45 min',
    vbtFields: VBT_FIELDS,
    vbtCalculations: VBT_CALCULATIONS,
  },
  {
    id: 'rm_bench_press', name: '1RM Bench Press', shortName: 'Bench Press',
    category: 'strength_power',
    description: 'Maximal bench press strength. Bar to chest, full lockout.',
    fields: [
      { key: 'weight', label: '1RM Weight', type: 'number', unit: 'kg', required: true },
      { key: 'body_mass', label: 'Body Mass', type: 'number', unit: 'kg', required: true },
    ],
    calculations: [
      { key: 'relative', label: 'Relative Strength', unit: 'x BW',
        formula: (v) => v.weight && v.body_mass ? +(v.weight / v.body_mass).toFixed(2) : null },
    ],
    norms: {
      primaryField: 'relative', genderSpecific: true,
      male: [
        { label: 'Elite', color: 'emerald', min: 1.5 },
        { label: 'Advanced', color: 'sky', min: 1.0, max: 1.5 },
        { label: 'Intermediate', color: 'amber', min: 0.75, max: 1.0 },
        { label: 'Novice', color: 'red', max: 0.75 },
      ],
      female: [
        { label: 'Elite', color: 'emerald', min: 1.0 },
        { label: 'Advanced', color: 'sky', min: 0.75, max: 1.0 },
        { label: 'Intermediate', color: 'amber', min: 0.5, max: 0.75 },
        { label: 'Novice', color: 'red', max: 0.5 },
      ],
    },
    equipmentRequired: ['Barbell', 'Bench', 'Plates'],
    estimatedDuration: '30-45 min',
    vbtFields: VBT_FIELDS,
    vbtCalculations: VBT_CALCULATIONS,
  },
  {
    id: 'rm_deadlift', name: '1RM Deadlift', shortName: 'Deadlift',
    category: 'strength_power',
    description: 'Maximal deadlift strength. Conventional or sumo.',
    fields: [
      { key: 'weight', label: '1RM Weight', type: 'number', unit: 'kg', required: true },
      { key: 'body_mass', label: 'Body Mass', type: 'number', unit: 'kg', required: true },
      { key: 'stance', label: 'Stance', type: 'select', options: ['Conventional', 'Sumo'] },
    ],
    calculations: [
      { key: 'relative', label: 'Relative Strength', unit: 'x BW',
        formula: (v) => v.weight && v.body_mass ? +(v.weight / v.body_mass).toFixed(2) : null },
    ],
    norms: {
      primaryField: 'relative', genderSpecific: true,
      male: [
        { label: 'Elite', color: 'emerald', min: 2.5 },
        { label: 'Advanced', color: 'sky', min: 2.0, max: 2.5 },
        { label: 'Intermediate', color: 'amber', min: 1.5, max: 2.0 },
        { label: 'Novice', color: 'red', max: 1.5 },
      ],
      female: [
        { label: 'Elite', color: 'emerald', min: 2.0 },
        { label: 'Advanced', color: 'sky', min: 1.5, max: 2.0 },
        { label: 'Intermediate', color: 'amber', min: 1.0, max: 1.5 },
        { label: 'Novice', color: 'red', max: 1.0 },
      ],
    },
    equipmentRequired: ['Barbell', 'Platform', 'Plates'],
    estimatedDuration: '30-45 min',
    vbtFields: VBT_FIELDS,
    vbtCalculations: VBT_CALCULATIONS,
  },
  {
    id: 'rm_front_squat', name: '1RM Front Squat', shortName: 'Front Squat',
    category: 'strength_power',
    description: 'Maximal front squat strength. Bar in front rack position.',
    fields: [
      { key: 'weight', label: '1RM Weight', type: 'number', unit: 'kg', required: true },
      { key: 'body_mass', label: 'Body Mass', type: 'number', unit: 'kg', required: true },
    ],
    calculations: [
      { key: 'relative', label: 'Relative Strength', unit: 'x BW',
        formula: (v) => v.weight && v.body_mass ? +(v.weight / v.body_mass).toFixed(2) : null },
    ],
    equipmentRequired: ['Barbell', 'Squat rack', 'Plates'],
    estimatedDuration: '30-45 min',
    vbtFields: VBT_FIELDS,
    vbtCalculations: VBT_CALCULATIONS,
  },
  {
    id: 'rm_ohp', name: '1RM Overhead Press', shortName: 'OHP',
    category: 'strength_power',
    description: 'Maximal overhead pressing strength. Standing strict press.',
    fields: [
      { key: 'weight', label: '1RM Weight', type: 'number', unit: 'kg', required: true },
      { key: 'body_mass', label: 'Body Mass', type: 'number', unit: 'kg', required: true },
    ],
    calculations: [
      { key: 'relative', label: 'Relative Strength', unit: 'x BW',
        formula: (v) => v.weight && v.body_mass ? +(v.weight / v.body_mass).toFixed(2) : null },
    ],
    equipmentRequired: ['Barbell', 'Plates'],
    estimatedDuration: '30-45 min',
    vbtFields: VBT_FIELDS,
    vbtCalculations: VBT_CALCULATIONS,
  },
  // IMTP
  {
    id: 'imtp_basic', name: 'IMTP — Basic Peak Force', shortName: 'IMTP Basic',
    category: 'strength_power',
    description: 'Isometric Mid-Thigh Pull. Peak force and relative strength.',
    fields: [
      { key: 'peak_force', label: 'Peak Force', type: 'number', unit: 'N', required: true },
      { key: 'body_mass', label: 'Body Mass', type: 'number', unit: 'kg', required: true },
      { key: 'time_to_peak', label: 'Time to Peak Force', type: 'number', unit: 's' },
    ],
    calculations: [
      { key: 'relative_force', label: 'Relative Peak Force', unit: 'N/kg',
        formula: (v) => v.peak_force && v.body_mass ? +(v.peak_force / v.body_mass).toFixed(1) : null },
    ],
    norms: {
      primaryField: 'relative_force', genderSpecific: true,
      male: [
        { label: 'Elite', color: 'emerald', min: 40 },
        { label: 'Good', color: 'sky', min: 35, max: 40 },
        { label: 'Average', color: 'amber', min: 30, max: 35 },
        { label: 'Below Average', color: 'red', max: 30 },
      ],
      female: [
        { label: 'Elite', color: 'emerald', min: 35 },
        { label: 'Good', color: 'sky', min: 30, max: 35 },
        { label: 'Average', color: 'amber', min: 25, max: 30 },
        { label: 'Below Average', color: 'red', max: 25 },
      ],
    },
    equipmentRequired: ['Force plate', 'IMTP rig'],
    estimatedDuration: '15 min',
  },
  {
    id: 'imtp_advanced', name: 'IMTP — Advanced Metrics', shortName: 'IMTP Adv',
    category: 'strength_power',
    description: 'IMTP with time-specific forces, RFD, and impulse.',
    fields: [
      { key: 'peak_force', label: 'Peak Force', type: 'number', unit: 'N', required: true },
      { key: 'body_mass', label: 'Body Mass', type: 'number', unit: 'kg', required: true },
      { key: 'force_50ms', label: 'Force @ 50ms', type: 'number', unit: 'N' },
      { key: 'force_100ms', label: 'Force @ 100ms', type: 'number', unit: 'N' },
      { key: 'force_150ms', label: 'Force @ 150ms', type: 'number', unit: 'N' },
      { key: 'force_200ms', label: 'Force @ 200ms', type: 'number', unit: 'N' },
      { key: 'force_250ms', label: 'Force @ 250ms', type: 'number', unit: 'N' },
      { key: 'rfd_0_100', label: 'RFD 0-100ms', type: 'number', unit: 'N/s' },
      { key: 'rfd_0_200', label: 'RFD 0-200ms', type: 'number', unit: 'N/s' },
      { key: 'peak_rfd', label: 'Peak RFD', type: 'number', unit: 'N/s' },
      { key: 'impulse_100', label: 'Impulse 0-100ms', type: 'number', unit: 'N·s' },
      { key: 'impulse_200', label: 'Impulse 0-200ms', type: 'number', unit: 'N·s' },
      { key: 'time_to_peak', label: 'Time to Peak Force', type: 'number', unit: 's' },
    ],
    calculations: [
      { key: 'relative_force', label: 'Relative Peak Force', unit: 'N/kg',
        formula: (v) => v.peak_force && v.body_mass ? +(v.peak_force / v.body_mass).toFixed(1) : null },
    ],
    equipmentRequired: ['Force plate', 'IMTP rig', 'Analysis software'],
    estimatedDuration: '15 min',
  },
  // Jump Tests
  {
    id: 'cmj', name: 'Countermovement Jump (Basic)', shortName: 'CMJ',
    category: 'strength_power',
    description: 'Basic CMJ — jump height from flight time or force plate.',
    fields: [
      { key: 'height_cm', label: 'Jump Height', type: 'number', unit: 'cm', required: true },
      { key: 'flight_time', label: 'Flight Time', type: 'number', unit: 's' },
      { key: 'protocol', label: 'Protocol', type: 'select', options: ['Hands on Hips', 'Arm Swing'] },
    ],
    norms: {
      primaryField: 'height_cm', genderSpecific: true,
      male: [
        { label: 'Elite', color: 'emerald', min: 55 },
        { label: 'Good', color: 'sky', min: 45, max: 55 },
        { label: 'Average', color: 'amber', min: 35, max: 45 },
        { label: 'Below Average', color: 'red', max: 35 },
      ],
      female: [
        { label: 'Elite', color: 'emerald', min: 45 },
        { label: 'Good', color: 'sky', min: 35, max: 45 },
        { label: 'Average', color: 'amber', min: 25, max: 35 },
        { label: 'Below Average', color: 'red', max: 25 },
      ],
    },
    equipmentRequired: ['Jump mat / Force plate'],
    estimatedDuration: '10 min',
  },
  {
    id: 'cmj_advanced', name: 'CMJ — Advanced Force Plate', shortName: 'CMJ Adv',
    category: 'strength_power',
    description: 'Full CMJ metrics: RFD, impulse, phases, asymmetry, RSImod.',
    fields: [
      { key: 'height_cm', label: 'Jump Height', type: 'number', unit: 'cm', required: true },
      { key: 'peak_force', label: 'Peak Force', type: 'number', unit: 'N' },
      { key: 'body_mass', label: 'Body Mass', type: 'number', unit: 'kg' },
      { key: 'conc_rfd', label: 'Concentric RFD', type: 'number', unit: 'N/s' },
      { key: 'ecc_rfd', label: 'Eccentric RFD', type: 'number', unit: 'N/s' },
      { key: 'conc_impulse', label: 'Concentric Impulse', type: 'number', unit: 'N·s' },
      { key: 'ecc_impulse', label: 'Eccentric Impulse', type: 'number', unit: 'N·s' },
      { key: 'ecc_duration', label: 'Eccentric Phase Duration', type: 'number', unit: 's' },
      { key: 'conc_duration', label: 'Concentric Phase Duration', type: 'number', unit: 's' },
      { key: 'time_to_takeoff', label: 'Time to Takeoff', type: 'number', unit: 's' },
      { key: 'takeoff_velocity', label: 'Takeoff Velocity', type: 'number', unit: 'm/s' },
      { key: 'peak_power', label: 'Peak Power', type: 'number', unit: 'W' },
      { key: 'cm_depth', label: 'Countermovement Depth', type: 'number', unit: 'cm' },
      { key: 'asymmetry_index', label: 'Asymmetry Index', type: 'number', unit: '%' },
    ],
    calculations: [
      { key: 'relative_power', label: 'Relative Peak Power', unit: 'W/kg',
        formula: (v) => v.peak_power && v.body_mass ? +(v.peak_power / v.body_mass).toFixed(1) : null },
      { key: 'rsi_mod', label: 'RSImod', unit: '',
        formula: (v) => v.height_cm && v.time_to_takeoff ? +((v.height_cm / 100) / v.time_to_takeoff).toFixed(3) : null },
    ],
    equipmentRequired: ['Force plate', 'Analysis software'],
    estimatedDuration: '15 min',
  },
  {
    id: 'squat_jump', name: 'Squat Jump', shortName: 'SJ',
    category: 'strength_power',
    description: 'Concentric-only jump from 90° static hold. No stretch-shortening cycle.',
    fields: [
      { key: 'height_cm', label: 'Jump Height', type: 'number', unit: 'cm', required: true },
      { key: 'peak_power', label: 'Peak Power', type: 'number', unit: 'W' },
      { key: 'body_mass', label: 'Body Mass', type: 'number', unit: 'kg' },
    ],
    calculations: [
      { key: 'relative_power', label: 'Relative Power', unit: 'W/kg',
        formula: (v) => v.peak_power && v.body_mass ? +(v.peak_power / v.body_mass).toFixed(1) : null },
    ],
    norms: {
      primaryField: 'height_cm', genderSpecific: true,
      male: [
        { label: 'Elite', color: 'emerald', min: 45 },
        { label: 'Good', color: 'sky', min: 35, max: 45 },
        { label: 'Average', color: 'amber', min: 25, max: 35 },
      ],
      female: [
        { label: 'Elite', color: 'emerald', min: 35 },
        { label: 'Good', color: 'sky', min: 25, max: 35 },
        { label: 'Average', color: 'amber', min: 18, max: 25 },
      ],
    },
    equipmentRequired: ['Jump mat / Force plate'],
    estimatedDuration: '10 min',
  },
  {
    id: 'drop_jump', name: 'Drop Jump Test', shortName: 'Drop Jump',
    category: 'strength_power',
    description: 'Reactive strength from box drop — jump height & ground contact time.',
    fields: [
      { key: 'drop_height', label: 'Box Height', type: 'select', options: ['15cm', '30cm', '45cm', '60cm'], required: true },
      { key: 'jump_height', label: 'Jump Height', type: 'number', unit: 'cm', required: true },
      { key: 'gct', label: 'Ground Contact Time', type: 'number', unit: 's', required: true, step: 0.001 },
      { key: 'flight_time', label: 'Flight Time', type: 'number', unit: 's', step: 0.001 },
    ],
    calculations: [
      { key: 'rsi', label: 'RSI', unit: 'm/s',
        formula: (v) => v.jump_height && v.gct ? +((v.jump_height / 100) / v.gct).toFixed(3) : null },
    ],
    norms: {
      primaryField: 'rsi', genderSpecific: true,
      male: [
        { label: 'Elite', color: 'emerald', min: 2.5 },
        { label: 'Excellent', color: 'sky', min: 2.0, max: 2.5 },
        { label: 'Good', color: 'teal', min: 1.5, max: 2.0 },
        { label: 'Average', color: 'amber', min: 1.0, max: 1.5 },
        { label: 'Below Average', color: 'red', max: 1.0 },
      ],
      female: [
        { label: 'Elite', color: 'emerald', min: 2.0 },
        { label: 'Excellent', color: 'sky', min: 1.5, max: 2.0 },
        { label: 'Good', color: 'teal', min: 1.0, max: 1.5 },
        { label: 'Average', color: 'amber', min: 0.75, max: 1.0 },
        { label: 'Below Average', color: 'red', max: 0.75 },
      ],
    },
    equipmentRequired: ['Force plate / Jump mat', 'Boxes (15-60cm)'],
    estimatedDuration: '15-20 min',
  },
  {
    id: 'incremental_drop_jump', name: 'Incremental Drop Jump', shortName: 'Inc. DJ',
    category: 'strength_power',
    description: 'Drop jumps from 15/30/45/60cm to find optimal drop height (peak RSI).',
    fields: [
      { key: 'rsi_15', label: 'RSI @ 15cm', type: 'number', step: 0.001 },
      { key: 'rsi_30', label: 'RSI @ 30cm', type: 'number', step: 0.001 },
      { key: 'rsi_45', label: 'RSI @ 45cm', type: 'number', step: 0.001 },
      { key: 'rsi_60', label: 'RSI @ 60cm', type: 'number', step: 0.001 },
    ],
    calculations: [
      { key: 'optimal_height', label: 'Optimal Height', unit: 'cm',
        formula: (v) => {
          const heights = [
            { h: 15, rsi: v.rsi_15 }, { h: 30, rsi: v.rsi_30 },
            { h: 45, rsi: v.rsi_45 }, { h: 60, rsi: v.rsi_60 },
          ].filter(x => x.rsi != null && x.rsi > 0);
          if (!heights.length) return null;
          return heights.reduce((best, cur) => cur.rsi > best.rsi ? cur : best).h;
        },
      },
    ],
    equipmentRequired: ['Force plate / Jump mat', 'Boxes (15-60cm)'],
    estimatedDuration: '20 min',
  },
  {
    id: 'rsi', name: 'Reactive Strength Index (Drop Jump)', shortName: 'RSI',
    category: 'strength_power',
    description: 'RSI = Jump Height / Ground Contact Time. Key plyometric metric.',
    fields: [
      { key: 'jump_height', label: 'Jump Height', type: 'number', unit: 'cm', required: true },
      { key: 'gct', label: 'Ground Contact Time', type: 'number', unit: 's', required: true, step: 0.001 },
      { key: 'drop_height', label: 'Drop Height', type: 'select', options: ['30cm', '45cm', '60cm'] },
    ],
    calculations: [
      { key: 'rsi', label: 'RSI', unit: 'm/s',
        formula: (v) => v.jump_height && v.gct ? +((v.jump_height / 100) / v.gct).toFixed(3) : null },
    ],
    equipmentRequired: ['Force plate / Jump mat'],
    estimatedDuration: '15 min',
  },
  {
    id: 'rsi_mod', name: 'Modified RSI (CMJ Protocol)', shortName: 'RSImod',
    category: 'strength_power',
    description: 'RSImod = Jump Height / Time to Takeoff. Ideal for daily monitoring.',
    fields: [
      { key: 'height_cm', label: 'Jump Height', type: 'number', unit: 'cm', required: true },
      { key: 'time_to_takeoff', label: 'Time to Takeoff', type: 'number', unit: 's', required: true, step: 0.001 },
    ],
    calculations: [
      { key: 'rsi_mod', label: 'RSImod', unit: '',
        formula: (v) => v.height_cm && v.time_to_takeoff ? +((v.height_cm / 100) / v.time_to_takeoff).toFixed(3) : null },
    ],
    equipmentRequired: ['Force plate'],
    estimatedDuration: '5 min',
  },
  {
    id: 'broad_jump', name: 'Standing Broad Jump', shortName: 'Broad Jump',
    category: 'strength_power',
    description: 'Horizontal jump for distance from standing position.',
    fields: [
      { key: 'distance', label: 'Distance', type: 'number', unit: 'cm', required: true },
    ],
    equipmentRequired: ['Tape measure'],
    estimatedDuration: '5 min',
  },
  {
    id: 'single_leg_hop', name: 'Single Leg Hop for Distance', shortName: 'SL Hop',
    category: 'strength_power',
    description: 'Single-leg forward hop. Limb symmetry for RTP criteria.',
    fields: [
      { key: 'distance_left', label: 'Distance Left', type: 'number', unit: 'cm', required: true },
      { key: 'distance_right', label: 'Distance Right', type: 'number', unit: 'cm', required: true },
    ],
    calculations: [
      { key: 'lsi', label: 'Limb Symmetry Index', unit: '%',
        formula: (v) => v.distance_left && v.distance_right ? +(Math.min(v.distance_left, v.distance_right) / Math.max(v.distance_left, v.distance_right) * 100).toFixed(1) : null },
    ],
    estimatedDuration: '5 min',
  },
  {
    id: 'triple_hop', name: 'Triple Hop for Distance', shortName: 'Triple Hop',
    category: 'strength_power',
    description: '3 consecutive single-leg hops. LSI for return-to-play.',
    fields: [
      { key: 'distance_left', label: 'Distance Left', type: 'number', unit: 'cm', required: true },
      { key: 'distance_right', label: 'Distance Right', type: 'number', unit: 'cm', required: true },
    ],
    calculations: [
      { key: 'lsi', label: 'Limb Symmetry Index', unit: '%',
        formula: (v) => v.distance_left && v.distance_right ? +(Math.min(v.distance_left, v.distance_right) / Math.max(v.distance_left, v.distance_right) * 100).toFixed(1) : null },
    ],
    estimatedDuration: '5 min',
  },
  {
    id: 'crossover_hop', name: 'Crossover Hop for Distance', shortName: 'Crossover Hop',
    category: 'strength_power',
    description: '3 consecutive single-leg hops crossing a center line.',
    fields: [
      { key: 'distance_left', label: 'Distance Left', type: 'number', unit: 'cm', required: true },
      { key: 'distance_right', label: 'Distance Right', type: 'number', unit: 'cm', required: true },
    ],
    calculations: [
      { key: 'lsi', label: 'Limb Symmetry Index', unit: '%',
        formula: (v) => v.distance_left && v.distance_right ? +(Math.min(v.distance_left, v.distance_right) / Math.max(v.distance_left, v.distance_right) * 100).toFixed(1) : null },
    ],
    estimatedDuration: '5 min',
  },
  {
    id: 'timed_hop', name: 'Timed Hop Test (6m)', shortName: '6m Hop',
    category: 'strength_power',
    description: 'Single-leg hop over 6 meters for time. LSI for return-to-play.',
    fields: [
      { key: 'time_left', label: 'Time Left', type: 'number', unit: 's', required: true, step: 0.01 },
      { key: 'time_right', label: 'Time Right', type: 'number', unit: 's', required: true, step: 0.01 },
    ],
    calculations: [
      { key: 'lsi', label: 'Limb Symmetry Index', unit: '%',
        formula: (v) => v.time_left && v.time_right ? +(Math.min(v.time_left, v.time_right) / Math.max(v.time_left, v.time_right) * 100).toFixed(1) : null },
    ],
    estimatedDuration: '5 min',
  },
  // Loaded CMJ
  {
    id: 'loaded_cmj', name: 'Loaded CMJ (Velocity-Load Profile)', shortName: 'Loaded CMJ',
    category: 'strength_power',
    description: 'CMJ with progressively heavier loads. Velocity-load profiling.',
    fields: [
      { key: 'bw_height', label: 'BW Jump Height', type: 'number', unit: 'cm', required: true },
      { key: 'load_1_kg', label: 'Load 1 (kg)', type: 'number', unit: 'kg' },
      { key: 'load_1_height', label: 'Load 1 Height', type: 'number', unit: 'cm' },
      { key: 'load_2_kg', label: 'Load 2 (kg)', type: 'number', unit: 'kg' },
      { key: 'load_2_height', label: 'Load 2 Height', type: 'number', unit: 'cm' },
      { key: 'load_3_kg', label: 'Load 3 (kg)', type: 'number', unit: 'kg' },
      { key: 'load_3_height', label: 'Load 3 Height', type: 'number', unit: 'cm' },
    ],
    equipmentRequired: ['Force plate', 'Barbell/Trap bar', 'Plates'],
    estimatedDuration: '20 min',
  },
  // Wingate
  {
    id: 'wingate', name: 'Wingate Anaerobic Test', shortName: 'Wingate',
    category: 'strength_power',
    description: '30-second all-out cycle test. Peak power, mean power, fatigue index.',
    fields: [
      { key: 'peak_power', label: 'Peak Power', type: 'number', unit: 'W', required: true },
      { key: 'mean_power', label: 'Mean Power', type: 'number', unit: 'W', required: true },
      { key: 'min_power', label: 'Minimum Power', type: 'number', unit: 'W' },
      { key: 'body_mass', label: 'Body Mass', type: 'number', unit: 'kg', required: true },
    ],
    calculations: [
      { key: 'rel_peak', label: 'Relative Peak Power', unit: 'W/kg',
        formula: (v) => v.peak_power && v.body_mass ? +(v.peak_power / v.body_mass).toFixed(1) : null },
      { key: 'rel_mean', label: 'Relative Mean Power', unit: 'W/kg',
        formula: (v) => v.mean_power && v.body_mass ? +(v.mean_power / v.body_mass).toFixed(1) : null },
      { key: 'fatigue_index', label: 'Fatigue Index', unit: '%',
        formula: (v) => v.peak_power && v.min_power ? +(( (v.peak_power - v.min_power) / v.peak_power ) * 100).toFixed(1) : null },
    ],
    equipmentRequired: ['Wingate cycle ergometer'],
    estimatedDuration: '15 min',
  },
  // DSI
  {
    id: 'dsi', name: 'Dynamic Strength Index', shortName: 'DSI',
    category: 'strength_power',
    description: 'DSI = CMJ Peak Force / IMTP Peak Force. Guides training focus.',
    fields: [
      { key: 'cmj_peak_force', label: 'CMJ Peak Force', type: 'number', unit: 'N', required: true },
      { key: 'imtp_peak_force', label: 'IMTP Peak Force', type: 'number', unit: 'N', required: true },
    ],
    calculations: [
      { key: 'dsi', label: 'DSI', unit: '',
        formula: (v) => v.cmj_peak_force && v.imtp_peak_force ? +(v.cmj_peak_force / v.imtp_peak_force).toFixed(3) : null },
    ],
    norms: {
      primaryField: 'dsi',
      bands: [
        { label: 'Focus: Ballistic', color: 'sky', min: 0.80 },
        { label: 'Well Balanced', color: 'emerald', min: 0.60, max: 0.80 },
        { label: 'Focus: Strength', color: 'amber', max: 0.60 },
      ],
    },
    equipmentRequired: ['Force plate'],
    estimatedDuration: '5 min (if CMJ & IMTP already done)',
  },
];

// ─── SPEED / AGILITY TESTS (15) ───────────────────────────────────

const speedAgilityTests: TestDefinition[] = [
  { id: 'sprint_10m', name: '10-Meter Sprint', shortName: '10m', category: 'speed_agility',
    description: 'Acceleration test over 10 meters. 3–5 trials, 2–3 min rest.',
    fields: [
      { key: 'time', label: 'Best Time', type: 'number', unit: 's', required: true, step: 0.01 },
      { key: 'trial_2', label: 'Trial 2', type: 'number', unit: 's', step: 0.01 },
      { key: 'trial_3', label: 'Trial 3', type: 'number', unit: 's', step: 0.01 },
    ],
    norms: { primaryField: 'time', genderSpecific: true,
      male: [
        { label: 'Elite', color: 'emerald', max: 1.70 },
        { label: 'Good', color: 'sky', min: 1.70, max: 1.80 },
        { label: 'Average', color: 'amber', min: 1.80, max: 1.95 },
        { label: 'Below Average', color: 'red', min: 1.95 },
      ],
      female: [
        { label: 'Elite', color: 'emerald', max: 1.90 },
        { label: 'Good', color: 'sky', min: 1.90, max: 2.05 },
        { label: 'Average', color: 'amber', min: 2.05, max: 2.20 },
        { label: 'Below Average', color: 'red', min: 2.20 },
      ],
    },
    equipmentRequired: ['Timing gates'], estimatedDuration: '10 min' },
  { id: 'sprint_20m', name: '20-Meter Sprint', shortName: '20m', category: 'speed_agility',
    description: 'Acceleration + transition phases. Gates at 0m, 10m, 20m.',
    fields: [
      { key: 'time', label: '20m Time', type: 'number', unit: 's', required: true, step: 0.01 },
      { key: 'split_10m', label: '10m Split', type: 'number', unit: 's', step: 0.01 },
      { key: 'trial_2', label: 'Trial 2 (20m)', type: 'number', unit: 's', step: 0.01 },
    ],
    norms: { primaryField: 'time', genderSpecific: true,
      male: [
        { label: 'Elite', color: 'emerald', max: 2.90 },
        { label: 'Good', color: 'sky', min: 2.90, max: 3.05 },
        { label: 'Average', color: 'amber', min: 3.05, max: 3.20 },
        { label: 'Below Average', color: 'red', min: 3.20 },
      ],
      female: [
        { label: 'Elite', color: 'emerald', max: 3.20 },
        { label: 'Good', color: 'sky', min: 3.20, max: 3.40 },
        { label: 'Average', color: 'amber', min: 3.40, max: 3.60 },
        { label: 'Below Average', color: 'red', min: 3.60 },
      ],
    },
    equipmentRequired: ['Timing gates'], estimatedDuration: '10 min' },
  { id: 'sprint_30m', name: '30-Meter Sprint', shortName: '30m', category: 'speed_agility',
    description: 'Acceleration through max velocity. Gates at 0m, 10m, 20m, 30m.',
    fields: [
      { key: 'time', label: '30m Time', type: 'number', unit: 's', required: true, step: 0.01 },
      { key: 'split_10m', label: '10m Split', type: 'number', unit: 's', step: 0.01 },
      { key: 'split_20m', label: '20m Split', type: 'number', unit: 's', step: 0.01 },
      { key: 'trial_2', label: 'Trial 2 (30m)', type: 'number', unit: 's', step: 0.01 },
    ],
    norms: { primaryField: 'time', genderSpecific: true,
      male: [
        { label: 'Elite', color: 'emerald', max: 4.00 },
        { label: 'Good', color: 'sky', min: 4.00, max: 4.20 },
        { label: 'Average', color: 'amber', min: 4.20, max: 4.50 },
        { label: 'Below Average', color: 'red', min: 4.50 },
      ],
      female: [
        { label: 'Elite', color: 'emerald', max: 4.50 },
        { label: 'Good', color: 'sky', min: 4.50, max: 4.80 },
        { label: 'Average', color: 'amber', min: 4.80, max: 5.10 },
        { label: 'Below Average', color: 'red', min: 5.10 },
      ],
    },
    equipmentRequired: ['Timing gates'], estimatedDuration: '10 min' },
  { id: 'sprint_40m', name: '40-Metre Sprint', shortName: '40m', category: 'speed_agility',
    description: 'Maximal sprint over 40 metres from standing start.',
    fields: [
      { key: 'time', label: '40m Time', type: 'number', unit: 's', required: true, step: 0.01 },
      { key: 'split_10m', label: '10m Split', type: 'number', unit: 's', step: 0.01 },
      { key: 'split_20m', label: '20m Split', type: 'number', unit: 's', step: 0.01 },
      { key: 'trial_2', label: 'Trial 2 (40m)', type: 'number', unit: 's', step: 0.01 },
    ],
    norms: { primaryField: 'time', genderSpecific: true,
      male: [
        { label: 'Elite', color: 'emerald', max: 4.80 },
        { label: 'Good', color: 'sky', min: 4.80, max: 5.20 },
        { label: 'Average', color: 'amber', min: 5.20, max: 5.60 },
        { label: 'Below Average', color: 'red', min: 5.60 },
      ],
      female: [
        { label: 'Elite', color: 'emerald', max: 5.40 },
        { label: 'Good', color: 'sky', min: 5.40, max: 5.80 },
        { label: 'Average', color: 'amber', min: 5.80, max: 6.30 },
        { label: 'Below Average', color: 'red', min: 6.30 },
      ],
    },
    equipmentRequired: ['Timing gates'], estimatedDuration: '10 min' },
  { id: 'flying_10m', name: 'Flying 10m Sprint', shortName: 'Flying 10m', category: 'speed_agility',
    description: 'Maximum velocity test. 20-30m run-up, timed through 10m zone.',
    fields: [
      { key: 'time', label: 'Flying 10m Time', type: 'number', unit: 's', required: true, step: 0.001 },
      { key: 'trial_2', label: 'Trial 2', type: 'number', unit: 's', step: 0.001 },
      { key: 'trial_3', label: 'Trial 3', type: 'number', unit: 's', step: 0.001 },
    ],
    calculations: [
      { key: 'velocity', label: 'Max Velocity', unit: 'm/s',
        formula: (v) => v.time ? +(10 / v.time).toFixed(2) : null },
    ],
    norms: { primaryField: 'velocity',
      bands: [
        { label: 'Elite Sprinter', color: 'emerald', min: 11.5 },
        { label: 'Good Sprinter', color: 'sky', min: 10.5, max: 11.5 },
        { label: 'Team Sport', color: 'teal', min: 9.5, max: 10.5 },
        { label: 'Average', color: 'amber', min: 8.5, max: 9.5 },
        { label: 'Below Average', color: 'red', max: 8.5 },
      ],
    },
    equipmentRequired: ['Timing gates'], estimatedDuration: '15 min' },
  { id: 'agility_505', name: '505 Agility Test', shortName: '505', category: 'speed_agility',
    description: '15m sprint, 180° turn, 5m return. Test both turning directions.',
    fields: [
      { key: 'time_left', label: 'Best Time (Turn Left)', type: 'number', unit: 's', required: true, step: 0.01 },
      { key: 'time_right', label: 'Best Time (Turn Right)', type: 'number', unit: 's', required: true, step: 0.01 },
      { key: 'trial_2_left', label: 'Trial 2 (Left)', type: 'number', unit: 's', step: 0.01 },
      { key: 'trial_2_right', label: 'Trial 2 (Right)', type: 'number', unit: 's', step: 0.01 },
    ],
    calculations: [
      { key: 'best_time', label: 'Best Overall', unit: 's',
        formula: (v) => v.time_left && v.time_right ? +Math.min(v.time_left, v.time_right).toFixed(2) : null },
      { key: 'asymmetry', label: 'Asymmetry', unit: '%',
        formula: (v) => v.time_left && v.time_right ? +(Math.abs(v.time_left - v.time_right) / Math.min(v.time_left, v.time_right) * 100).toFixed(1) : null },
    ],
    norms: { primaryField: 'best_time', genderSpecific: true,
      male: [
        { label: 'Elite', color: 'emerald', max: 2.20 },
        { label: 'Good', color: 'sky', min: 2.20, max: 2.40 },
        { label: 'Average', color: 'amber', min: 2.40, max: 2.60 },
        { label: 'Below Average', color: 'red', min: 2.60 },
      ],
      female: [
        { label: 'Elite', color: 'emerald', max: 2.50 },
        { label: 'Good', color: 'sky', min: 2.50, max: 2.70 },
        { label: 'Average', color: 'amber', min: 2.70, max: 2.90 },
        { label: 'Below Average', color: 'red', min: 2.90 },
      ],
    },
    equipmentRequired: ['Timing gates', 'Cones'], estimatedDuration: '10 min' },
  { id: 'illinois', name: 'Illinois Agility Test', shortName: 'Illinois', category: 'speed_agility',
    description: '10m × 5m course with slalom through cones. Tests agility and body control.',
    fields: [{ key: 'time', label: 'Time', type: 'number', unit: 's', required: true, step: 0.01 }],
    norms: { primaryField: 'time', genderSpecific: true,
      male: [
        { label: 'Excellent', color: 'emerald', max: 15.2 },
        { label: 'Good', color: 'sky', min: 15.2, max: 16.1 },
        { label: 'Average', color: 'amber', min: 16.1, max: 18.1 },
        { label: 'Below Average', color: 'red', min: 18.1 },
      ],
      female: [
        { label: 'Excellent', color: 'emerald', max: 17.0 },
        { label: 'Good', color: 'sky', min: 17.0, max: 17.9 },
        { label: 'Average', color: 'amber', min: 17.9, max: 21.7 },
        { label: 'Below Average', color: 'red', min: 21.7 },
      ],
    },
    equipmentRequired: ['Timing gates', 'Cones (8)'], estimatedDuration: '10 min' },
  { id: 't_test', name: 'T-Test Agility', shortName: 'T-Test', category: 'speed_agility',
    description: 'Forward, lateral, backward movement in T pattern.',
    fields: [{ key: 'time', label: 'Time', type: 'number', unit: 's', required: true, step: 0.01 }],
    norms: { primaryField: 'time', genderSpecific: true,
      male: [
        { label: 'Excellent', color: 'emerald', max: 9.5 },
        { label: 'Good', color: 'sky', min: 9.5, max: 10.5 },
        { label: 'Average', color: 'amber', min: 10.5, max: 11.5 },
        { label: 'Below Average', color: 'red', min: 11.5 },
      ],
      female: [
        { label: 'Excellent', color: 'emerald', max: 10.5 },
        { label: 'Good', color: 'sky', min: 10.5, max: 11.5 },
        { label: 'Average', color: 'amber', min: 11.5, max: 12.5 },
        { label: 'Below Average', color: 'red', min: 12.5 },
      ],
    },
    equipmentRequired: ['Timing gates', 'Cones (4)'], estimatedDuration: '10 min' },
  { id: 'pro_agility', name: 'Pro Agility Shuttle (5-10-5)', shortName: '5-10-5', category: 'speed_agility',
    description: '5yd–10yd–5yd shuttle. NFL Combine standard. Test both start directions.',
    fields: [
      { key: 'time_left', label: 'Best Time (Start Left)', type: 'number', unit: 's', required: true, step: 0.01 },
      { key: 'time_right', label: 'Best Time (Start Right)', type: 'number', unit: 's', required: true, step: 0.01 },
      { key: 'trial_2_left', label: 'Trial 2 (Left)', type: 'number', unit: 's', step: 0.01 },
      { key: 'trial_2_right', label: 'Trial 2 (Right)', type: 'number', unit: 's', step: 0.01 },
    ],
    calculations: [
      { key: 'best_time', label: 'Best Overall', unit: 's',
        formula: (v) => v.time_left && v.time_right ? +Math.min(v.time_left, v.time_right).toFixed(2) : null },
      { key: 'asymmetry', label: 'Asymmetry', unit: '%',
        formula: (v) => v.time_left && v.time_right ? +(Math.abs(v.time_left - v.time_right) / Math.min(v.time_left, v.time_right) * 100).toFixed(1) : null },
    ],
    norms: { primaryField: 'best_time',
      bands: [
        { label: 'Elite', color: 'emerald', max: 4.30 },
        { label: 'Good', color: 'sky', min: 4.30, max: 4.60 },
        { label: 'Average', color: 'amber', min: 4.60, max: 5.00 },
        { label: 'Below Average', color: 'red', min: 5.00 },
      ],
    },
    equipmentRequired: ['Timing gates', 'Cones'], estimatedDuration: '10 min' },
  { id: 'hexagon', name: 'Hexagon Test', shortName: 'Hexagon', category: 'speed_agility',
    description: 'Jump in/out of hexagonal shape (3 rotations, 18 jumps). Tests agility and foot speed.',
    fields: [
      { key: 'time_cw', label: 'Time Clockwise', type: 'number', unit: 's', required: true, step: 0.01 },
      { key: 'time_ccw', label: 'Time Counter-CW', type: 'number', unit: 's', step: 0.01 },
      { key: 'trial_2_cw', label: 'Trial 2 CW', type: 'number', unit: 's', step: 0.01 },
    ],
    calculations: [
      { key: 'best_time', label: 'Best Time', unit: 's',
        formula: (v) => {
          const times = [v.time_cw, v.time_ccw, v.trial_2_cw].filter(Boolean);
          return times.length ? +Math.min(...times).toFixed(2) : null;
        }},
    ],
    norms: { primaryField: 'best_time',
      bands: [
        { label: 'Excellent', color: 'emerald', max: 11 },
        { label: 'Good', color: 'sky', min: 11, max: 13 },
        { label: 'Average', color: 'amber', min: 13, max: 15 },
        { label: 'Below Average', color: 'red', min: 15 },
      ],
    },
    equipmentRequired: ['Tape / Cones (hexagon)'], estimatedDuration: '5 min' },
  { id: 'codd', name: 'Change of Direction Deficit', shortName: 'CODD', category: 'speed_agility',
    description: 'CODD = 505 Time − 10m Sprint Time. Isolates COD ability from speed.',
    fields: [
      { key: 'test_505_time', label: '505 Best Time', type: 'number', unit: 's', required: true, step: 0.01 },
      { key: 'sprint_10m_time', label: '10m Sprint Best Time', type: 'number', unit: 's', required: true, step: 0.01 },
    ],
    calculations: [
      { key: 'codd', label: 'CODD', unit: 's',
        formula: (v) => v.test_505_time && v.sprint_10m_time ? +(v.test_505_time - v.sprint_10m_time).toFixed(3) : null },
    ],
    norms: { primaryField: 'codd',
      bands: [
        { label: 'Good COD Technique', color: 'emerald', max: 0.40 },
        { label: 'Average', color: 'amber', min: 0.40, max: 0.60 },
        { label: 'Poor COD', color: 'red', min: 0.60 },
      ],
    },
    estimatedDuration: '5 min (if 505 & 10m already done)' },
  { id: 'arrowhead', name: 'Arrowhead Agility Test', shortName: 'Arrowhead', category: 'speed_agility',
    description: 'Sprint to cone, turn around arrowhead pattern, sprint back. Test both sides.',
    fields: [
      { key: 'time_left', label: 'Best Time (Left)', type: 'number', unit: 's', required: true, step: 0.01 },
      { key: 'time_right', label: 'Best Time (Right)', type: 'number', unit: 's', required: true, step: 0.01 },
      { key: 'trial_2_left', label: 'Trial 2 (Left)', type: 'number', unit: 's', step: 0.01 },
      { key: 'trial_2_right', label: 'Trial 2 (Right)', type: 'number', unit: 's', step: 0.01 },
    ],
    calculations: [
      { key: 'best_time', label: 'Best Overall', unit: 's',
        formula: (v) => v.time_left && v.time_right ? +Math.min(v.time_left, v.time_right).toFixed(2) : null },
      { key: 'asymmetry', label: 'Asymmetry', unit: '%',
        formula: (v) => v.time_left && v.time_right ? +(Math.abs(v.time_left - v.time_right) / Math.min(v.time_left, v.time_right) * 100).toFixed(1) : null },
    ],
    equipmentRequired: ['Timing gates', 'Cones'], estimatedDuration: '10 min' },
  { id: 'lane_agility', name: 'Lane Agility Drill (Basketball)', shortName: 'Lane Agility', category: 'speed_agility',
    description: 'Basketball-specific agility around the lane/key. Sprint + defensive slide.',
    fields: [
      { key: 'time', label: 'Best Time', type: 'number', unit: 's', required: true, step: 0.01 },
      { key: 'trial_2', label: 'Trial 2', type: 'number', unit: 's', step: 0.01 },
      { key: 'trial_3', label: 'Trial 3', type: 'number', unit: 's', step: 0.01 },
    ],
    equipmentRequired: ['Basketball court', 'Timing gates'], estimatedDuration: '10 min' },
  { id: 'three_cone', name: '3-Cone Drill (L-Drill)', shortName: '3-Cone', category: 'speed_agility',
    description: 'NFL Combine L-shaped shuttle. Tests short-area quickness.',
    fields: [
      { key: 'time', label: 'Best Time', type: 'number', unit: 's', required: true, step: 0.01 },
      { key: 'trial_2', label: 'Trial 2', type: 'number', unit: 's', step: 0.01 },
      { key: 'trial_3', label: 'Trial 3', type: 'number', unit: 's', step: 0.01 },
    ],
    norms: { primaryField: 'time',
      bands: [
        { label: 'Elite', color: 'emerald', max: 6.80 },
        { label: 'Good', color: 'sky', min: 6.80, max: 7.20 },
        { label: 'Average', color: 'amber', min: 7.20, max: 7.60 },
        { label: 'Below Average', color: 'red', min: 7.60 },
      ],
    },
    equipmentRequired: ['Timing gates', 'Cones (3)'], estimatedDuration: '10 min' },
  { id: 'suicide_sprint', name: 'Suicide Sprint / Shuttle Run', shortName: 'Suicide', category: 'speed_agility',
    description: 'Shuttle runs to 5yd, 10yd, 15yd, 20yd lines and back each time.',
    fields: [
      { key: 'time', label: 'Total Time', type: 'number', unit: 's', required: true, step: 0.01 },
      { key: 'trial_2', label: 'Trial 2', type: 'number', unit: 's', step: 0.01 },
    ],
    norms: { primaryField: 'time',
      bands: [
        { label: 'Excellent', color: 'emerald', max: 25 },
        { label: 'Good', color: 'sky', min: 25, max: 28 },
        { label: 'Average', color: 'amber', min: 28, max: 32 },
        { label: 'Below Average', color: 'red', min: 32 },
      ],
    },
    equipmentRequired: ['Cones'], estimatedDuration: '5 min' },
];

// ─── FLEXIBILITY / MOBILITY TESTS (8) ─────────────────────────────

const flexibilityTests: TestDefinition[] = [
  { id: 'sit_reach', name: 'Sit and Reach Test', shortName: 'Sit & Reach', category: 'flexibility',
    description: 'Standard sit and reach for hamstring/lower back flexibility.',
    fields: [{ key: 'distance', label: 'Distance', type: 'number', unit: 'cm', required: true }],
    norms: { primaryField: 'distance', genderSpecific: true,
      male: [
        { label: 'Excellent', color: 'emerald', min: 27 },
        { label: 'Good', color: 'sky', min: 17, max: 27 },
        { label: 'Average', color: 'amber', min: 6, max: 17 },
        { label: 'Below Average', color: 'red', max: 6 },
      ],
      female: [
        { label: 'Excellent', color: 'emerald', min: 30 },
        { label: 'Good', color: 'sky', min: 21, max: 30 },
        { label: 'Average', color: 'amber', min: 11, max: 21 },
        { label: 'Below Average', color: 'red', max: 11 },
      ],
    },
    equipmentRequired: ['Sit-and-Reach box'], estimatedDuration: '5 min' },
  { id: 'modified_sit_reach', name: 'Modified Sit and Reach', shortName: 'Mod. S&R', category: 'flexibility',
    description: 'Accounts for arm/leg length ratio differences.',
    fields: [{ key: 'distance', label: 'Distance', type: 'number', unit: 'cm', required: true }],
    estimatedDuration: '5 min' },
  { id: 'back_saver_sit_reach', name: 'Back-Saver Sit and Reach', shortName: 'BS S&R', category: 'flexibility',
    description: 'One leg at a time to protect lower back.',
    fields: [
      { key: 'distance_left', label: 'Distance Left', type: 'number', unit: 'cm', required: true },
      { key: 'distance_right', label: 'Distance Right', type: 'number', unit: 'cm', required: true },
    ],
    estimatedDuration: '5 min' },
  { id: 'apley_scratch', name: 'Apley Scratch Test', shortName: 'Apley', category: 'flexibility',
    description: 'Shoulder mobility — reach behind back from above and below. Measure gap/overlap.',
    fields: [
      { key: 'distance_left_top', label: 'Gap/Overlap (Left Arm on Top)', type: 'number', unit: 'cm', required: true,
        helpText: 'Negative = fingers overlap, Positive = gap between hands' },
      { key: 'distance_right_top', label: 'Gap/Overlap (Right Arm on Top)', type: 'number', unit: 'cm', required: true,
        helpText: 'Negative = fingers overlap, Positive = gap between hands' },
    ],
    calculations: [
      { key: 'asymmetry', label: 'Side Difference', unit: 'cm',
        formula: (v) => v.distance_left_top != null && v.distance_right_top != null ? +(Math.abs(v.distance_left_top - v.distance_right_top)).toFixed(1) : null },
    ],
    norms: { primaryField: 'distance_left_top',
      bands: [
        { label: 'Normal (Overlap)', color: 'emerald', max: 0 },
        { label: 'Adequate (<5cm gap)', color: 'sky', min: 0, max: 5 },
        { label: 'Limited (>5cm gap)', color: 'red', min: 5 },
      ],
    },
    estimatedDuration: '5 min' },
  { id: 'back_scratch', name: 'Back Scratch Test', shortName: 'Back Scratch', category: 'flexibility',
    description: 'Measure distance between hands reaching behind back.',
    fields: [
      { key: 'distance_left_top', label: 'Distance (Left on top)', type: 'number', unit: 'cm', required: true,
        helpText: 'Negative = hands overlap, Positive = gap' },
      { key: 'distance_right_top', label: 'Distance (Right on top)', type: 'number', unit: 'cm', required: true },
    ],
    estimatedDuration: '5 min' },
  { id: 'shoulder_rom', name: 'Shoulder Rotation ROM', shortName: 'Shoulder ROM', category: 'flexibility',
    description: 'Internal and external shoulder rotation measured with goniometer.',
    fields: [
      { key: 'ir_left', label: 'IR Left', type: 'number', unit: '°', required: true },
      { key: 'ir_right', label: 'IR Right', type: 'number', unit: '°', required: true },
      { key: 'er_left', label: 'ER Left', type: 'number', unit: '°', required: true },
      { key: 'er_right', label: 'ER Right', type: 'number', unit: '°', required: true },
    ],
    calculations: [
      { key: 'total_arc_left', label: 'Total Arc Left', unit: '°',
        formula: (v) => v.ir_left != null && v.er_left != null ? v.ir_left + v.er_left : null },
      { key: 'total_arc_right', label: 'Total Arc Right', unit: '°',
        formula: (v) => v.ir_right != null && v.er_right != null ? v.ir_right + v.er_right : null },
    ],
    equipmentRequired: ['Goniometer'], estimatedDuration: '10 min' },
  { id: 'thomas_test_flex', name: 'Thomas Test (Flexibility)', shortName: 'Thomas', category: 'flexibility',
    description: 'Hip flexor length assessment (also in Musculoskeletal).',
    fields: [
      { key: 'grade_left', label: 'Grade Left', type: 'score_pills', pillValues: [0, 1, 2, 3], required: true },
      { key: 'grade_right', label: 'Grade Right', type: 'score_pills', pillValues: [0, 1, 2, 3], required: true },
    ],
    estimatedDuration: '5 min' },
  { id: 'ankle_df_flex', name: 'Ankle Dorsiflexion ROM', shortName: 'Ankle DF', category: 'flexibility',
    description: 'Weight-bearing lunge ankle DF test (also in Musculoskeletal).',
    fields: [
      { key: 'distance_left', label: 'Distance Left', type: 'number', unit: 'cm', required: true },
      { key: 'distance_right', label: 'Distance Right', type: 'number', unit: 'cm', required: true },
    ],
    estimatedDuration: '5 min' },
];

// ─── AEROBIC CAPACITY TESTS (10) ──────────────────────────────────

const aerobicTests: TestDefinition[] = [
  { id: 'vo2max_bruce', name: 'VO₂max — Bruce Protocol (Treadmill)', shortName: 'Bruce', category: 'aerobic',
    description: 'Gold standard laboratory VO₂max test. 3-minute stages.',
    fields: [
      { key: 'vo2max', label: 'VO₂max', type: 'number', unit: 'ml/kg/min', required: true },
      { key: 'max_hr', label: 'Max HR', type: 'number', unit: 'bpm' },
      { key: 'time_completed', label: 'Time Completed', type: 'number', unit: 'min', step: 0.1 },
      { key: 'rpe', label: 'RPE at End', type: 'number', min: 6, max: 20 },
    ],
    norms: { primaryField: 'vo2max', genderSpecific: true,
      male: [
        { label: 'Excellent', color: 'emerald', min: 55 },
        { label: 'Good', color: 'sky', min: 45, max: 55 },
        { label: 'Average', color: 'amber', min: 35, max: 45 },
        { label: 'Below Average', color: 'red', max: 35 },
      ],
      female: [
        { label: 'Excellent', color: 'emerald', min: 50 },
        { label: 'Good', color: 'sky', min: 40, max: 50 },
        { label: 'Average', color: 'amber', min: 30, max: 40 },
        { label: 'Below Average', color: 'red', max: 30 },
      ],
      ageGroups: [
        { label: '18-25', minAge: 18, maxAge: 25,
          male: [
            { label: 'Excellent', color: 'emerald', min: 60 },
            { label: 'Good', color: 'sky', min: 52, max: 60 },
            { label: 'Average', color: 'amber', min: 42, max: 52 },
            { label: 'Below Average', color: 'red', max: 42 },
          ],
          female: [
            { label: 'Excellent', color: 'emerald', min: 56 },
            { label: 'Good', color: 'sky', min: 47, max: 56 },
            { label: 'Average', color: 'amber', min: 38, max: 47 },
            { label: 'Below Average', color: 'red', max: 38 },
          ],
        },
        { label: '26-35', minAge: 26, maxAge: 35,
          male: [
            { label: 'Excellent', color: 'emerald', min: 56 },
            { label: 'Good', color: 'sky', min: 49, max: 56 },
            { label: 'Average', color: 'amber', min: 40, max: 49 },
            { label: 'Below Average', color: 'red', max: 40 },
          ],
          female: [
            { label: 'Excellent', color: 'emerald', min: 52 },
            { label: 'Good', color: 'sky', min: 45, max: 52 },
            { label: 'Average', color: 'amber', min: 35, max: 45 },
            { label: 'Below Average', color: 'red', max: 35 },
          ],
        },
        { label: '36-45', minAge: 36, maxAge: 45,
          male: [
            { label: 'Excellent', color: 'emerald', min: 51 },
            { label: 'Good', color: 'sky', min: 43, max: 51 },
            { label: 'Average', color: 'amber', min: 35, max: 43 },
            { label: 'Below Average', color: 'red', max: 35 },
          ],
          female: [
            { label: 'Excellent', color: 'emerald', min: 45 },
            { label: 'Good', color: 'sky', min: 39, max: 45 },
            { label: 'Average', color: 'amber', min: 31, max: 39 },
            { label: 'Below Average', color: 'red', max: 31 },
          ],
        },
        { label: '46-55', minAge: 46, maxAge: 55,
          male: [
            { label: 'Excellent', color: 'emerald', min: 45 },
            { label: 'Good', color: 'sky', min: 39, max: 45 },
            { label: 'Average', color: 'amber', min: 32, max: 39 },
            { label: 'Below Average', color: 'red', max: 32 },
          ],
          female: [
            { label: 'Excellent', color: 'emerald', min: 40 },
            { label: 'Good', color: 'sky', min: 34, max: 40 },
            { label: 'Average', color: 'amber', min: 27, max: 34 },
            { label: 'Below Average', color: 'red', max: 27 },
          ],
        },
        { label: '56-65', minAge: 56, maxAge: 65,
          male: [
            { label: 'Excellent', color: 'emerald', min: 41 },
            { label: 'Good', color: 'sky', min: 36, max: 41 },
            { label: 'Average', color: 'amber', min: 30, max: 36 },
            { label: 'Below Average', color: 'red', max: 30 },
          ],
          female: [
            { label: 'Excellent', color: 'emerald', min: 37 },
            { label: 'Good', color: 'sky', min: 31, max: 37 },
            { label: 'Average', color: 'amber', min: 24, max: 31 },
            { label: 'Below Average', color: 'red', max: 24 },
          ],
        },
      ],
    },
    equipmentRequired: ['Treadmill', 'Metabolic cart'], estimatedDuration: '30-45 min' },
  { id: 'vo2max_cycle', name: 'VO₂max — Cycle Ergometer', shortName: 'Cycle VO₂', category: 'aerobic',
    description: 'Laboratory VO₂max on cycle ergometer.',
    fields: [
      { key: 'vo2max', label: 'VO₂max', type: 'number', unit: 'ml/kg/min', required: true },
      { key: 'max_hr', label: 'Max HR', type: 'number', unit: 'bpm' },
      { key: 'max_power', label: 'Max Power Output', type: 'number', unit: 'W' },
    ],
    equipmentRequired: ['Cycle ergometer', 'Metabolic cart'], estimatedDuration: '30-45 min' },
  { id: 'beep_test', name: '20m Shuttle Run (Beep Test)', shortName: 'Beep Test', category: 'aerobic',
    description: 'Progressive shuttle run to exhaustion. Level + shuttle reached. Auto-calculates total shuttles, distance & VO₂max.',
    fields: [
      { key: 'level', label: 'Level Reached', type: 'number', required: true, min: 1, max: 21 },
      { key: 'shuttle', label: 'Shuttle Reached', type: 'number', required: true, min: 1 },
      { key: 'max_hr', label: 'Max HR', type: 'number', unit: 'bpm' },
    ],
    calculations: [
      { key: 'total_shuttles', label: 'Total Shuttles', unit: '',
        formula: (v) => {
          const result = beepTestLookup(v.level, v.shuttle);
          return result?.totalShuttles ?? null;
        },
      },
      { key: 'total_distance', label: 'Total Distance', unit: 'm',
        formula: (v) => {
          const result = beepTestLookup(v.level, v.shuttle);
          return result?.totalDistance ?? null;
        },
      },
      { key: 'estimated_vo2max', label: 'Est. VO₂max', unit: 'ml/kg/min',
        formula: (v) => {
          const result = beepTestLookup(v.level, v.shuttle);
          return result?.estimatedVO2max ?? null;
        },
      },
    ],
    norms: { primaryField: 'estimated_vo2max', genderSpecific: true,
      male: [
        { label: 'Excellent', color: 'emerald', min: 51 },
        { label: 'Good', color: 'sky', min: 43, max: 51 },
        { label: 'Average', color: 'amber', min: 35, max: 43 },
        { label: 'Below Average', color: 'red', max: 35 },
      ],
      female: [
        { label: 'Excellent', color: 'emerald', min: 45 },
        { label: 'Good', color: 'sky', min: 38, max: 45 },
        { label: 'Average', color: 'amber', min: 30, max: 38 },
        { label: 'Below Average', color: 'red', max: 30 },
      ],
    },
    estimatedDuration: '15-25 min' },
  { id: 'yoyo_ir1', name: 'Yo-Yo IR1', shortName: 'Yo-Yo IR1', category: 'aerobic',
    description: 'Intermittent recovery test Level 1. 2×20m shuttles with 10s rest.',
    fields: [
      { key: 'distance', label: 'Total Distance', type: 'number', unit: 'm', required: true },
      { key: 'level', label: 'Level Reached', type: 'number' },
      { key: 'max_hr', label: 'Max HR', type: 'number', unit: 'bpm' },
    ],
    calculations: [
      { key: 'estimated_vo2max', label: 'Est. VO₂max', unit: 'ml/kg/min',
        formula: (v) => v.distance ? +(v.distance * 0.0084 + 36.4).toFixed(1) : null },
    ],
    estimatedDuration: '15-25 min' },
  { id: 'yoyo_ir2', name: 'Yo-Yo IR2', shortName: 'Yo-Yo IR2', category: 'aerobic',
    description: 'Intermittent recovery test Level 2. Higher starting speed than IR1.',
    fields: [
      { key: 'distance', label: 'Total Distance', type: 'number', unit: 'm', required: true },
      { key: 'level', label: 'Level Reached', type: 'number' },
      { key: 'max_hr', label: 'Max HR', type: 'number', unit: 'bpm' },
    ],
    estimatedDuration: '10-20 min' },
  { id: 'cooper_test', name: 'Cooper 12-Minute Run', shortName: 'Cooper', category: 'aerobic',
    description: 'Run as far as possible in 12 minutes.',
    fields: [
      { key: 'distance', label: 'Distance', type: 'number', unit: 'm', required: true },
    ],
    calculations: [
      { key: 'estimated_vo2max', label: 'Est. VO₂max', unit: 'ml/kg/min',
        formula: (v) => v.distance ? +((v.distance - 504.9) / 44.73).toFixed(1) : null },
    ],
    norms: { primaryField: 'distance', genderSpecific: true,
      male: [
        { label: 'Excellent', color: 'emerald', min: 2800 },
        { label: 'Good', color: 'sky', min: 2400, max: 2800 },
        { label: 'Average', color: 'amber', min: 2200, max: 2400 },
        { label: 'Below Average', color: 'red', max: 2200 },
      ],
      female: [
        { label: 'Excellent', color: 'emerald', min: 2400 },
        { label: 'Good', color: 'sky', min: 2000, max: 2400 },
        { label: 'Average', color: 'amber', min: 1800, max: 2000 },
        { label: 'Below Average', color: 'red', max: 1800 },
      ],
      ageGroups: [
        { label: '13-19', minAge: 13, maxAge: 19,
          male: [
            { label: 'Excellent', color: 'emerald', min: 2700 },
            { label: 'Good', color: 'sky', min: 2300, max: 2700 },
            { label: 'Average', color: 'amber', min: 2100, max: 2300 },
            { label: 'Below Average', color: 'red', max: 2100 },
          ],
          female: [
            { label: 'Excellent', color: 'emerald', min: 2200 },
            { label: 'Good', color: 'sky', min: 1800, max: 2200 },
            { label: 'Average', color: 'amber', min: 1600, max: 1800 },
            { label: 'Below Average', color: 'red', max: 1600 },
          ],
        },
        { label: '20-29', minAge: 20, maxAge: 29,
          male: [
            { label: 'Excellent', color: 'emerald', min: 2800 },
            { label: 'Good', color: 'sky', min: 2400, max: 2800 },
            { label: 'Average', color: 'amber', min: 2200, max: 2400 },
            { label: 'Below Average', color: 'red', max: 2200 },
          ],
          female: [
            { label: 'Excellent', color: 'emerald', min: 2400 },
            { label: 'Good', color: 'sky', min: 2000, max: 2400 },
            { label: 'Average', color: 'amber', min: 1800, max: 2000 },
            { label: 'Below Average', color: 'red', max: 1800 },
          ],
        },
        { label: '30-39', minAge: 30, maxAge: 39,
          male: [
            { label: 'Excellent', color: 'emerald', min: 2700 },
            { label: 'Good', color: 'sky', min: 2300, max: 2700 },
            { label: 'Average', color: 'amber', min: 2100, max: 2300 },
            { label: 'Below Average', color: 'red', max: 2100 },
          ],
          female: [
            { label: 'Excellent', color: 'emerald', min: 2300 },
            { label: 'Good', color: 'sky', min: 1900, max: 2300 },
            { label: 'Average', color: 'amber', min: 1700, max: 1900 },
            { label: 'Below Average', color: 'red', max: 1700 },
          ],
        },
        { label: '40-49', minAge: 40, maxAge: 49,
          male: [
            { label: 'Excellent', color: 'emerald', min: 2500 },
            { label: 'Good', color: 'sky', min: 2100, max: 2500 },
            { label: 'Average', color: 'amber', min: 1900, max: 2100 },
            { label: 'Below Average', color: 'red', max: 1900 },
          ],
          female: [
            { label: 'Excellent', color: 'emerald', min: 2100 },
            { label: 'Good', color: 'sky', min: 1700, max: 2100 },
            { label: 'Average', color: 'amber', min: 1500, max: 1700 },
            { label: 'Below Average', color: 'red', max: 1500 },
          ],
        },
        { label: '50+', minAge: 50, maxAge: 99,
          male: [
            { label: 'Excellent', color: 'emerald', min: 2400 },
            { label: 'Good', color: 'sky', min: 2000, max: 2400 },
            { label: 'Average', color: 'amber', min: 1600, max: 2000 },
            { label: 'Below Average', color: 'red', max: 1600 },
          ],
          female: [
            { label: 'Excellent', color: 'emerald', min: 1900 },
            { label: 'Good', color: 'sky', min: 1500, max: 1900 },
            { label: 'Average', color: 'amber', min: 1300, max: 1500 },
            { label: 'Below Average', color: 'red', max: 1300 },
          ],
        },
      ],
    },
    estimatedDuration: '12 min' },
  { id: '2_4km_run', name: '2.4km Run Test', shortName: '2.4km', category: 'aerobic',
    description: 'Run 2.4 kilometres for time. Estimates VO₂max.',
    fields: [{ key: 'time', label: 'Time', type: 'number', unit: 'min', required: true, step: 0.1 }],
    calculations: [
      { key: 'estimated_vo2max', label: 'Est. VO₂max', unit: 'ml/kg/min',
        formula: (v) => v.time ? +(483 / v.time + 3.5).toFixed(1) : null },
    ],
    norms: { primaryField: 'time', genderSpecific: true,
      male: [
        { label: 'Excellent', color: 'emerald', max: 9.0 },
        { label: 'Good', color: 'sky', min: 9.0, max: 10.5 },
        { label: 'Average', color: 'amber', min: 10.5, max: 12.5 },
        { label: 'Below Average', color: 'red', min: 12.5 },
      ],
      female: [
        { label: 'Excellent', color: 'emerald', max: 10.5 },
        { label: 'Good', color: 'sky', min: 10.5, max: 12.5 },
        { label: 'Average', color: 'amber', min: 12.5, max: 15.0 },
        { label: 'Below Average', color: 'red', min: 15.0 },
      ],
    },
    estimatedDuration: '8-15 min' },
  { id: 'km_tt', name: '1-Kilometer Time Trial', shortName: '1km TT', category: 'aerobic',
    description: 'Run 1km as fast as possible.',
    fields: [{ key: 'time', label: 'Time', type: 'number', unit: 'min', required: true, step: 0.01 }],
    estimatedDuration: '3-5 min' },
  { id: 'ift_3015', name: '30-15 Intermittent Fitness Test', shortName: '30-15 IFT', category: 'aerobic',
    description: '30s runs at increasing speeds with 15s passive rest. VIFT = final completed stage speed.',
    fields: [
      { key: 'vift', label: 'VIFT (Final Speed)', type: 'number', unit: 'km/h', required: true, step: 0.5 },
      { key: 'max_hr', label: 'Max HR', type: 'number', unit: 'bpm' },
    ],
    estimatedDuration: '15-25 min' },
  { id: 'list_soccer', name: 'Loughborough IST (Soccer)', shortName: 'LIST', category: 'aerobic',
    description: 'Soccer-specific intermittent shuttle test. Walk, jog, cruise, sprint blocks.',
    fields: [
      { key: 'blocks_completed', label: 'Blocks Completed', type: 'number', required: true },
      { key: 'shuttles_final', label: 'Shuttles in Final Block', type: 'number' },
      { key: 'max_hr', label: 'Max HR', type: 'number', unit: 'bpm' },
    ],
    estimatedDuration: '45-90 min' },
];

// ─── ANAEROBIC CAPACITY TESTS (5) ─────────────────────────────────

const anaerobicTests: TestDefinition[] = [
  { id: 'rast', name: 'Running-Based Anaerobic Sprint Test', shortName: 'RAST', category: 'anaerobic',
    description: '6 × 35m sprints with 10s rest. Peak/mean power and fatigue index.',
    fields: [
      { key: 'body_mass', label: 'Body Mass', type: 'number', unit: 'kg', required: true },
      { key: 'time_1', label: 'Sprint 1', type: 'number', unit: 's', required: true, step: 0.01 },
      { key: 'time_2', label: 'Sprint 2', type: 'number', unit: 's', required: true, step: 0.01 },
      { key: 'time_3', label: 'Sprint 3', type: 'number', unit: 's', required: true, step: 0.01 },
      { key: 'time_4', label: 'Sprint 4', type: 'number', unit: 's', required: true, step: 0.01 },
      { key: 'time_5', label: 'Sprint 5', type: 'number', unit: 's', required: true, step: 0.01 },
      { key: 'time_6', label: 'Sprint 6', type: 'number', unit: 's', required: true, step: 0.01 },
    ],
    calculations: [
      { key: 'peak_power', label: 'Peak Power', unit: 'W',
        formula: (v) => {
          if (!v.body_mass) return null;
          const times = [v.time_1, v.time_2, v.time_3, v.time_4, v.time_5, v.time_6].filter(Boolean);
          if (times.length < 6) return null;
          const powers = times.map((t: number) => v.body_mass * Math.pow(35, 2) / Math.pow(t, 3));
          return +Math.max(...powers).toFixed(1);
        },
      },
      { key: 'fatigue_index', label: 'Fatigue Index', unit: 'W/s',
        formula: (v) => {
          if (!v.body_mass) return null;
          const times = [v.time_1, v.time_2, v.time_3, v.time_4, v.time_5, v.time_6].filter(Boolean);
          if (times.length < 6) return null;
          const powers = times.map((t: number) => v.body_mass * Math.pow(35, 2) / Math.pow(t, 3));
          return +((Math.max(...powers) - Math.min(...powers)) / (times.length * 10)).toFixed(2);
        },
      },
    ],
    estimatedDuration: '10 min' },
  { id: 'rsa_6x20', name: 'Repeat Sprint Ability (6×20m)', shortName: 'RSA 6×20', category: 'anaerobic',
    description: '6 × 20m all-out sprints with 20s rest. Fatigue index calculated.',
    fields: [
      { key: 'time_1', label: 'Sprint 1', type: 'number', unit: 's', required: true, step: 0.01 },
      { key: 'time_2', label: 'Sprint 2', type: 'number', unit: 's', required: true, step: 0.01 },
      { key: 'time_3', label: 'Sprint 3', type: 'number', unit: 's', required: true, step: 0.01 },
      { key: 'time_4', label: 'Sprint 4', type: 'number', unit: 's', required: true, step: 0.01 },
      { key: 'time_5', label: 'Sprint 5', type: 'number', unit: 's', required: true, step: 0.01 },
      { key: 'time_6', label: 'Sprint 6', type: 'number', unit: 's', required: true, step: 0.01 },
    ],
    calculations: [
      { key: 'best_time', label: 'Best Sprint', unit: 's',
        formula: (v) => { const t = [v.time_1,v.time_2,v.time_3,v.time_4,v.time_5,v.time_6].filter(Boolean); return t.length ? +Math.min(...t).toFixed(2) : null; }},
      { key: 'mean_time', label: 'Mean Sprint', unit: 's',
        formula: (v) => { const t = [v.time_1,v.time_2,v.time_3,v.time_4,v.time_5,v.time_6].filter(Boolean); return t.length === 6 ? +(t.reduce((a: number,b: number)=>a+b,0)/6).toFixed(2) : null; }},
      { key: 'fatigue_pct', label: 'Fatigue %', unit: '%',
        formula: (v) => { const t = [v.time_1,v.time_2,v.time_3,v.time_4,v.time_5,v.time_6].filter(Boolean); if (t.length<6) return null; const best = Math.min(...t); const mean = t.reduce((a: number,b: number)=>a+b,0)/6; return +(((mean/best)-1)*100).toFixed(1); }},
    ],
    equipmentRequired: ['Timing gates'], estimatedDuration: '10 min' },
  { id: 'rsa_6x35', name: 'Repeat Sprint Ability (6×35m)', shortName: 'RSA 6×35', category: 'anaerobic',
    description: '6 × 35m all-out sprints with 10s rest.',
    fields: [
      { key: 'time_1', label: 'Sprint 1', type: 'number', unit: 's', required: true, step: 0.01 },
      { key: 'time_2', label: 'Sprint 2', type: 'number', unit: 's', required: true, step: 0.01 },
      { key: 'time_3', label: 'Sprint 3', type: 'number', unit: 's', required: true, step: 0.01 },
      { key: 'time_4', label: 'Sprint 4', type: 'number', unit: 's', required: true, step: 0.01 },
      { key: 'time_5', label: 'Sprint 5', type: 'number', unit: 's', required: true, step: 0.01 },
      { key: 'time_6', label: 'Sprint 6', type: 'number', unit: 's', required: true, step: 0.01 },
    ],
    equipmentRequired: ['Timing gates'], estimatedDuration: '10 min' },
  { id: 'shuttle_300yd', name: '300-Yard Shuttle Run', shortName: '300yd', category: 'anaerobic',
    description: '12 × 25 yard shuttles for time. Anaerobic capacity.',
    fields: [
      { key: 'time_trial1', label: 'Trial 1', type: 'number', unit: 's', required: true, step: 0.01 },
      { key: 'time_trial2', label: 'Trial 2', type: 'number', unit: 's', step: 0.01 },
    ],
    calculations: [
      { key: 'average', label: 'Average', unit: 's',
        formula: (v) => v.time_trial1 && v.time_trial2 ? +((v.time_trial1 + v.time_trial2) / 2).toFixed(2) : null },
    ],
    estimatedDuration: '10 min' },
  { id: 'wingate_anaerobic', name: 'Wingate Anaerobic Test', shortName: 'Wingate', category: 'anaerobic',
    description: '30-second all-out cycle test (also in Strength/Power).',
    fields: [
      { key: 'peak_power', label: 'Peak Power', type: 'number', unit: 'W', required: true },
      { key: 'mean_power', label: 'Mean Power', type: 'number', unit: 'W', required: true },
      { key: 'min_power', label: 'Minimum Power', type: 'number', unit: 'W' },
      { key: 'body_mass', label: 'Body Mass', type: 'number', unit: 'kg', required: true },
    ],
    calculations: [
      { key: 'rel_peak', label: 'Relative Peak Power', unit: 'W/kg',
        formula: (v) => v.peak_power && v.body_mass ? +(v.peak_power / v.body_mass).toFixed(1) : null },
      { key: 'fatigue_index', label: 'Fatigue Index', unit: '%',
        formula: (v) => v.peak_power && v.min_power ? +(((v.peak_power - v.min_power) / v.peak_power) * 100).toFixed(1) : null },
    ],
    equipmentRequired: ['Wingate cycle ergometer'], estimatedDuration: '15 min' },
];

// ─── ANTHROPOMETRY / BODY COMPOSITION TESTS (9) ───────────────────

const anthropometryTests: TestDefinition[] = [
  { id: 'height', name: 'Height Measurement', shortName: 'Height', category: 'anthropometry',
    description: 'Standing height (stadiometer).',
    fields: [{ key: 'height', label: 'Height', type: 'number', unit: 'cm', required: true, step: 0.1 }],
    estimatedDuration: '1 min' },
  { id: 'body_mass', name: 'Body Mass (Weight)', shortName: 'Weight', category: 'anthropometry',
    description: 'Body mass on calibrated scale.',
    fields: [{ key: 'weight', label: 'Weight', type: 'number', unit: 'kg', required: true, step: 0.1 }],
    estimatedDuration: '1 min' },
  { id: 'bmi', name: 'Body Mass Index', shortName: 'BMI', category: 'anthropometry',
    description: 'BMI = weight(kg) / height(m)².',
    fields: [
      { key: 'weight', label: 'Weight', type: 'number', unit: 'kg', required: true, step: 0.1 },
      { key: 'height', label: 'Height', type: 'number', unit: 'cm', required: true, step: 0.1 },
    ],
    calculations: [
      { key: 'bmi', label: 'BMI', unit: 'kg/m²',
        formula: (v) => v.weight && v.height ? +(v.weight / Math.pow(v.height / 100, 2)).toFixed(1) : null },
    ],
    norms: { primaryField: 'bmi', bands: [
      { label: 'Underweight', color: 'amber', max: 18.5 },
      { label: 'Normal', color: 'emerald', min: 18.5, max: 25 },
      { label: 'Overweight', color: 'orange', min: 25, max: 30 },
      { label: 'Obese', color: 'red', min: 30 },
    ]},
    estimatedDuration: '2 min' },
  { id: 'skinfold_3', name: 'Skinfold Measurements (3-site)', shortName: 'SF 3-site', category: 'anthropometry',
    description: 'Jackson-Pollock 3-site skinfold protocol. Auto-calculates body density & body fat %.',
    fields: [
      { key: 'gender', label: 'Gender', type: 'select', options: ['Male', 'Female'], required: true },
      { key: 'age', label: 'Age', type: 'number', required: true },
      { key: 'site_1', label: 'Site 1 (mm)', type: 'number', unit: 'mm', required: true, helpText: 'Male: Chest / Female: Tricep' },
      { key: 'site_2', label: 'Site 2 (mm)', type: 'number', unit: 'mm', required: true, helpText: 'Male: Abdomen / Female: Suprailiac' },
      { key: 'site_3', label: 'Site 3 (mm)', type: 'number', unit: 'mm', required: true, helpText: 'Male: Thigh / Female: Thigh' },
    ],
    calculations: [
      { key: 'sum', label: 'Sum of Skinfolds', unit: 'mm',
        formula: (v) => v.site_1 && v.site_2 && v.site_3 ? +(v.site_1 + v.site_2 + v.site_3).toFixed(1) : null },
      { key: 'body_density', label: 'Body Density', unit: 'g/cm³',
        formula: (v) => {
          const sum = v.site_1 && v.site_2 && v.site_3 ? v.site_1 + v.site_2 + v.site_3 : null;
          if (!sum || !v.age) return null;
          const result = jacksonPollock3(sum, v.age, v.gender === 'Male');
          return result?.density ?? null;
        },
      },
      { key: 'body_fat_pct', label: 'Body Fat %', unit: '%',
        formula: (v) => {
          const sum = v.site_1 && v.site_2 && v.site_3 ? v.site_1 + v.site_2 + v.site_3 : null;
          if (!sum || !v.age) return null;
          const result = jacksonPollock3(sum, v.age, v.gender === 'Male');
          return result?.bodyFat ?? null;
        },
      },
    ],
    norms: { primaryField: 'body_fat_pct', genderSpecific: true,
      male: [
        { label: 'Essential', color: 'red', max: 5 },
        { label: 'Athletic', color: 'emerald', min: 5, max: 13 },
        { label: 'Fitness', color: 'sky', min: 13, max: 17 },
        { label: 'Average', color: 'amber', min: 17, max: 25 },
        { label: 'Obese', color: 'red', min: 25 },
      ],
      female: [
        { label: 'Essential', color: 'red', max: 13 },
        { label: 'Athletic', color: 'emerald', min: 13, max: 20 },
        { label: 'Fitness', color: 'sky', min: 20, max: 24 },
        { label: 'Average', color: 'amber', min: 24, max: 32 },
        { label: 'Obese', color: 'red', min: 32 },
      ],
    },
    equipmentRequired: ['Skinfold calipers'], estimatedDuration: '10 min' },
  { id: 'skinfold_7', name: 'Skinfold Measurements (7-site)', shortName: 'SF 7-site', category: 'anthropometry',
    description: 'Jackson-Pollock 7-site skinfold protocol. Auto-calculates body density & body fat %.',
    fields: [
      { key: 'gender', label: 'Gender', type: 'select', options: ['Male', 'Female'], required: true },
      { key: 'age', label: 'Age', type: 'number', required: true },
      { key: 'chest', label: 'Chest (mm)', type: 'number', unit: 'mm', required: true },
      { key: 'midaxillary', label: 'Midaxillary (mm)', type: 'number', unit: 'mm', required: true },
      { key: 'tricep', label: 'Tricep (mm)', type: 'number', unit: 'mm', required: true },
      { key: 'subscapular', label: 'Subscapular (mm)', type: 'number', unit: 'mm', required: true },
      { key: 'abdomen', label: 'Abdomen (mm)', type: 'number', unit: 'mm', required: true },
      { key: 'suprailiac', label: 'Suprailiac (mm)', type: 'number', unit: 'mm', required: true },
      { key: 'thigh', label: 'Thigh (mm)', type: 'number', unit: 'mm', required: true },
    ],
    calculations: [
      { key: 'sum', label: 'Sum of Skinfolds', unit: 'mm',
        formula: (v) => {
          const sites = [v.chest, v.midaxillary, v.tricep, v.subscapular, v.abdomen, v.suprailiac, v.thigh].filter(Boolean);
          return sites.length === 7 ? +sites.reduce((a: number, b: number) => a + b, 0).toFixed(1) : null;
        },
      },
      { key: 'body_density', label: 'Body Density', unit: 'g/cm³',
        formula: (v) => {
          const sites = [v.chest, v.midaxillary, v.tricep, v.subscapular, v.abdomen, v.suprailiac, v.thigh].filter(Boolean);
          if (sites.length !== 7 || !v.age) return null;
          const sum = sites.reduce((a: number, b: number) => a + b, 0);
          const result = jacksonPollock7(sum, v.age, v.gender === 'Male');
          return result?.density ?? null;
        },
      },
      { key: 'body_fat_pct', label: 'Body Fat %', unit: '%',
        formula: (v) => {
          const sites = [v.chest, v.midaxillary, v.tricep, v.subscapular, v.abdomen, v.suprailiac, v.thigh].filter(Boolean);
          if (sites.length !== 7 || !v.age) return null;
          const sum = sites.reduce((a: number, b: number) => a + b, 0);
          const result = jacksonPollock7(sum, v.age, v.gender === 'Male');
          return result?.bodyFat ?? null;
        },
      },
    ],
    norms: { primaryField: 'body_fat_pct', genderSpecific: true,
      male: [
        { label: 'Essential', color: 'red', max: 5 },
        { label: 'Athletic', color: 'emerald', min: 5, max: 13 },
        { label: 'Fitness', color: 'sky', min: 13, max: 17 },
        { label: 'Average', color: 'amber', min: 17, max: 25 },
        { label: 'Obese', color: 'red', min: 25 },
      ],
      female: [
        { label: 'Essential', color: 'red', max: 13 },
        { label: 'Athletic', color: 'emerald', min: 13, max: 20 },
        { label: 'Fitness', color: 'sky', min: 20, max: 24 },
        { label: 'Average', color: 'amber', min: 24, max: 32 },
        { label: 'Obese', color: 'red', min: 32 },
      ],
    },
    equipmentRequired: ['Skinfold calipers'], estimatedDuration: '15 min' },
  { id: 'body_fat_pct', name: 'Body Fat Percentage', shortName: 'Body Fat %', category: 'anthropometry',
    description: 'Calculated from skinfold measurements.',
    fields: [
      { key: 'body_fat', label: 'Body Fat', type: 'number', unit: '%', required: true, step: 0.1 },
      { key: 'method', label: 'Method', type: 'select', options: ['3-site Skinfold', '7-site Skinfold', 'DEXA', 'BIA', 'Hydrostatic'] },
    ],
    norms: { primaryField: 'body_fat', genderSpecific: true,
      male: [
        { label: 'Essential', color: 'red', max: 5 },
        { label: 'Athletic', color: 'emerald', min: 5, max: 13 },
        { label: 'Fitness', color: 'sky', min: 13, max: 17 },
        { label: 'Average', color: 'amber', min: 17, max: 25 },
        { label: 'Obese', color: 'red', min: 25 },
      ],
      female: [
        { label: 'Essential', color: 'red', max: 13 },
        { label: 'Athletic', color: 'emerald', min: 13, max: 20 },
        { label: 'Fitness', color: 'sky', min: 20, max: 24 },
        { label: 'Average', color: 'amber', min: 24, max: 32 },
        { label: 'Obese', color: 'red', min: 32 },
      ],
    },
    estimatedDuration: '5 min' },
  { id: 'waist_hip', name: 'Waist-to-Hip Ratio', shortName: 'WHR', category: 'anthropometry',
    description: 'Waist circumference / hip circumference.',
    fields: [
      { key: 'waist', label: 'Waist Circumference', type: 'number', unit: 'cm', required: true, step: 0.1 },
      { key: 'hip', label: 'Hip Circumference', type: 'number', unit: 'cm', required: true, step: 0.1 },
    ],
    calculations: [
      { key: 'whr', label: 'WHR', unit: '',
        formula: (v) => v.waist && v.hip ? +(v.waist / v.hip).toFixed(3) : null },
    ],
    norms: { primaryField: 'whr', genderSpecific: true,
      male: [
        { label: 'Low Risk', color: 'emerald', max: 0.90 },
        { label: 'Moderate Risk', color: 'amber', min: 0.90, max: 1.0 },
        { label: 'High Risk', color: 'red', min: 1.0 },
      ],
      female: [
        { label: 'Low Risk', color: 'emerald', max: 0.80 },
        { label: 'Moderate Risk', color: 'amber', min: 0.80, max: 0.85 },
        { label: 'High Risk', color: 'red', min: 0.85 },
      ],
    },
    estimatedDuration: '5 min' },
  { id: 'girth', name: 'Girth Measurements (7 sites)', shortName: 'Girths', category: 'anthropometry',
    description: 'Circumference measurements at 7 standardized body sites.',
    fields: [
      { key: 'chest', label: 'Chest', type: 'number', unit: 'cm', step: 0.1 },
      { key: 'waist', label: 'Waist', type: 'number', unit: 'cm', step: 0.1 },
      { key: 'hip', label: 'Hip', type: 'number', unit: 'cm', step: 0.1 },
      { key: 'upper_arm_r', label: 'Upper Arm R', type: 'number', unit: 'cm', step: 0.1 },
      { key: 'upper_arm_l', label: 'Upper Arm L', type: 'number', unit: 'cm', step: 0.1 },
      { key: 'thigh_r', label: 'Thigh R', type: 'number', unit: 'cm', step: 0.1 },
      { key: 'thigh_l', label: 'Thigh L', type: 'number', unit: 'cm', step: 0.1 },
      { key: 'calf_r', label: 'Calf R', type: 'number', unit: 'cm', step: 0.1 },
      { key: 'calf_l', label: 'Calf L', type: 'number', unit: 'cm', step: 0.1 },
    ],
    equipmentRequired: ['Tape measure'], estimatedDuration: '10 min' },
  { id: 'bia', name: 'Bioelectrical Impedance Analysis', shortName: 'BIA', category: 'anthropometry',
    description: 'Body composition via bioelectrical impedance.',
    fields: [
      { key: 'body_fat', label: 'Body Fat', type: 'number', unit: '%', step: 0.1 },
      { key: 'lean_mass', label: 'Lean Mass', type: 'number', unit: 'kg', step: 0.1 },
      { key: 'total_water', label: 'Total Body Water', type: 'number', unit: '%', step: 0.1 },
      { key: 'weight', label: 'Weight', type: 'number', unit: 'kg', step: 0.1 },
    ],
    equipmentRequired: ['BIA device'], estimatedDuration: '5 min' },
];

// ─── SPORT-SPECIFIC TESTS (3) ─────────────────────────────────────

const sportSpecificTests: TestDefinition[] = [
  { id: 'cornering_agility', name: 'Cornering Agility Test (Ice Hockey)', shortName: 'Cornering', category: 'sport_specific',
    description: 'On-ice cornering agility around face-off circles. Test both directions.',
    fields: [
      { key: 'time_left', label: 'Best Time (Left/CW)', type: 'number', unit: 's', required: true, step: 0.01 },
      { key: 'time_right', label: 'Best Time (Right/CCW)', type: 'number', unit: 's', required: true, step: 0.01 },
      { key: 'trial_2_left', label: 'Trial 2 (Left)', type: 'number', unit: 's', step: 0.01 },
      { key: 'trial_2_right', label: 'Trial 2 (Right)', type: 'number', unit: 's', step: 0.01 },
    ],
    calculations: [
      { key: 'best_time', label: 'Best Overall', unit: 's',
        formula: (v) => v.time_left && v.time_right ? +Math.min(v.time_left, v.time_right).toFixed(2) : null },
      { key: 'asymmetry', label: 'Asymmetry', unit: '%',
        formula: (v) => v.time_left && v.time_right ? +(Math.abs(v.time_left - v.time_right) / Math.min(v.time_left, v.time_right) * 100).toFixed(1) : null },
    ],
    equipmentRequired: ['Ice rink', 'Timing system', 'Pylons'], estimatedDuration: '10 min' },
  { id: 'figure8_skating', name: 'Figure-8 Skating Test', shortName: 'Figure-8', category: 'sport_specific',
    description: 'On-ice figure-8 skating around face-off circles. Test both directions.',
    fields: [
      { key: 'time_cw', label: 'Best Time (Clockwise)', type: 'number', unit: 's', required: true, step: 0.01 },
      { key: 'time_ccw', label: 'Best Time (Counter-CW)', type: 'number', unit: 's', required: true, step: 0.01 },
      { key: 'trial_2_cw', label: 'Trial 2 (CW)', type: 'number', unit: 's', step: 0.01 },
      { key: 'trial_2_ccw', label: 'Trial 2 (CCW)', type: 'number', unit: 's', step: 0.01 },
    ],
    calculations: [
      { key: 'best_time', label: 'Best Overall', unit: 's',
        formula: (v) => v.time_cw && v.time_ccw ? +Math.min(v.time_cw, v.time_ccw).toFixed(2) : null },
      { key: 'asymmetry', label: 'Asymmetry', unit: '%',
        formula: (v) => v.time_cw && v.time_ccw ? +(Math.abs(v.time_cw - v.time_ccw) / Math.min(v.time_cw, v.time_ccw) * 100).toFixed(1) : null },
    ],
    equipmentRequired: ['Ice rink', 'Timing system', 'Pylons'], estimatedDuration: '10 min' },
  { id: 'sport_endurance', name: 'Sport-Specific Endurance Test', shortName: 'Sport End.', category: 'sport_specific',
    description: 'Custom sport-specific endurance protocol. Define sport, protocol, and result.',
    fields: [
      { key: 'sport', label: 'Sport', type: 'select', options: ['Swimming', 'Rowing', 'Boxing', 'MMA', 'Cycling', 'Wrestling', 'Rugby', 'Soccer', 'Other'], required: true },
      { key: 'protocol', label: 'Protocol Name', type: 'text', required: true, placeholder: 'e.g. 2000m Ergometer, 400m Swim, 3-min Round Test' },
      { key: 'result_value', label: 'Result', type: 'number', required: true },
      { key: 'result_unit', label: 'Result Unit', type: 'select', options: ['seconds', 'minutes', 'meters', 'km', 'rounds', 'reps', 'watts', 'score'] },
      { key: 'max_hr', label: 'Max HR', type: 'number', unit: 'bpm' },
      { key: 'rpe', label: 'RPE', type: 'number', min: 1, max: 10 },
      { key: 'notes', label: 'Notes', type: 'text' },
    ],
    estimatedDuration: 'Varies' },
];

// ─── COMBINED REGISTRY ─────────────────────────────────────────────

export const ALL_TESTS: TestDefinition[] = [
  ...musculoskeletalTests,
  ...musculoskeletalExtras,
  ...strengthPowerTests,
  ...speedAgilityTests,
  ...flexibilityTests,
  ...aerobicTests,
  ...anaerobicTests,
  ...anthropometryTests,
  ...sportSpecificTests,
];

/** Get tests for a specific category */
export function getTestsByCategory(category: TestCategory): TestDefinition[] {
  return ALL_TESTS.filter(t => t.category === category);
}

/** Look up a single test by id */
export function getTestById(id: string): TestDefinition | undefined {
  return ALL_TESTS.find(t => t.id === id);
}
