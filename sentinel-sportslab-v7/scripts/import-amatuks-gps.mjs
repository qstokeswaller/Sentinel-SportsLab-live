// AmaTuks GPS Data Import Script
// Reads all Polar CSV files from data/GPS data/ and inserts into Supabase user_data for Bryant

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');

const BRYANT_USER_ID = '47a85539-0179-4708-bb4a-ccd3edc77129';
const AMATUKS_TEAM_ID = 'fe610eb0-5f92-4bd7-ad00-d4500667d4dd';
const GPS_DATA_DIR = path.join(ROOT, 'data', 'GPS data');
const ACWR_COLUMN = 'Distance in Speed zone 5 [m] (25.00- km/h)';

// Full AmaTuks athlete roster
const ATHLETES = {
  'Abel Mabaso': '19aae57a-c007-4040-bb51-1f774fcfda54',
  'Akhanyile Norawana': '34ecbf92-90ac-4b74-81a1-946c0670848c',
  'Aphelele Teto': '57c723ca-c33a-488f-b38c-fff06bc52aa9',
  'Bantu Chingi': '97cdce41-c2df-4880-9919-cc9f9f5671ff',
  'Bongumusa Nkosi': 'f7edf669-8f00-4c94-b28c-e0894be9abcb',
  'Camagu Mdevulana': '8cf0f579-0fa0-49fc-b61f-f32d138c9c47',
  'Frank Mpedi': '414a8111-f561-40cf-a44d-cfd30559062a',
  'Gennaro Johnson': 'bb6fe9cb-43eb-4fc3-af48-8d1ec97941e6',
  'Ismail Watenga': 'e9b077ac-2bfc-4b0f-ae03-e00fce9b40f9',
  'Jayden Van Der Walt': 'f186ff9a-5981-4214-b2e4-b76686432e0f',
  'Jody Ah Shene': '9afb50ef-818f-426a-b008-9ec7356119b9',
  'Jordan Allies': '585f04db-b4cf-4a71-bb00-3f8970207d21',
  'Kamohelo Hoala': 'ff988dae-bfd1-4dd4-9c08-309264bfdebe',
  'Kamohelo Pheeane': '7a32d2e9-f207-4351-a1db-20adcf37faac',
  'Lesego Sebetlela': '81aedae5-e0a8-44c1-9bef-f279c841baec',
  'Lucky Letwaba': 'f4940c65-5be4-4f85-8e1d-e3231c2966d8',
  'Luke Daniels': '9771d6a7-cc17-4536-9118-f98dac5b311c',
  'Luvuyo Phewa': '9028e6e6-434d-40f8-86fb-1c512c21b786',
  'Maselaelo Seanego': 'eb38d7e6-9845-4298-a649-05889e729b3c',
  'Matome Rangata': '53a664cf-3b28-4089-982d-41da65214ad9',
  'Mcebisi Langa': '60c09cbf-7f5c-48cd-92b2-f5bc94440799',
  'Ntando Nkosi': 'b5f147ef-6c83-4282-81a9-c3b8d9cfe552',
  'Prince Nxumalo': '66cb7cb6-0567-474f-99ac-ea73811b0177',
  'Risen Albert': 'ae698fbf-9e6c-4230-a0e8-1169e9a61d62',
  'Riyaaz Ismail': '581b261c-0cff-4d61-9e2a-25b55f4fe329',
  'Samuel Julies': '8bb7bbe9-abbd-45bc-80e5-a7807961a901',
  'Samukelo Ngodela': '2f034bb9-43ca-42a3-81e7-0326120df185',
  'Sibongakonke Mgwaba': '9789a331-b9e3-4995-99b3-87c7eaccd822',
  'Sibusiso Mthethwa': '6124d23a-753c-459a-97ed-4765367889d9',
  'Sifiso Mazibuko': '2a8d709e-dfee-40f3-9236-397b3d4e93c4',
  'Sifiso Mbidana': 'f0444f34-aa17-433b-a88b-72f25e1864fc',
  'Siyanda Msani': 'adcd2a57-b6ae-4945-89de-84040a5e7181',
  'Sydney Mtsweni': '71a2f807-f87d-4657-b780-22486b9c0e3f',
  'Tebogo Mohlamonyane': '55297c49-b23d-464f-a9fd-e5bbff827bf1',
  'Thabo Nkwana': '139daddd-3a81-4cef-9267-1d947a9c9b33',
  'Thando Buthelezi': '74722194-348c-4a90-a329-ab064f18f5c4',
  'Thulani Zandamela': '46ad67ab-e8ec-40ec-989d-4fd7f66ea9d7',
  'Tokollo Makgolane': '6f778f21-064e-4fe1-a46d-ff9b060d24f4',
  'Tshepang Makara': 'db585de6-4b4c-4b87-82c6-2cef99216c52',
  'Tshepiso Mahlangu': 'd7400df2-7152-4ab0-84ef-c2ec2794632f',
  'Veli Mothwa': 'c92461d2-f357-4be1-812b-ba6442e35a02',
  'Vusi Sibiya': '88f1c415-0493-4383-bb3d-1142422efba7',
  // CSV spelling aliases
  'Sibonga Mqwaba': '9789a331-b9e3-4995-99b3-87c7eaccd822',   // = Sibongakonke Mgwaba
  'Sidney Mtshweni': '71a2f807-f87d-4657-b780-22486b9c0e3f',  // = Sydney Mtsweni
};

// Fuzzy name match: normalise and try to find closest athlete
function normaliseName(n) {
  return n.toLowerCase().trim().replace(/\s+/g, ' ');
}

function matchAthlete(csvName) {
  const norm = normaliseName(csvName);
  // Exact match
  for (const [name, id] of Object.entries(ATHLETES)) {
    if (normaliseName(name) === norm) return { id, matchedName: name };
  }
  // Partial match (both directions)
  for (const [name, id] of Object.entries(ATHLETES)) {
    const normDb = normaliseName(name);
    if (normDb.includes(norm) || norm.includes(normDb)) return { id, matchedName: name };
  }
  return { id: null, matchedName: csvName };
}

// Parse HH:MM:SS → decimal minutes
function parseDuration(val) {
  if (!val) return null;
  const m = val.match(/^(\d+):(\d+):(\d+)$/);
  if (!m) return null;
  return parseFloat((parseInt(m[1]) * 60 + parseInt(m[2]) + parseInt(m[3]) / 60).toFixed(1));
}

// Parse DD-MM-YYYY HH:MM:SS → YYYY-MM-DD
function parseDate(val) {
  if (!val) return null;
  const m = val.match(/^(\d{2})-(\d{2})-(\d{4})/);
  if (!m) return null;
  return `${m[3]}-${m[2]}-${m[1]}`;
}

// Map CSV Type → category string
function mapCategory(type) {
  if (!type) return 'training';
  const t = type.toLowerCase();
  if (t.includes('match') || t.includes('game')) return 'match';
  if (t.includes('recovery')) return 'recovery';
  if (t.includes('gym') || t.includes('strength')) return 'gym';
  return 'training';
}

// Parse CSV string, handling quoted fields
function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
    } else if (ch === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }
  result.push(current.trim());
  return result;
}

// Duration columns (HH:MM:SS)
const DURATION_COLS = new Set([
  'Duration',
  'Time in HR zone 1 (50 - 59 %)',
  'Time in HR zone 2 (60 - 69 %)',
  'Time in HR zone 3 (70 - 79 %)',
  'Time in HR zone 4 (80 - 89 %)',
  'Time in HR zone 5 (90 - 100 %)',
  'Time in power zone 1 (70 - 84 %)',
  'Time in power zone 2 (85 - 99 %)',
  'Time in power zone 3 (100 - 129 %)',
  'Time in power zone 4 (130 - 179 %)',
  'Time in power zone 5 (180 - 800 %)',
  'Recovery time [h]',
]);

function processFile(filePath) {
  const raw = fs.readFileSync(filePath, 'utf-8').replace(/^\uFEFF/, ''); // strip BOM
  const lines = raw.split('\n').filter(l => l.trim());
  if (lines.length < 2) return [];

  const headers = parseCSVLine(lines[0]);
  const records = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    if (values.length < 5) continue;

    // Build raw column map, converting types
    const rawColumns = {};
    for (let j = 0; j < headers.length; j++) {
      const header = headers[j];
      const val = values[j] ?? '';
      if (!header) continue;

      if (DURATION_COLS.has(header)) {
        const parsed = parseDuration(val);
        rawColumns[header] = parsed !== null ? parsed : val;
      } else if (header === 'Start time' || header === 'End time') {
        rawColumns[header] = val; // keep as string
      } else {
        // Try numeric
        const num = parseFloat(val);
        rawColumns[header] = isNaN(num) ? val : num;
      }
    }

    const playerName = String(rawColumns['Player name'] || '').trim();
    if (!playerName) continue;

    // Skip summary/team rows (no player name or generic names)
    if (playerName.toLowerCase() === 'team' || playerName.toLowerCase() === 'average') continue;

    const { id: athleteId, matchedName } = matchAthlete(playerName);
    const dateRaw = String(rawColumns['Start time'] || '');
    const date = parseDate(dateRaw) || '';
    const phase = String(rawColumns['Phase name'] || 'Whole session');
    const csvType = String(rawColumns['Type'] || 'Training');
    const category = mapCategory(csvType);

    // ACWR value from sprint distance column
    const acwrRaw = rawColumns[ACWR_COLUMN];
    const acwrValue = (acwrRaw !== undefined && acwrRaw !== '') ? parseFloat(String(acwrRaw)) || 0 : null;

    const record = {
      id: `gps_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      date,
      playerName,
      phase,
      athleteId: athleteId || 'unknown',
      matchedName,
      teamId: AMATUKS_TEAM_ID,
      rawColumns,
      category,
      acwrValue,
      timestamp: new Date().toISOString(),
    };

    records.push(record);
  }

  return records;
}

// Generate stable ID based on date + player + phase to avoid duplicates on re-run
function stableId(date, playerName, phase, fileDate) {
  const key = `${date}|${playerName}|${phase}|${fileDate}`;
  let hash = 0;
  for (let i = 0; i < key.length; i++) {
    hash = ((hash << 5) - hash) + key.charCodeAt(i);
    hash |= 0;
  }
  return `gps_${Math.abs(hash).toString(36)}`;
}

async function main() {
  console.log('Reading GPS CSV files...');

  // Get all CSV files, exclude duplicates (prefer non-(1) version, but include (1) if no alternative)
  const allFiles = fs.readdirSync(GPS_DATA_DIR)
    .filter(f => f.endsWith('.csv'))
    .sort();

  // Deduplicate: group by timestamp prefix (first 15 chars of filename)
  const fileGroups = {};
  for (const f of allFiles) {
    const prefix = f.slice(0, 15); // e.g. 20260309_101258
    if (!fileGroups[prefix]) fileGroups[prefix] = [];
    fileGroups[prefix].push(f);
  }

  // Pick the canonical file per date (prefer no "(1)" suffix)
  const selectedFiles = [];
  for (const [prefix, files] of Object.entries(fileGroups)) {
    const base = files.find(f => !f.includes('(')) || files[0];
    selectedFiles.push(base);
  }

  selectedFiles.sort();
  console.log(`\nFiles to process (${selectedFiles.length}):`);
  selectedFiles.forEach(f => console.log(' -', f));

  let allRecords = [];
  const stats = { files: 0, rows: 0, matched: 0, unmatched: 0 };

  for (const filename of selectedFiles) {
    const filePath = path.join(GPS_DATA_DIR, filename);
    const fileDate = filename.slice(0, 8); // YYYYMMDD from filename
    console.log(`\nProcessing: ${filename}`);

    const records = processFile(filePath);

    // Assign stable IDs
    for (const r of records) {
      r.id = stableId(r.date, r.playerName, r.phase, fileDate);
      if (r.athleteId !== 'unknown') stats.matched++;
      else { stats.unmatched++; console.log(`  UNMATCHED: "${r.playerName}"`); }
    }

    console.log(`  → ${records.length} rows`);
    allRecords = allRecords.concat(records);
    stats.files++;
    stats.rows += records.length;
  }

  // Deduplicate by ID
  const recordMap = {};
  for (const r of allRecords) recordMap[r.id] = r;
  const dedupedRecords = Object.values(recordMap);

  console.log(`\n=== Summary ===`);
  console.log(`Files: ${stats.files}`);
  console.log(`Rows: ${stats.rows} (deduped: ${dedupedRecords.length})`);
  console.log(`Matched athletes: ${stats.matched}`);
  console.log(`Unmatched: ${stats.unmatched}`);

  // Build GPS team profile for AmaTuks (so it's stored in Supabase as fallback)
  // This mirrors the GpsTeamProfile structure from GpsConfigModal.tsx
  const columnMapping = {
    'Total distance [m]': { platformField: 'total_distance', displayName: 'Total Distance (m)', autoMapped: true },
    'Distance / min [m/min]': { platformField: 'distance_per_min', displayName: 'Distance/min', autoMapped: true },
    'Maximum speed [km/h]': { platformField: 'max_speed', displayName: 'Max Speed (km/h)', autoMapped: true },
    'Average speed [km/h]': { platformField: 'avg_speed', displayName: 'Avg Speed (km/h)', autoMapped: true },
    'Sprints': { platformField: 'sprint_count', displayName: 'Sprint Count', autoMapped: true },
    'Distance in Speed zone 1 [m] (3.00 - 8.99 km/h)': { platformField: 'walk_distance', displayName: 'Walk Zone (m)', autoMapped: true },
    'Distance in Speed zone 2 [m] (9.00 - 13.99 km/h)': { platformField: 'jog_distance', displayName: 'Jog Zone (m)', autoMapped: true },
    'Distance in Speed zone 3 [m] (14.00 - 18.99 km/h)': { platformField: 'run_distance', displayName: 'Run Zone (m)', autoMapped: true },
    'Distance in Speed zone 4 [m] (19.00 - 24.99 km/h)': { platformField: 'high_run_distance', displayName: 'High Run Zone (m)', autoMapped: true },
    'Distance in Speed zone 5 [m] (25.00- km/h)': { platformField: 'sprint_distance', displayName: 'Sprint Zone (m)', autoMapped: true },
    'HR avg [bpm]': { platformField: 'hr_avg', displayName: 'HR Average (bpm)', autoMapped: true },
    'HR max [bpm]': { platformField: 'hr_max', displayName: 'HR Max (bpm)', autoMapped: true },
    'HR avg [%]': { platformField: 'hr_avg_pct', displayName: 'HR Avg (%HRmax)', autoMapped: true },
    'HR max [%]': { platformField: 'hr_max_pct', displayName: 'HR Max (%HRmax)', autoMapped: true },
    'Time in HR zone 1 (50 - 59 %)': { platformField: 'hr_zone1_time', displayName: 'HR Zone 1 Time (min)', autoMapped: true },
    'Time in HR zone 2 (60 - 69 %)': { platformField: 'hr_zone2_time', displayName: 'HR Zone 2 Time (min)', autoMapped: true },
    'Time in HR zone 3 (70 - 79 %)': { platformField: 'hr_zone3_time', displayName: 'HR Zone 3 Time (min)', autoMapped: true },
    'Time in HR zone 4 (80 - 89 %)': { platformField: 'hr_zone4_time', displayName: 'HR Zone 4 Time (min)', autoMapped: true },
    'Time in HR zone 5 (90 - 100 %)': { platformField: 'hr_zone5_time', displayName: 'HR Zone 5 Time (min)', autoMapped: true },
    'Training load score': { platformField: 'polar_training_load', displayName: 'Training Load Score', autoMapped: true },
    'Cardio load': { platformField: 'polar_cardio_load', displayName: 'Cardio Load', autoMapped: true },
    'Muscle load': { platformField: 'polar_muscle_load', displayName: 'Muscle Load', autoMapped: true },
    'Recovery time [h]': { platformField: 'recovery_time', displayName: 'Recovery Time (h)', autoMapped: true },
    'Calories [kcal]': { platformField: 'calories', displayName: 'Calories (kcal)', autoMapped: true },
    'HRV (RMSSD)': { platformField: 'hrv_rmssd', displayName: 'HRV RMSSD', autoMapped: true },
    'Number of accelerations (2.00 - 2.99 m/s²)': { platformField: 'accel_high', displayName: 'High Accelerations', autoMapped: true },
    'Number of accelerations (3.00 - 50.00 m/s²)': { platformField: 'accel_max', displayName: 'Max Accelerations', autoMapped: true },
    'Number of accelerations (-2.99 - -2.00 m/s²)': { platformField: 'decel_high', displayName: 'High Decelerations', autoMapped: true },
    'Number of accelerations (-50.00 - -3.00 m/s²)': { platformField: 'decel_max', displayName: 'Max Decelerations', autoMapped: true },
  };

  // Build header fingerprint from all columns in any sample file
  const sampleFile = path.join(GPS_DATA_DIR, selectedFiles[0]);
  const sampleRaw = fs.readFileSync(sampleFile, 'utf-8').replace(/^\uFEFF/, '');
  const sampleHeaders = parseCSVLine(sampleRaw.split('\n')[0]).filter(Boolean);
  const headerFingerprint = sampleHeaders.map(h => h.toLowerCase().trim());

  const gpsProfile = {
    teamId: AMATUKS_TEAM_ID,
    teamName: 'AmaTuks',
    provider: 'Polar',
    columnMapping,
    acwrColumn: ACWR_COLUMN,
    headerFingerprint,
    savedAt: new Date().toISOString(),
  };

  const defaultCategories = [
    { id: 'training', label: 'Training', color: '#6366f1' },
    { id: 'match', label: 'Match', color: '#ef4444' },
    { id: 'recovery', label: 'Recovery', color: '#22c55e' },
    { id: 'gym', label: 'Gym / Strength', color: '#f59e0b' },
    { id: 'pre_season', label: 'Pre-Season', color: '#8b5cf6' },
    { id: 'friendly', label: 'Friendly', color: '#14b8a6' },
  ];

  // Write output JSON files for MCP SQL insertion
  const outputDir = path.join(ROOT, 'scripts', 'gps-import-output');
  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

  fs.writeFileSync(path.join(outputDir, 'gps_data.json'), JSON.stringify(dedupedRecords, null, 2));
  fs.writeFileSync(path.join(outputDir, 'gps_team_profiles.json'), JSON.stringify([gpsProfile], null, 2));
  fs.writeFileSync(path.join(outputDir, 'gps_categories.json'), JSON.stringify(defaultCategories, null, 2));

  console.log('\n=== Data written to scripts/gps-import-output/ ===');
  console.log(`gps_data.json: ${dedupedRecords.length} records`);
  console.log(`gps_team_profiles.json: AmaTuks profile with ${Object.keys(columnMapping).length} mapped columns`);
  console.log(`gps_categories.json: ${defaultCategories.length} categories`);
  console.log(`Date range: ${dedupedRecords.map(r => r.date).filter(Boolean).sort()[0]} → ${dedupedRecords.map(r => r.date).filter(Boolean).sort().at(-1)}`);

  // Show date breakdown
  const byDate = {};
  for (const r of dedupedRecords) {
    if (!byDate[r.date]) byDate[r.date] = 0;
    byDate[r.date]++;
  }
  console.log('\nRecords per session date:');
  Object.entries(byDate).sort().forEach(([date, count]) => console.log(`  ${date}: ${count} player-phase records`));
}

main().catch(err => { console.error(err); process.exit(1); });
