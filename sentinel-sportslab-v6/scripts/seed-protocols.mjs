/**
 * Seed script — generates all 67+ sport science testing protocols
 * plus 2 hamstring RTP protocols and saves them to the user_data table.
 *
 * Uses the service_role key to bypass RLS.
 * Run: node scripts/seed-protocols.mjs
 */
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const SUPABASE_URL = 'https://zlrpqcftufaljpwfsxbt.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpscnBxY2Z0dWZhbGpwd2ZzeGJ0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTk3NDczOCwiZXhwIjoyMDg3NTUwNzM4fQ.oq80X774_-gycy96YPA26cFJvyOLCIGEE9keQ87DMiw';
const USER_ID = '32eeb1d6-fcc5-4b6a-9645-c6dd50e31385';

const sb = createClient(SUPABASE_URL, SUPABASE_KEY);

// ── Helpers ──────────────────────────────────────────────────────────────────

let lineIdCounter = 0;
const uid = () => crypto.randomUUID();
const lid = () => `ln_${++lineIdCounter}`;

/** Map section number → protocol category */
const SECTION_CATEGORY = {
    1: 'Screening',
    2: 'Performance',
    3: 'Performance',
    4: 'Screening',
    5: 'Performance',
    6: 'Performance',
    7: 'Screening',
    8: 'Performance',
};

/** Cross-reference protocols to skip (already documented in other sections) */
const SKIP_PROTOCOLS = new Set(['4.7', '4.8', '6.1', '7.6']);

// ── Markdown Parser ──────────────────────────────────────────────────────────

/**
 * Parse a markdown text chunk (for one protocol) into TextLine[] array.
 * Rules:
 *   #### heading  → heading2
 *   **Bold:**     → paragraph (keep bold markers for renderBold)
 *   - item        → bullet
 *   1. item       → numbered
 *   ---           → divider
 *   blank line    → skip
 *   other text    → paragraph
 */
function parseMarkdownToLines(mdChunk) {
    const rawLines = mdChunk.split('\n');
    const lines = [];

    for (const raw of rawLines) {
        const trimmed = raw.trim();
        if (!trimmed) continue;

        // Divider
        if (/^-{3,}$/.test(trimmed)) {
            lines.push({ id: lid(), type: 'divider', content: '' });
            continue;
        }

        // Heading (####)
        if (trimmed.startsWith('#### ')) {
            const content = trimmed.replace(/^####\s+/, '').replace(/\*\*/g, '');
            lines.push({ id: lid(), type: 'heading2', content });
            continue;
        }

        // Numbered list (1. 2. etc, or o or ■ sub-items)
        const numberedMatch = trimmed.match(/^(\d+)\.\s+(.+)/);
        if (numberedMatch) {
            lines.push({ id: lid(), type: 'numbered', content: numberedMatch[2] });
            continue;
        }

        // Bullet list (- item, * item, or sub-bullets with o)
        if (/^[-*•]\s+/.test(trimmed)) {
            const content = trimmed.replace(/^[-*•]\s+/, '');
            lines.push({ id: lid(), type: 'bullet', content });
            continue;
        }

        // Sub-bullets (o item or ■ item)
        if (/^[o■]\s+/.test(trimmed)) {
            const content = trimmed.replace(/^[o■]\s+/, '');
            lines.push({ id: lid(), type: 'bullet', content });
            continue;
        }

        // Regular paragraph
        lines.push({ id: lid(), type: 'paragraph', content: trimmed });
    }

    return lines;
}

/**
 * Parse the full markdown file into an array of Protocol objects.
 */
function parseProtocolsFromMarkdown(filePath) {
    const md = readFileSync(filePath, 'utf8');
    const allLines = md.split('\n');
    const protocols = [];

    let currentSection = 0;
    let currentProtocolLines = [];
    let currentProtocolName = '';
    let currentProtocolNumber = '';

    for (let i = 0; i < allLines.length; i++) {
        const line = allLines[i];
        const trimmed = line.trim();

        // Detect section headers: ## 1. MUSCULOSKELETAL...
        const sectionMatch = trimmed.match(/^## (\d+)\.\s+(.+)/);
        if (sectionMatch) {
            // Save previous protocol if any
            if (currentProtocolName && currentProtocolLines.length > 0) {
                saveCurrentProtocol();
            }
            currentSection = parseInt(sectionMatch[1]);
            currentProtocolLines = [];
            currentProtocolName = '';
            currentProtocolNumber = '';
            continue;
        }

        // Skip section 9 (testing guidelines)
        if (currentSection >= 9) continue;

        // Detect protocol headers: ### 1.1 PROTOCOL_NAME
        const protocolMatch = trimmed.match(/^### (\d+\.\d+)\s+(.+)/);
        if (protocolMatch) {
            // Save previous protocol if any
            if (currentProtocolName && currentProtocolLines.length > 0) {
                saveCurrentProtocol();
            }
            currentProtocolNumber = protocolMatch[1];
            currentProtocolName = protocolMatch[2].replace(/\*\*/g, '');
            currentProtocolLines = [];
            continue;
        }

        // Accumulate lines for current protocol
        if (currentProtocolName && currentSection > 0 && currentSection < 9) {
            currentProtocolLines.push(line);
        }
    }

    // Save last protocol
    if (currentProtocolName && currentProtocolLines.length > 0) {
        saveCurrentProtocol();
    }

    function saveCurrentProtocol() {
        // Skip cross-reference protocols
        if (SKIP_PROTOCOLS.has(currentProtocolNumber)) return;
        // Skip if section is not mapped
        if (!SECTION_CATEGORY[currentSection]) return;

        const category = SECTION_CATEGORY[currentSection];
        const mdChunk = currentProtocolLines.join('\n');
        const textLines = parseMarkdownToLines(mdChunk);

        if (textLines.length === 0) return;

        // Clean up the name (remove trailing parenthetical like "(Treadmill)")
        const cleanName = currentProtocolName
            .replace(/\s*\(.*?\)\s*$/, '')
            .replace(/\s+/g, ' ')
            .trim();

        // Use the full name with parenthetical for the heading
        const displayName = currentProtocolName.replace(/\s+/g, ' ').trim();

        const now = new Date().toISOString();
        const protocol = {
            id: uid(),
            name: displayName,
            category,
            blocks: [
                {
                    id: uid(),
                    type: 'text_block',
                    lines: [
                        { id: lid(), type: 'heading1', content: displayName },
                        ...textLines,
                    ],
                },
            ],
            createdAt: now,
            updatedAt: now,
        };

        protocols.push(protocol);
    }

    return protocols;
}

// ── Hamstring RTP Protocols ──────────────────────────────────────────────────

function createHamstringWrittenProtocol() {
    const now = new Date().toISOString();

    const lines = [
        { id: lid(), type: 'heading1', content: 'Hamstring Return-to-Play Protocol Framework' },
        { id: lid(), type: 'paragraph', content: '**Overview:** Sudden-onset hamstring injuries often occur during high-speed running or stretching (hip flexion and knee extension) but can also result from acceleration, deceleration, pressing, and indirect player contact. Injury prevention efforts should go beyond focusing solely on high-speed running, targeting the multiple activities associated with hamstring injuries.' },
        { id: lid(), type: 'divider', content: '' },

        { id: lid(), type: 'heading2', content: 'Injury Insights (Aspetar Surveillance, Qatar Stars League)' },
        { id: lid(), type: 'bullet', content: '**86%** of sudden-onset hamstring injuries occur during running' },
        { id: lid(), type: 'bullet', content: '**24%** occur during acceleration and deceleration activities (0-10m)' },
        { id: lid(), type: 'bullet', content: '**Indirect contact and balance issues:** Involved in 53% and 63% of injuries within the 0-10m range' },
        { id: lid(), type: 'bullet', content: '**Pressing activities:** Involved in 46% of injuries, with 25% when the injured player pressed and 21% when pressed by an opponent' },
        { id: lid(), type: 'bullet', content: '**Player contact** involved in 69% of injuries while pressing and inadequate balance involved in 82%' },
        { id: lid(), type: 'paragraph', content: '**Recommendation:** Prevention efforts should account for acceleration, deceleration, pressing, balance training, and indirect contact scenarios.' },
        { id: lid(), type: 'divider', content: '' },

        { id: lid(), type: 'heading1', content: 'Hamstring Injury Grades and Recovery Process' },

        { id: lid(), type: 'heading2', content: 'Grade 1 Hamstring Injury (7-10 Days Recovery)' },
        { id: lid(), type: 'paragraph', content: '**Initial Recovery Goals (Days 1-10):**' },
        { id: lid(), type: 'bullet', content: 'Focus on **pain-free, functional exercises** to restore mobility, balance, and low-impact strength' },
        { id: lid(), type: 'bullet', content: 'Begin with **low-speed, low-intensity running drills**' },
        { id: lid(), type: 'paragraph', content: '**Speed Zones for Initial Recovery:**' },
        { id: lid(), type: 'bullet', content: '**Speed Zone 1:** 3-9 km/hr (walking)' },
        { id: lid(), type: 'bullet', content: '**Speed Zone 2:** 9-13 km/hr (fast walk/jog)' },
        { id: lid(), type: 'bullet', content: '**Speed Zone 3:** 14-19 km/hr (light running)' },
        { id: lid(), type: 'paragraph', content: '**Objective:** Maintain aerobic fitness through controlled, low-speed running that limits hamstring load.' },
        { id: lid(), type: 'divider', content: '' },

        { id: lid(), type: 'heading2', content: 'Key Components for Recovery Phase' },
        { id: lid(), type: 'paragraph', content: '**Acceleration/Deceleration Mechanics:**' },
        { id: lid(), type: 'bullet', content: 'Introduce low-intensity running drills focused on improving competency in these mechanics' },
        { id: lid(), type: 'paragraph', content: '**Isometric Strength Training:**' },
        { id: lid(), type: 'bullet', content: 'Resistance exercises: Use BOSU balls or similar equipment for core stability' },
        { id: lid(), type: 'paragraph', content: '**Proprioceptive Training:**' },
        { id: lid(), type: 'bullet', content: '**Balance exercises:** Emphasize coordination and balance through proprioceptive exercises to address stability and indirect/direct-contact risks' },
        { id: lid(), type: 'divider', content: '' },

        { id: lid(), type: 'heading2', content: 'Progressive Loading and Return to Participation (After 10 Days)' },
        { id: lid(), type: 'numbered', content: '**Participation in Warm-Ups and Low-Intensity Drills:** Join warm-up routines, passing, and receiving drills without intensity variations. Integrate jogging to build volume in high-speed running distances.' },
        { id: lid(), type: 'numbered', content: '**Progressive Speed Increase (Days 10+):** Transition to Speed Zone 4 (19-24 km/hr) running. Start adding acceleration and deceleration drills. Focus on curved runs, short sprints, and controlled acceleration/deceleration. Goal: Achieve pain-free high-speed running to 80% of max sprint speed.' },
        { id: lid(), type: 'numbered', content: '**Return to Full Speed and Capacity (Days 15+):** Once able to handle 80% of max sprint speed pain-free, build capacity within Speed Zone 5 (25 km/hr and above). Progressively increase accelerations and decelerations.' },
        { id: lid(), type: 'numbered', content: '**Controlled Return to Training:** Reintegrate into full training, limiting exposure to medium and large-sided games at first. Start as a wall player in pressing transition drills.' },
        { id: lid(), type: 'numbered', content: '**Long-Term Load Building (Weeks 3-4+):** Gradually increase play time and intensity. Session durations: Begin with 15 minutes, then progress to 30, 45, and full duration as tolerated.' },
        { id: lid(), type: 'divider', content: '' },

        { id: lid(), type: 'heading2', content: 'Protocol Summary' },
        { id: lid(), type: 'numbered', content: '**Days 1-10:** Pain-free functional exercises, low-intensity running, balance training' },
        { id: lid(), type: 'numbered', content: '**Days 10+:** Join warm-ups, increase speed and introduce jogging; focus on controlled, progressive load building' },
        { id: lid(), type: 'numbered', content: '**Days 15+:** Return to training, gradually add accelerations and decelerations, work up to full sprint capacity' },
        { id: lid(), type: 'numbered', content: '**Weeks 3-4+:** Controlled game integration, pressing restriction, gradual increase in session duration, and continued balance/proprioception exercises' },
    ];

    return {
        id: uid(),
        name: 'Hamstring Return-to-Play Protocol',
        category: 'Return to Play',
        blocks: [{ id: uid(), type: 'text_block', lines }],
        createdAt: now,
        updatedAt: now,
    };
}

function createHamstringExerciseProtocol() {
    const now = new Date().toISOString();

    // Text block with overview
    const overviewLines = [
        { id: lid(), type: 'heading1', content: 'Hamstring RTP Exercise Framework' },
        { id: lid(), type: 'paragraph', content: '**Symptom-Based Recommendation Protocol** — 8-phase progressive exercise framework for hamstring return-to-play rehabilitation. Exercises progress from ROM and balance through isometrics, concentrics, eccentrics, force acceptance, force production, and plyometrics.' },
        { id: lid(), type: 'paragraph', content: '**Progression Criteria:** Pain-free completion of all exercises in the current phase before advancing. Monitor symptom response 24-48 hours post-session.' },
    ];

    const overviewBlock = { id: uid(), type: 'text_block', lines: overviewLines };

    // Exercise blocks for each phase
    const phases = [
        {
            sectionName: 'Phase 1: ROM (Range of Motion)',
            exercises: [
                { name: 'Supine Hamstring Stretch', notes: '3 x 30s hold each leg' },
                { name: 'Prone Quad Stretch', notes: '3 x 30s hold each leg' },
                { name: 'Standing Hip Flexor Stretch', notes: '3 x 30s hold each leg' },
                { name: 'Seated Adductor Stretch (Butterfly)', notes: '3 x 30s hold' },
                { name: 'Supine Glute Stretch (Figure 4)', notes: '3 x 30s hold each leg' },
                { name: 'Prone Hip Extension', notes: '2 x 10 reps, slow controlled' },
                { name: 'Supine Knee Flexion Slides', notes: '2 x 15 reps each leg' },
                { name: 'Standing Hamstring Sweep', notes: '2 x 10 reps each leg' },
                { name: 'Cat-Cow Stretch', notes: '2 x 10 reps, focus on posterior chain mobility' },
                { name: 'Supine Hip Circles', notes: '2 x 10 each direction, each leg' },
                { name: 'Seated Hamstring Nerve Floss', notes: '2 x 15 reps each leg, gentle' },
                { name: 'Prone Knee Flexion (Active Assist)', notes: '2 x 12 reps each leg' },
                { name: 'Standing Leg Pendulum Swings', notes: '2 x 15 each direction, relaxed' },
                { name: 'Supine SLR with Strap', notes: '3 x 30s hold each leg' },
                { name: 'World\'s Greatest Stretch', notes: '2 x 5 each side, controlled' },
            ],
        },
        {
            sectionName: 'Phase 2: Balance & Proprioception',
            exercises: [
                { name: 'Single Leg Stance (Eyes Open)', notes: '3 x 30s each leg' },
                { name: 'Single Leg Stance (Eyes Closed)', notes: '3 x 20s each leg' },
                { name: 'BOSU Ball Single Leg Balance', notes: '3 x 20s each leg' },
                { name: 'Single Leg Stance with Ball Catch', notes: '3 x 10 throws each leg' },
                { name: 'Tandem Stance (Heel-to-Toe)', notes: '3 x 30s' },
                { name: 'Single Leg Balance on Airex Pad', notes: '3 x 20s each leg' },
                { name: 'Single Leg RDL (Bodyweight)', notes: '2 x 10 reps each leg' },
                { name: 'Star Excursion Balance Reach', notes: '2 x 6 reps each direction, each leg' },
                { name: 'Lateral Step-Over Balance', notes: '2 x 10 reps each direction' },
                { name: 'Single Leg Cone Touches', notes: '2 x 8 reps each leg, 3 cones' },
                { name: 'BOSU Squat Hold', notes: '3 x 15s' },
                { name: 'Perturbation Training (Partner Push)', notes: '3 x 10 pushes each leg' },
                { name: 'Dynamic Single Leg Balance (Arm Movements)', notes: '2 x 15s each leg' },
                { name: 'Wobble Board Balance', notes: '3 x 20s each leg' },
                { name: 'Single Leg Hop to Stabilize', notes: '2 x 6 reps each leg, pain-free only' },
            ],
        },
        {
            sectionName: 'Phase 3: Isometrics',
            exercises: [
                { name: 'Isometric Prone Hamstring Hold (45°)', notes: '4 x 5s holds, both legs' },
                { name: 'Isometric Prone Hamstring Hold (90°)', notes: '4 x 5s holds, both legs' },
                { name: 'Isometric Bridge Hold (Double Leg)', notes: '3 x 15s holds' },
                { name: 'Isometric Bridge Hold (Single Leg)', notes: '3 x 10s holds each leg' },
                { name: 'Isometric Wall Sit', notes: '3 x 20s, back flat against wall' },
                { name: 'Isometric Hip Extension (Prone)', notes: '4 x 5s holds each leg' },
                { name: 'Isometric Hamstring Hold (Standing)', notes: '3 x 5s holds each leg against wall' },
                { name: 'Isometric Copenhagen Hold', notes: '3 x 8s each side, adductor focus' },
                { name: 'Isometric Single Leg Bridge (Extended Range)', notes: '3 x 10s each leg, heels on bench' },
                { name: 'Isometric Split Stance Hold', notes: '3 x 10s each leg' },
                { name: 'Isometric Supine Hamstring Push (into floor)', notes: '4 x 5s max effort each leg' },
                { name: 'Isometric Glute Squeeze (Prone)', notes: '4 x 5s holds' },
                { name: 'Long Lever Isometric Bridge Hold', notes: '3 x 10s, feet further from hips' },
                { name: 'Isometric Hamstring Curl (Machine, Held)', notes: '4 x 5s at 45° and 90° each leg' },
                { name: 'Isometric Lunge Hold', notes: '3 x 10s each leg, rear foot elevated option' },
            ],
        },
        {
            sectionName: 'Phase 4: Concentrics',
            exercises: [
                { name: 'Double Leg Glute Bridge', notes: '3 x 12 reps' },
                { name: 'Single Leg Glute Bridge', notes: '3 x 10 reps each leg' },
                { name: 'Prone Hamstring Curl (Machine)', notes: '3 x 12 reps' },
                { name: 'Seated Hamstring Curl (Machine)', notes: '3 x 12 reps' },
                { name: 'Swiss Ball Hamstring Curl (Double Leg)', notes: '3 x 12 reps' },
                { name: 'Swiss Ball Hamstring Curl (Single Leg)', notes: '3 x 8 reps each leg' },
                { name: 'Cable Pull-Through', notes: '3 x 12 reps' },
                { name: 'Good Morning (Light Barbell)', notes: '3 x 10 reps' },
                { name: 'Hip Thrust (Barbell)', notes: '3 x 10 reps' },
                { name: 'Single Leg Hip Thrust', notes: '3 x 8 reps each leg' },
                { name: 'Slider Hamstring Curl (Double Leg)', notes: '3 x 10 reps' },
                { name: 'Kettlebell Swing', notes: '3 x 12 reps, focus on hip hinge' },
                { name: 'Step Up (Low Box)', notes: '3 x 10 reps each leg' },
                { name: 'Romanian Deadlift (Dumbbell)', notes: '3 x 10 reps' },
                { name: 'Reverse Lunge', notes: '3 x 10 reps each leg' },
                { name: 'Leg Press (Feet High)', notes: '3 x 12 reps, posterior chain emphasis' },
            ],
        },
        {
            sectionName: 'Phase 5: Eccentrics',
            exercises: [
                { name: 'Nordic Hamstring Curl (Assisted)', notes: '3 x 5 reps, partner or band assist' },
                { name: 'Nordic Hamstring Curl (Full)', notes: '3 x 5 reps' },
                { name: 'Romanian Deadlift (Barbell)', notes: '3 x 8 reps, controlled 3s eccentric' },
                { name: 'Single Leg Romanian Deadlift (Dumbbell)', notes: '3 x 8 reps each leg' },
                { name: 'Eccentric Slider Curl (Single Leg)', notes: '3 x 6 reps each leg' },
                { name: 'Eccentric Prone Hamstring Curl', notes: '3 x 8 reps, 4s lowering phase' },
                { name: 'Eccentric Glute Bridge Walkout', notes: '3 x 8 reps, walking feet out slowly' },
                { name: 'Eccentric Single Leg Bridge Lowering', notes: '3 x 8 reps each leg, 4s descent' },
                { name: 'Stiff Leg Deadlift (Eccentric Focus)', notes: '3 x 8 reps, 4s lowering' },
                { name: 'Razor Curl', notes: '3 x 5 reps, eccentric focus' },
                { name: 'Single Leg Eccentric Leg Press', notes: '3 x 8 reps each leg, 4s lowering' },
                { name: 'Eccentric Hip Extension Off Bench', notes: '3 x 8 reps each leg' },
                { name: 'Swiss Ball Eccentric Hamstring Curl', notes: '3 x 8 reps, slow roll out' },
                { name: 'Eccentric Step Down (Lateral)', notes: '3 x 8 reps each leg' },
                { name: 'Diver Nordic', notes: '3 x 4 reps, advanced progression' },
            ],
        },
        {
            sectionName: 'Phase 6: Force Acceptance',
            exercises: [
                { name: 'Drop Landing (Double Leg)', notes: '3 x 6 from 20cm box, soft landing' },
                { name: 'Drop Landing (Single Leg)', notes: '3 x 5 each leg from 15cm box' },
                { name: 'Deceleration Drill (Linear)', notes: '3 x 6 reps, 10m build-up, stop on mark' },
                { name: 'Lateral Deceleration Drill', notes: '3 x 5 each direction' },
                { name: 'Catch and Stabilize (Medball Throw)', notes: '3 x 8 reps, partner throw' },
                { name: 'Broad Jump to Stick', notes: '3 x 5 reps, focus on landing control' },
                { name: 'Lateral Bound to Stick', notes: '3 x 5 each direction' },
                { name: 'Depth Drop to Stabilize', notes: '3 x 5 from 30cm box' },
                { name: 'Eccentric Lunge with Perturbation', notes: '3 x 6 reps each leg, partner push' },
                { name: 'Stopping Drill (Multi-Directional)', notes: '3 x 4 reps, coach cued' },
                { name: 'Drop Squat to Hold', notes: '3 x 6 reps, rapid descent, hold 2s' },
                { name: 'Single Leg RDL with External Reach', notes: '3 x 8 each leg' },
                { name: 'Deceleration Sled Pull', notes: '3 x 10m, focus on braking mechanics' },
                { name: 'Landing from Lateral Hop', notes: '3 x 6 each leg' },
                { name: 'Reactive Catch Drill (Visual Cue)', notes: '3 x 6 reps, react and decelerate' },
            ],
        },
        {
            sectionName: 'Phase 7: Force Production',
            exercises: [
                { name: 'Trap Bar Deadlift', notes: '4 x 5 reps at 80% 1RM' },
                { name: 'Barbell Back Squat', notes: '4 x 5 reps at 80% 1RM' },
                { name: 'Barbell Hip Thrust (Heavy)', notes: '4 x 6 reps' },
                { name: 'Single Leg Leg Press (Heavy)', notes: '3 x 6 reps each leg' },
                { name: 'Sled Push (Sprint)', notes: '4 x 20m, moderate-heavy load' },
                { name: 'Sled Pull (Sprint)', notes: '4 x 20m' },
                { name: 'Resisted Sprint (Band)', notes: '4 x 15m, partner resistance' },
                { name: 'Clean Pull', notes: '4 x 4 reps at 70-80% 1RM' },
                { name: 'Hang Clean', notes: '4 x 3 reps' },
                { name: 'Power Clean', notes: '4 x 3 reps' },
                { name: 'Split Squat (Heavy, Rear Foot Elevated)', notes: '3 x 6 each leg' },
                { name: 'Weighted Step Up (High Box)', notes: '3 x 6 each leg' },
                { name: 'Single Leg Hip Thrust (Loaded)', notes: '3 x 8 each leg' },
                { name: 'Nordic Hamstring Curl (Weighted)', notes: '3 x 5 reps, plate on chest' },
                { name: 'Acceleration Wall Drive', notes: '4 x 6 reps each leg' },
                { name: 'Standing Cable Hip Extension', notes: '3 x 10 each leg' },
            ],
        },
        {
            sectionName: 'Phase 8: Plyometrics & Return to Sport',
            exercises: [
                { name: 'Countermovement Jump', notes: '4 x 5 reps, max effort' },
                { name: 'Broad Jump', notes: '4 x 5 reps' },
                { name: 'Single Leg Hop for Distance', notes: '3 x 5 each leg' },
                { name: 'Lateral Bound', notes: '3 x 6 each direction' },
                { name: 'Drop Jump', notes: '3 x 5 from 30-40cm' },
                { name: 'Depth Jump', notes: '3 x 5 from 30-40cm, max height' },
                { name: 'Hurdle Hops (Double Leg)', notes: '3 x 6 over 5 hurdles' },
                { name: 'Single Leg Hurdle Hops', notes: '3 x 5 each leg' },
                { name: 'Sprint Acceleration (10m)', notes: '4 x 10m, build to 90-100%' },
                { name: 'Sprint (30m)', notes: '3 x 30m, progressive to max' },
                { name: 'Flying Sprint (20m)', notes: '3 x 20m at max velocity' },
                { name: 'Curved Sprint', notes: '3 x 20m each direction' },
                { name: 'Agility Drill (Planned)', notes: '3 x reps, cuts and direction changes' },
                { name: 'Agility Drill (Reactive)', notes: '3 x reps, coach cued' },
                { name: 'Sport-Specific Kicking/Striking Progression', notes: 'Progressive intensity, pain-free' },
            ],
        },
    ];

    const blocks = [overviewBlock];
    for (const phase of phases) {
        blocks.push({
            id: uid(),
            type: 'exercise_block',
            sectionName: phase.sectionName,
            exercises: phase.exercises.map(ex => ({ name: ex.name, notes: ex.notes })),
        });
    }

    return {
        id: uid(),
        name: 'Hamstring RTP Exercise Framework (Symptom-Based)',
        category: 'Return to Play',
        blocks,
        createdAt: now,
        updatedAt: now,
    };
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
    console.log('Parsing protocols from markdown...');
    const mdPath = path.resolve(__dirname, '../complete-protocols-all-67-tests.md');
    const testProtocols = parseProtocolsFromMarkdown(mdPath);
    console.log(`  Parsed ${testProtocols.length} test protocols`);

    console.log('Creating hamstring RTP protocols...');
    const hamstringWritten = createHamstringWrittenProtocol();
    const hamstringExercise = createHamstringExerciseProtocol();
    console.log('  Created 2 hamstring protocols');

    const allProtocols = [
        hamstringWritten,
        hamstringExercise,
        ...testProtocols,
    ];

    console.log(`\nTotal protocols to seed: ${allProtocols.length}`);
    console.log('Protocol names:');
    allProtocols.forEach((p, i) => console.log(`  ${i + 1}. [${p.category}] ${p.name}`));

    // Check existing protocols
    console.log('\nFetching existing protocols from Supabase...');
    const { data: existing, error: readError } = await sb
        .from('user_data')
        .select('value')
        .eq('user_id', USER_ID)
        .eq('key', 'protocols')
        .maybeSingle();

    if (readError) {
        console.error('Error reading existing protocols:', readError.message);
    }

    const existingProtocols = (existing?.value) || [];
    console.log(`  Found ${existingProtocols.length} existing protocols`);

    // Merge: keep existing + add new ones
    const merged = [...allProtocols, ...existingProtocols];

    console.log(`\nUpserting ${merged.length} total protocols to Supabase...`);
    const { error: writeError } = await sb
        .from('user_data')
        .upsert(
            {
                user_id: USER_ID,
                key: 'protocols',
                value: merged,
                updated_at: new Date().toISOString(),
            },
            { onConflict: 'user_id,key' }
        );

    if (writeError) {
        console.error('Error saving protocols:', writeError.message);
        process.exit(1);
    }

    console.log(`\n✓ Successfully seeded ${allProtocols.length} protocols!`);
    console.log('  Categories:');
    const cats = {};
    allProtocols.forEach(p => { cats[p.category] = (cats[p.category] || 0) + 1; });
    Object.entries(cats).forEach(([cat, count]) => console.log(`    ${cat}: ${count}`));
}

main().catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
});
