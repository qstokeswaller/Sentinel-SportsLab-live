// Generates the Chelsea FC 2025/26 mock periodization plan JSON
// Run: node scripts/generate-mock-plan.js

const uid = (prefix) => `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2,7)}`;

function makeWeeks(startDateStr, count, sessions = {}) {
  const weeks = [];
  const base = new Date(startDateStr + 'T12:00:00');
  for (let i = 0; i < count; i++) {
    const d = new Date(base);
    d.setDate(d.getDate() + i * 7);
    const wStart = d.toISOString().split('T')[0];
    weeks.push({
      id: `w_${wStart.replace(/-/g,'')}`,
      weekNumber: i + 1,
      startDate: wStart,
      intent: sessions[wStart]?.intent || '',
      sessions: sessions[wStart]?.sessions || []
    });
  }
  return weeks;
}

const plan = {
  id: 'plan_chelsea_2526',
  name: 'Chelsea FC 2025/26 Season',
  targetId: 'a860106d-956e-4e36-b8d7-23ec6fc88679',
  targetType: 'Team',
  startDate: '2025-07-07',
  endDate: '2026-05-31',
  status: 'active',
  viewMode: 'timeline',
  modalities: ['Strength','Plyometrics','Speed','Conditioning','Loaded Power','Mobility','Tactical'],
  createdAt: '2025-07-01T08:00:00.000Z',
  updatedAt: '2026-05-07T08:00:00.000Z',
  volumeOverrides: {},
  intensityOverrides: {},

  events: [
    { id:'ev1',  title:'PL: Chelsea vs Liverpool',    date:'2025-08-16', type:'competition', notes:'Home' },
    { id:'ev2',  title:'PL: Leeds vs Chelsea',         date:'2025-08-23', type:'competition', notes:'Away' },
    { id:'ev3',  title:'PL: Chelsea vs Man City',      date:'2025-09-13', type:'competition', notes:'Home' },
    { id:'ev4',  title:'PL: Tottenham vs Chelsea',     date:'2025-10-04', type:'competition', notes:'Away' },
    { id:'ev5',  title:'PL: Chelsea vs Newcastle',     date:'2025-11-08', type:'competition', notes:'Home' },
    { id:'ev6',  title:'PL: Man Utd vs Chelsea',       date:'2025-11-29', type:'competition', notes:'Away' },
    { id:'ev7',  title:'PL: Chelsea vs Brighton',      date:'2025-12-13', type:'competition', notes:'Home' },
    { id:'ev8',  title:'PL: Chelsea vs West Ham',      date:'2026-01-10', type:'competition', notes:'Home' },
    { id:'ev9',  title:'PL: Aston Villa vs Chelsea',   date:'2026-02-07', type:'competition', notes:'Away' },
    { id:'ev10', title:'PL: Chelsea vs Everton',       date:'2026-03-14', type:'competition', notes:'Home' },
    { id:'ev11', title:'PL: Arsenal vs Chelsea',       date:'2026-04-11', type:'competition', notes:'Away' },
    { id:'ev12', title:'PL: Chelsea vs Man City',      date:'2026-05-09', type:'competition', notes:'Home - Title Decider' },
  ],

  phases: [
    // ── Phase 1: Pre-Season ─────────────────────────────────────────
    {
      id: 'ph1', name: 'Pre-Season', color: '#3b82f6',
      startDate: '2025-07-07', endDate: '2025-08-08',
      trainingPhase: 'Pre-Season',
      blocks: [
        {
          id:'blk_p1', name:'P1', label:'General Conditioning',
          blockType:'Low Intensity',
          goals:'Build aerobic base and restore fitness levels after off-season. Focus on volume accumulation and movement quality.',
          startDate:'2025-07-07', endDate:'2025-07-20', color:'#3b82f6',
          intensityLevel:'Low', volumeLevel:'High',
          modalities:{ Conditioning:'High', Mobility:'High', Strength:'Moderate' },
          weeks: makeWeeks('2025-07-07', 2, {
            '2025-07-07': { intent:'Volume Base', sessions:[
              { id:'s_p1_1a', date:'2025-07-07', name:'Conditioning - Aerobic Base', load:'Low', modality:'Conditioning', plannedDuration:75, sections:[], notes:'', plannedRPE:null, workoutTemplateId:null },
              { id:'s_p1_1b', date:'2025-07-09', name:'Gym - General Strength', load:'Low', modality:'Strength', plannedDuration:60, sections:[], notes:'', plannedRPE:null, workoutTemplateId:null },
              { id:'s_p1_1c', date:'2025-07-11', name:'Mobility & Recovery', load:'Low', modality:'Mobility', plannedDuration:45, sections:[], notes:'', plannedRPE:null, workoutTemplateId:null },
            ]},
            '2025-07-14': { intent:'Volume Accumulation', sessions:[
              { id:'s_p1_2a', date:'2025-07-14', name:'Conditioning - Threshold Run', load:'Moderate', modality:'Conditioning', plannedDuration:80, sections:[], notes:'', plannedRPE:null, workoutTemplateId:null },
              { id:'s_p1_2b', date:'2025-07-16', name:'Gym - Lower Body', load:'Moderate', modality:'Strength', plannedDuration:65, sections:[], notes:'', plannedRPE:null, workoutTemplateId:null },
              { id:'s_p1_2c', date:'2025-07-18', name:'Speed Fundamentals', load:'Moderate', modality:'Speed', plannedDuration:60, sections:[], notes:'', plannedRPE:null, workoutTemplateId:null },
            ]},
          })
        },
        {
          id:'blk_p2', name:'P2', label:'Physical Foundation',
          blockType:'Medium Intensity',
          goals:'Develop physical qualities: strength, power, speed endurance. Introduce sport-specific conditioning and plyometrics.',
          startDate:'2025-07-21', endDate:'2025-08-03', color:'#2563eb',
          intensityLevel:'Moderate', volumeLevel:'High',
          modalities:{ Strength:'High', Plyometrics:'Moderate', Conditioning:'High' },
          weeks: makeWeeks('2025-07-21', 2, {
            '2025-07-21': { intent:'Strength Load', sessions:[
              { id:'s_p2_1a', date:'2025-07-21', name:'Gym - Upper Body Strength', load:'High', modality:'Strength', plannedDuration:70, sections:[], notes:'', plannedRPE:null, workoutTemplateId:null },
              { id:'s_p2_1b', date:'2025-07-22', name:'Plyometrics + Speed', load:'High', modality:'Plyometrics', plannedDuration:65, sections:[], notes:'', plannedRPE:null, workoutTemplateId:null },
              { id:'s_p2_1c', date:'2025-07-23', name:'Conditioning - Intervals', load:'High', modality:'Conditioning', plannedDuration:70, sections:[], notes:'', plannedRPE:null, workoutTemplateId:null },
              { id:'s_p2_1d', date:'2025-07-25', name:'Gym - Lower Body Power', load:'High', modality:'Strength', plannedDuration:65, sections:[], notes:'', plannedRPE:null, workoutTemplateId:null },
            ]},
            '2025-07-28': { intent:'Deload', sessions:[
              { id:'s_p2_2a', date:'2025-07-28', name:'Gym - Full Body', load:'Moderate', modality:'Strength', plannedDuration:60, sections:[], notes:'', plannedRPE:null, workoutTemplateId:null },
              { id:'s_p2_2b', date:'2025-07-30', name:'Conditioning - Aerobic', load:'Low', modality:'Conditioning', plannedDuration:50, sections:[], notes:'', plannedRPE:null, workoutTemplateId:null },
              { id:'s_p2_2c', date:'2025-08-01', name:'Mobility & Recovery', load:'Low', modality:'Mobility', plannedDuration:40, sections:[], notes:'', plannedRPE:null, workoutTemplateId:null },
            ]},
          })
        },
        {
          id:'blk_p3', name:'P3', label:'Pre-Season Build',
          blockType:'High Intensity',
          goals:'Sharpen fitness, integrate tactical work, simulate match intensity. Prepare for competitive season.',
          startDate:'2025-08-04', endDate:'2025-08-08', color:'#1d4ed8',
          intensityLevel:'High', volumeLevel:'Moderate',
          modalities:{ Tactical:'High', Speed:'High', Conditioning:'Moderate' },
          weeks: makeWeeks('2025-08-04', 1, {
            '2025-08-04': { intent:'Match Sharpness', sessions:[
              { id:'s_p3_1a', date:'2025-08-04', name:'Tactical - Team Shape', load:'Moderate', modality:'Tactical', plannedDuration:90, sections:[], notes:'', plannedRPE:null, workoutTemplateId:null },
              { id:'s_p3_1b', date:'2025-08-05', name:'Speed & Power Activation', load:'High', modality:'Speed', plannedDuration:60, sections:[], notes:'', plannedRPE:null, workoutTemplateId:null },
              { id:'s_p3_1c', date:'2025-08-07', name:'Pre-Season Friendly vs Athletic Club', load:'High', modality:'Tactical', plannedDuration:90, sections:[], notes:'Friendly fixture', plannedRPE:null, workoutTemplateId:null },
            ]},
          })
        },
      ]
    },

    // ── Phase 2: Early Season ────────────────────────────────────────
    {
      id:'ph2', name:'Early Season', color:'#f59e0b',
      startDate:'2025-08-09', endDate:'2025-10-31',
      trainingPhase:'General Preparation',
      blocks: [
        {
          id:'blk_p4', name:'P4', label:'Early Season Base',
          blockType:'Medium Intensity',
          goals:'Maintain fitness while managing match load. Establish competition rhythm and test game plans against live opposition.',
          startDate:'2025-08-09', endDate:'2025-09-05', color:'#f59e0b',
          intensityLevel:'Moderate', volumeLevel:'Moderate',
          modalities:{ Tactical:'High', Conditioning:'Moderate', Strength:'Moderate' },
          weeks: makeWeeks('2025-08-11', 4, {
            '2025-08-11': { intent:'Competition Prep', sessions:[] },
            '2025-08-18': { intent:'Recovery & Reload', sessions:[] },
            '2025-08-25': { intent:'Load Build', sessions:[] },
            '2025-09-01': { intent:'Match Prep', sessions:[] },
          })
        },
        {
          id:'blk_p5', name:'P5', label:'Competition Rhythm',
          blockType:'High Intensity',
          goals:'Optimise performance around weekly match schedule. Maintain peak physical output while managing cumulative fatigue.',
          startDate:'2025-09-06', endDate:'2025-10-31', color:'#d97706',
          intensityLevel:'High', volumeLevel:'Moderate',
          modalities:{ Tactical:'Very High', Speed:'High', 'Loaded Power':'Moderate' },
          weeks: makeWeeks('2025-09-08', 8)
        },
      ]
    },

    // ── Phase 3: Mid-Season Competition ────────────────────────────
    {
      id:'ph3', name:'Mid-Season Competition', color:'#10b981',
      startDate:'2025-11-01', endDate:'2026-02-27',
      trainingPhase:'Competition',
      blocks: [
        {
          id:'blk_p6', name:'P6', label:'Competition Peak',
          blockType:'High Intensity',
          goals:'Sustain high performance output through busy fixture period. Prioritise between-match recovery and readiness.',
          startDate:'2025-11-01', endDate:'2025-12-19', color:'#10b981',
          intensityLevel:'High', volumeLevel:'Low',
          modalities:{ Tactical:'Very High', 'Loaded Power':'High', Speed:'High' },
          weeks: makeWeeks('2025-11-03', 7)
        },
        {
          id:'blk_p7', name:'P7', label:'Winter Break',
          blockType:'Recovery',
          goals:'Active recovery, restore energy reserves, address injury risk factors. Mental reset for second half of season.',
          startDate:'2025-12-20', endDate:'2026-01-02', color:'#059669',
          intensityLevel:'Low', volumeLevel:'Moderate',
          modalities:{ Mobility:'Very High', Conditioning:'Low', Strength:'Low' },
          weeks: makeWeeks('2025-12-22', 2, {
            '2025-12-22': { intent:'Active Recovery', sessions:[
              { id:'s_p7_1a', date:'2025-12-22', name:'Mobility & Flexibility', load:'Low', modality:'Mobility', plannedDuration:60, sections:[], notes:'', plannedRPE:null, workoutTemplateId:null },
              { id:'s_p7_1b', date:'2025-12-24', name:'Light Conditioning', load:'Low', modality:'Conditioning', plannedDuration:40, sections:[], notes:'', plannedRPE:null, workoutTemplateId:null },
            ]},
            '2025-12-29': { intent:'Return to Training', sessions:[
              { id:'s_p7_2a', date:'2025-12-29', name:'Gym - General Strength', load:'Low', modality:'Strength', plannedDuration:55, sections:[], notes:'', plannedRPE:null, workoutTemplateId:null },
              { id:'s_p7_2b', date:'2025-12-31', name:'Conditioning - Aerobic Base', load:'Low', modality:'Conditioning', plannedDuration:50, sections:[], notes:'', plannedRPE:null, workoutTemplateId:null },
            ]},
          })
        },
        {
          id:'blk_p8', name:'P8', label:'Second Half Charge',
          blockType:'Maximal Load',
          goals:'Build intensity for title run. High-output sessions around match schedule. Sustain peak performance through fixture congestion.',
          startDate:'2026-01-03', endDate:'2026-02-27', color:'#047857',
          intensityLevel:'Very High', volumeLevel:'Low',
          modalities:{ 'Loaded Power':'Very High', Speed:'High', Tactical:'Very High' },
          weeks: makeWeeks('2026-01-05', 8)
        },
      ]
    },

    // ── Phase 4: Season Finale ──────────────────────────────────────
    {
      id:'ph4', name:'Season Finale', color:'#8b5cf6',
      startDate:'2026-02-28', endDate:'2026-05-31',
      trainingPhase:'Competition',
      blocks: [
        {
          id:'blk_p9', name:'P9', label:'Title Run',
          blockType:'Maximal Load',
          goals:'Peak performance output. Every session and match counts. Win the league title.',
          startDate:'2026-02-28', endDate:'2026-04-17', color:'#8b5cf6',
          intensityLevel:'Very High', volumeLevel:'Low',
          modalities:{ Tactical:'Very High', 'Loaded Power':'High', Speed:'Very High' },
          weeks: makeWeeks('2026-03-02', 7, {
            '2026-04-06': { intent:'Match Week vs Arsenal', sessions:[
              { id:'s_p9_6a', date:'2026-04-06', name:'Gym - Strength & Power', load:'Moderate', modality:'Strength', plannedDuration:60, sections:[], notes:'', plannedRPE:null, workoutTemplateId:null },
              { id:'s_p9_6b', date:'2026-04-07', name:'Tactical - Team Shape', load:'Moderate', modality:'Tactical', plannedDuration:90, sections:[], notes:'', plannedRPE:null, workoutTemplateId:null },
              { id:'s_p9_6c', date:'2026-04-08', name:'Speed & Activation', load:'High', modality:'Speed', plannedDuration:55, sections:[], notes:'', plannedRPE:null, workoutTemplateId:null },
              { id:'s_p9_6d', date:'2026-04-09', name:'Loaded Power Circuit', load:'High', modality:'Loaded Power', plannedDuration:50, sections:[], notes:'', plannedRPE:null, workoutTemplateId:null },
              { id:'s_p9_6e', date:'2026-04-10', name:'MD-1 Priming', load:'Low', modality:'Conditioning', plannedDuration:40, sections:[], notes:'', plannedRPE:null, workoutTemplateId:null },
              { id:'s_p9_6f', date:'2026-04-12', name:'Recovery & Regeneration', load:'Low', modality:'Mobility', plannedDuration:45, sections:[], notes:'', plannedRPE:null, workoutTemplateId:null },
            ]},
            '2026-04-13': { intent:'Final Title Push', sessions:[
              { id:'s_p9_7a', date:'2026-04-13', name:'Gym - Power Development', load:'High', modality:'Loaded Power', plannedDuration:65, sections:[], notes:'', plannedRPE:null, workoutTemplateId:null },
              { id:'s_p9_7b', date:'2026-04-14', name:'Tactical - Set Pieces', load:'Moderate', modality:'Tactical', plannedDuration:75, sections:[], notes:'', plannedRPE:null, workoutTemplateId:null },
              { id:'s_p9_7c', date:'2026-04-15', name:'Speed & Conditioning', load:'High', modality:'Speed', plannedDuration:55, sections:[], notes:'', plannedRPE:null, workoutTemplateId:null },
              { id:'s_p9_7d', date:'2026-04-16', name:'MD-1 Priming', load:'Low', modality:'Conditioning', plannedDuration:40, sections:[], notes:'', plannedRPE:null, workoutTemplateId:null },
            ]},
          })
        },
        {
          id:'blk_p10', name:'P10', label:'Season Finale',
          blockType:'High Intensity',
          goals:'Finish the season strong. Manage fatigue while maintaining peak readiness for every remaining fixture.',
          startDate:'2026-04-18', endDate:'2026-05-31', color:'#7c3aed',
          intensityLevel:'High', volumeLevel:'Low',
          modalities:{ Tactical:'Very High', Speed:'High', 'Loaded Power':'High' },
          weeks: makeWeeks('2026-04-20', 6, {
            '2026-04-20': { intent:'Match Week', sessions:[
              { id:'s_p10_1a', date:'2026-04-20', name:'Gym - Strength & Power', load:'Moderate', modality:'Strength', plannedDuration:65, sections:[], notes:'', plannedRPE:null, workoutTemplateId:null },
              { id:'s_p10_1b', date:'2026-04-21', name:'Tactical - Ball Work', load:'Moderate', modality:'Tactical', plannedDuration:85, sections:[], notes:'', plannedRPE:null, workoutTemplateId:null },
              { id:'s_p10_1c', date:'2026-04-22', name:'Speed & Loaded Power', load:'High', modality:'Speed', plannedDuration:60, sections:[], notes:'', plannedRPE:null, workoutTemplateId:null },
              { id:'s_p10_1d', date:'2026-04-23', name:'Conditioning + Tactical', load:'Moderate', modality:'Conditioning', plannedDuration:70, sections:[], notes:'', plannedRPE:null, workoutTemplateId:null },
              { id:'s_p10_1e', date:'2026-04-24', name:'MD-1 Activation', load:'Low', modality:'Conditioning', plannedDuration:45, sections:[], notes:'', plannedRPE:null, workoutTemplateId:null },
              { id:'s_p10_1f', date:'2026-04-26', name:'Recovery & Regeneration', load:'Low', modality:'Mobility', plannedDuration:50, sections:[], notes:'', plannedRPE:null, workoutTemplateId:null },
            ]},
            '2026-04-27': { intent:'Chelsea vs Arsenal - Pre-Match Build', sessions:[
              { id:'s_p10_2a', date:'2026-04-27', name:'Gym - Power & Plyometrics', load:'High', modality:'Loaded Power', plannedDuration:65, sections:[], notes:'', plannedRPE:null, workoutTemplateId:null },
              { id:'s_p10_2b', date:'2026-04-28', name:'Tactical - Opposition Analysis', load:'Moderate', modality:'Tactical', plannedDuration:90, sections:[], notes:'Analyse Man City pressing triggers', plannedRPE:null, workoutTemplateId:null },
              { id:'s_p10_2c', date:'2026-04-29', name:'Speed & Agility Circuit', load:'High', modality:'Speed', plannedDuration:55, sections:[], notes:'', plannedRPE:null, workoutTemplateId:null },
              { id:'s_p10_2d', date:'2026-04-30', name:'Loaded Power + Conditioning', load:'Moderate', modality:'Loaded Power', plannedDuration:65, sections:[], notes:'', plannedRPE:null, workoutTemplateId:null },
              { id:'s_p10_2e', date:'2026-05-01', name:'MD-1 Priming', load:'Low', modality:'Conditioning', plannedDuration:45, sections:[], notes:'', plannedRPE:null, workoutTemplateId:null },
              { id:'s_p10_2f', date:'2026-05-03', name:'Active Recovery', load:'Low', modality:'Mobility', plannedDuration:45, sections:[], notes:'', plannedRPE:null, workoutTemplateId:null },
            ]},
            '2026-05-04': { intent:'Chelsea vs Man City - Title Decider', sessions:[
              { id:'s_p10_3a', date:'2026-05-04', name:'Gym - Strength & Power', load:'Moderate', modality:'Strength', plannedDuration:65, sections:[], notes:'', plannedRPE:null, workoutTemplateId:null },
              { id:'s_p10_3b', date:'2026-05-05', name:'Tactical - Man City Shape', load:'Moderate', modality:'Tactical', plannedDuration:90, sections:[], notes:'Final opponent analysis and set pieces', plannedRPE:null, workoutTemplateId:null },
              { id:'s_p10_3c', date:'2026-05-06', name:'Speed & Activation', load:'High', modality:'Speed', plannedDuration:55, sections:[], notes:'', plannedRPE:null, workoutTemplateId:null },
              { id:'s_p10_3d', date:'2026-05-07', name:'Loaded Power + Conditioning', load:'Moderate', modality:'Loaded Power', plannedDuration:60, sections:[], notes:'MD-2', plannedRPE:null, workoutTemplateId:null },
              { id:'s_p10_3e', date:'2026-05-08', name:'MD-1 Priming & Set Pieces', load:'Low', modality:'Tactical', plannedDuration:45, sections:[], notes:'Final walkthrough and set pieces', plannedRPE:null, workoutTemplateId:null },
              { id:'s_p10_3f', date:'2026-05-10', name:'Recovery & Regeneration', load:'Low', modality:'Mobility', plannedDuration:45, sections:[], notes:'Post-match recovery protocol', plannedRPE:null, workoutTemplateId:null },
            ]},
            '2026-05-11': { intent:'Champions Celebration Week', sessions:[] },
            '2026-05-18': { intent:'Final Match Day', sessions:[] },
            '2026-05-25': { intent:'Season Wrap', sessions:[] },
          })
        },
      ]
    },
  ]
};

console.log(JSON.stringify(plan, null, 0));
