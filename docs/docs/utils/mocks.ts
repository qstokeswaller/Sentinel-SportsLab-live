
// --- EXERCISE LIBRARY CONSTANTS ---
export const MUSCLE_GROUPS = ["Abdominals", "Abductors", "Adductors", "Back", "Biceps", "Calves", "Chest", "Forearms", "Glutes", "Hamstrings", "Hip Flexors", "Quadriceps", "Shins", "Shoulders", "Trapezius", "Triceps", "Unsorted"];
export const PROTOCOL_CATEGORIES = ["Warmup", "Rehab", "Strength", "Power", "Conditioning", "Speed", "Mobility"];
export const BODY_REGIONS = ["Upper Body", "Lower Body", "Core", "Full Body", "Mobility", "Conditioning", "Unsorted"];
export const CLASSIFICATIONS = ["Bodybuilding", "Powerlifting", "Olympic Weightlifting", "Calisthenics", "Plyometric", "Balance", "Postural", "Ballistics", "Grinds", "Mobility", "Conditioning", "Isolation", "Compound", "Functional", "Unsorted"];
export const POSTURES = ["Standing", "Seated", "Supine", "Prone", "Side Lying", "Kneeling", "Half Kneeling", "Tall Kneeling", "Quadruped", "Hanging", "Split Squat", "Staggered Stance", "Single Leg Standing", "Bridge", "Unsorted", "Other"];
export const GRIPS = ["Neutral", "Pronated", "Supinated", "Mixed Grip", "Hook Grip", "Goblet", "Horn Grip", "Bottoms Up", "Crush Grip", "False Grip", "No Grip", "Unsorted", "Other"];
export const MECHANICS = ["Compound", "Isolation", "Isometric", "Plyometric", "Unsorted"];
export const EXECUTION_MODES = ["Continuous", "Alternating", "Isometric", "Unsorted"];
export const EQUIPMENT_LIST = ["Barbell", "Dumbbell", "Kettlebell", "Cable", "Machine", "Bodyweight", "Band", "Medicine Ball", "Stability Ball", "BOSU", "TRX", "Rings", "Foam Roller", "Unsorted", "Other"];
export const MOVEMENT_PATTERNS = ["Ankle Dorsiflexion", "Ankle Plantar Flexion", "Anti-Extension", "Anti-Flexion", "Anti-Lateral Flexion", "Anti-Rotational", "Elbow Extension", "Elbow Flexion", "Hip Abduction", "Hip Adduction", "Hip Dominant", "Hip Extension", "Hip External Rotation", "Hip Flexion", "Hip Hinge", "Horizontal Adduction", "Horizontal Pull", "Horizontal Push", "Isometric Hold", "Knee Dominant", "Lateral Flexion", "Lateral Locomotion", "Loaded Carry", "Locomotion", "Rotational", "Scapular Elevation", "Shoulder Abduction", "Shoulder External Rotation", "Shoulder Flexion", "Shoulder Internal Rotation", "Shoulder Scapular Plane Elevation", "Spinal Extension", "Spinal Flexion", "Vertical Pull", "Vertical Push", "Wrist Extension", "Wrist Flexion", "Unsorted"];

export const MOCK_PROTOCOLS = [
    { id: 'p1', name: 'Standard Warmup', category: 'Warmup', description: 'General preparedness', exerciseIds: ['ex_sq_1', 'ex_lng_1'] },
    { id: 'p2', name: 'Knee Rehab', category: 'Rehab', description: 'Post-ACL protocol', exerciseIds: ['ex_sq_17', 'ex_hip_1'] }
];

export const MOCK_INDIVIDUAL_PLAN_BLOCKS = [
    { id: 'b1', title: 'Hypertrophy Block A', startDate: '2025-01-01', endDate: '2025-01-28', blockType: 'Accumulation', color: 'bg-blue-100 border-blue-200 text-blue-700', targetType: 'Individual', targetId: 'p1' },
    // --- ERIC'S PROGRAM ---
    {
        id: 'b_eric_1',
        title: 'Eric 4-Day Split (Yellow Week)',
        startDate: '2025-02-03',
        endDate: '2025-03-03',
        blockType: 'Transformation',
        color: 'bg-yellow-100 border-yellow-200 text-yellow-700',
        targetType: 'Individual',
        targetId: 'p_eric',
        weeks: [
            {
                weekNumber: 1,
                name: 'Yellow Week (3 Sets Alignment)',
                days: [
                    // Day 1: Upper Body Focus
                    {
                        date: '2025-02-03',
                        name: 'Day 1: Upper Body Focus',
                        sections: [
                            {
                                id: 's1', type: 'Primary Strength', exercises: [
                                    { id: 'e1', exerciseId: 'ex_push_1', sets: 3, reps: '6', weight: '-', rpe: 8 }, // Bench Press
                                    { id: 'e2', exerciseId: 'ex_er_2', sets: 3, reps: '8', weight: '-', rpe: 8 }  // Arnold Press
                                ]
                            },
                            {
                                id: 's2', type: 'Accessory / Conditioning', exercises: [
                                    { id: 'e3', exerciseId: 'ex_lng_1', sets: 3, reps: '10', weight: '-', rpe: 7 }, // Lunges
                                    { id: 'e4', exerciseId: 'ex_er_9', sets: 1, reps: '20min', weight: '-', rpe: 6 } // Jog
                                ]
                            }
                        ]
                    },
                    // Day 2: Full Body + Run
                    {
                        date: '2025-02-04',
                        name: 'Day 2: Full Body + Run',
                        sections: [
                            {
                                id: 's1', type: 'Primary Strength', exercises: [
                                    { id: 'e1', exerciseId: 'ex_sq_6', sets: 3, reps: '5', weight: '-', rpe: 8 }, // Back Squat
                                    { id: 'e2', exerciseId: 'ex_hng_7', sets: 3, reps: '5', weight: '-', rpe: 8 } // Deadlift
                                ]
                            },
                            {
                                id: 's2', type: 'Accessory', exercises: [
                                    { id: 'e3', exerciseId: 'ex_lng_7', sets: 3, reps: '8', weight: '-', rpe: 7 }, // Rev Lunge
                                    { id: 'e4', exerciseId: 'ex_er_10', sets: 1, reps: '15min', weight: '-', rpe: 9 } // Intervals
                                ]
                            }
                        ]
                    },
                    // Day 3: Full Body + Run
                    {
                        date: '2025-02-06',
                        name: 'Day 3: Full Body + Run',
                        sections: [
                            {
                                id: 's1', type: 'Power / Plyo', exercises: [
                                    { id: 'e1', exerciseId: 'ex_er_8', sets: 3, reps: '5', weight: '-', rpe: 7 }, // Box Jumps
                                    { id: 'e2', exerciseId: 'ex_er_7', sets: 3, reps: '10', weight: '-', rpe: 8 } // Burpees
                                ]
                            },
                            {
                                id: 's2', type: 'Strength', exercises: [
                                    { id: 'e3', exerciseId: 'ex_er_1', sets: 3, reps: '6', weight: '-', rpe: 8 }, // OH Press
                                    { id: 'e4', exerciseId: 'ex_lng_12', sets: 3, reps: '8', weight: '-', rpe: 8 } // Bulgarian
                                ]
                            }
                        ]
                    },
                    // Day 4: Upper Body Finish
                    {
                        date: '2025-02-07',
                        name: 'Day 4: Upper Body Finish',
                        sections: [
                            {
                                id: 's1', type: 'Hypertrophy', exercises: [
                                    { id: 'e1', exerciseId: 'ex_er_3', sets: 3, reps: '12', weight: '-', rpe: 8 }, // Flys
                                    { id: 'e2', exerciseId: 'ex_er_4', sets: 3, reps: '10', weight: '-', rpe: 9 } // Dips
                                ]
                            },
                            {
                                id: 's2', type: 'Accessory', exercises: [
                                    { id: 'e3', exerciseId: 'ex_er_6', sets: 3, reps: '15', weight: '-', rpe: 9 }, // Leg Ext
                                    { id: 'e4', exerciseId: 'ex_er_11', sets: 3, reps: '1', weight: '-', rpe: 7 } // Core
                                ]
                            }
                        ]
                    }
                ]
            }
        ]
    }
];

export const MOCK_BIOMETRICS_DATA = [];
export const MOCK_LOAD_DATA = (() => {
    const data = [];
    const athletes = ['a1', 'a2', 'a3', 'p_eric']; // Included p_eric
    const today = new Date();

    // Generate 35 days of history
    for (let i = 35; i >= 0; i--) {
        const d = new Date(today);
        d.setDate(today.getDate() - i);
        const dateStr = d.toISOString().split('T')[0];

        athletes.forEach(id => {
            // Random load between 300 and 800 AU
            // Create a spike for 'a1' (Eric) in the last 3 days
            let load = Math.floor(Math.random() * 500) + 300;

            if (id === 'a1' && i < 3) {
                load = 1200; // Spike!
            }

            data.push({
                id: `load_${i}_${id}`,
                athleteId: id,
                date: dateStr,
                sRPE: load,
                duration: 60,
                rpe: Math.round(load / 60)
            });
        });
    }
    return data;
})();

export const MOCK_KPI_DATA = [];
export const MOCK_HEATMAP_DATA = [];
export const MOCK_HABIT_DATA = [];
export const MOCK_VOLUME_DATA = [];

export const MOCK_TEAMS = [
    {
        id: 't1',
        name: 'Performance Squad',
        sport: 'Athletics',
        players: [
            { id: 'p1', name: 'John Doe', position: 'Sprinter', image: 'https://api.dicebear.com/7.x/avataaars/svg?seed=John', readiness: 90, status: 'Active', trend: 'up' },
            { id: 'p2', name: 'Jane Smith', position: 'Jumper', image: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Jane', readiness: 75, status: 'Active', trend: 'down' }
        ]
    },
    {
        id: 't_private',
        name: 'Private Clients',
        sport: 'Personal Training',
        players: [
            { id: 'p_eric', name: 'Eric Mabaso', position: 'Runner', image: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Eric', readiness: 85, status: 'Active', trend: 'stable' }
        ]
    }
];

export const MOCK_EXERCISES = [
    // --- SQUAT ---
    { id: 'ex_sq_1', name: 'Bodyweight Squat to Box', categories: ['Squat'], description: 'Sit back into the hips and descend until touching the box, then drive through the heels to return to standing.' },
    { id: 'ex_sq_2', name: 'Bodyweight Squat', categories: ['Squat'], description: 'Keep chest upright, hips back, and knees tracking over toes. Descend to parallel and drive up.' },
    { id: 'ex_sq_3', name: 'Goblet Squat to Box', categories: ['Goblet', 'Squat'], description: 'Hold weight at chest height. Squeeze elbows in, sit back to box, and maintain a neutral spine throughout.' },
    { id: 'ex_sq_4', name: 'Goblet Squat', categories: ['Squat'], description: 'Keep weight tight to chest. Descend deep into the squat while maintaining an upright torso.' },
    { id: 'ex_sq_5', name: 'Heels Elevated Goblet Squat', categories: ['Squat'], description: 'Elevate heels to increase quad recruitment. Maintain vertical torso and depth.' },
    { id: 'ex_sq_6', name: 'Barbell High Bar Back Squat', categories: ['Squat'], description: 'Bar on traps. Inhale, brace core, and descend until thighs are at or below parallel.' },
    { id: 'ex_sq_7', name: 'Barbell Front Squat', categories: ['Squat'], description: 'Rest bar on front deltoids. Keep elbows high and core braced to avoid leaning forward.' },
    { id: 'ex_sq_8', name: 'Zercher Squat', categories: ['Squat'], description: 'Hold bar in the crooks of your elbows. Squat deep while keeping the weight close to your center of mass.' },
    { id: 'ex_sq_9', name: 'Leg Press', categories: ['Squat'], description: 'Control the weight on the descent. Push through the platform, avoiding locking out knees completely.' },
    { id: 'ex_sq_10', name: 'Horizontal Leg Press', categories: ['Squat'], description: 'Focus on full range of motion. Keep back flat against the seat and drive through the heels.' },
    { id: 'ex_sq_11', name: 'Single Leg Leg Press', categories: ['Squat', 'Single Leg'], description: 'Isolate one leg at a time. maintain hip alignment and control the negative phase.' },
    { id: 'ex_sq_12', name: 'Pendulum Squat', categories: ['Squat'], description: 'Utilize the machine\'s unique arc to target quads while minimizing lower back stress.' },
    { id: 'ex_sq_13', name: 'Hack Squat', categories: ['Squat'], description: 'Maintain full foot contact on platform. Focus on deep knee flexion and controlled drive.' },
    { id: 'ex_sq_14', name: 'Single Leg Squat to Box', categories: ['Squat', 'Single Leg'], description: 'Balance on one leg and sit back to the box. Drive up without using momentum or the other leg.' },
    { id: 'ex_sq_15', name: 'Kickstand Squat to Box', categories: ['Squat', 'Single Leg'], description: 'Place one foot back as a kickstand for balance. 90% of weight on the front leg during the squat.' },
    { id: 'ex_sq_16', name: 'Heels Elevated Wall Squats', categories: ['Squat'], description: 'Lean against wall with heels elevated on a wedge. Descend vertically for maximum quad engagement.' },
    { id: 'ex_sq_17', name: 'Wall Sit', categories: ['Squat', 'Isometric'], description: 'Hold a 90-degree squat position against a wall. Keep back flat and focus on steady breathing.' },
    { id: 'ex_sq_18', name: 'Weighted Wall Sit', categories: ['Squat', 'Isometric'], description: 'Hold a weight plate or DB on your lap while maintaining a wall sit position.' },
    { id: 'ex_sq_19', name: 'Single Leg Wall Sit', categories: ['Squat', 'Isometric'], description: 'Maintain wall sit position with one leg extended in front. Switch legs as prescribed.' },

    // --- SPLIT SQUAT / LUNGE ---
    { id: 'ex_lng_1', name: 'Bodyweight Split Squat (Reduced Range)', categories: ['Lunge'], description: 'Perform a split squat with limited depth to focus on joint stability and control.' },
    { id: 'ex_lng_2', name: 'Bodyweight Split Squat (Hand Support)', categories: ['Lunge'], description: 'Use a wall or rack for balance. Focus on vertical hip travel and even weight distribution.' },
    { id: 'ex_lng_3', name: 'Bodyweight Split Squat', categories: ['Lunge'], description: 'Feet in a staggered stance. Drop the back knee toward the ground while keeping the front xheel planted.' },
    { id: 'ex_lng_4', name: 'Wall Constrained Split Squat', categories: ['Lunge'], description: 'Front knee close to a wall to prevent excessive forward travel. Forces more hip engagement.' },
    { id: 'ex_lng_5', name: 'DB Split Squat', categories: ['Lunge'], description: 'Hold dumbbells at sides. maintain an upright torso and drive through the front mid-foot.' },
    { id: 'ex_lng_6', name: 'Smith Machine Split Squat', categories: ['Lunge'], description: 'Static foot position. Use the machine\'s guide to focus on quad isolation and depth.' },
    { id: 'ex_lng_7', name: 'Bodyweight Reverse Lunge', categories: ['Lunge'], description: 'Step back and lower hips until both knees are at roughly 90 degrees. Return to start.' },
    { id: 'ex_lng_8', name: 'DB Reverse Lunge', categories: ['Lunge'], description: 'Step back with a DB in each hand. Keep core tight and avoid leaning too far forward.' },
    { id: 'ex_lng_9', name: 'Smith Machine Reverse Lunge', categories: ['Lunge'], description: 'controlled step back under the bar\'s fixed path. Great for stability and load management.' },
    { id: 'ex_lng_10', name: 'Bodyweight Walking Lunge', categories: ['Lunge'], description: 'Continuous forward lunging steps. Maintain balance and control through each transition.' },
    { id: 'ex_lng_11', name: 'DB Walking Lunge', categories: ['Lunge'], description: 'Walk forward with DBs. Focus on keeping the front knee stable and not caving inward.' },
    { id: 'ex_lng_12', name: 'RFESS (Bulgarian) with DB', categories: ['Lunge'], description: 'Rear foot elevated on a bench. Focus on depth and vertical torso to target the front quad and glute.' },
    { id: 'ex_lng_13', name: 'Smith Machine RFESS', categories: ['Lunge'], description: 'Elevate rear foot and use Smith bar for load. Allows for extreme focus on the working leg.' },
    { id: 'ex_lng_14', name: 'Goblet Lateral Lunge', categories: ['Lunge'], description: 'Hold weight at chest. Step wide to the side, sit hips back, and keep the opposite leg straight.' },
    { id: 'ex_lng_15', name: 'Lateral Lunge to Box', categories: ['Lunge'], description: 'Step out onto a box or elevated surface. Focus on hip mobility and power on the return.' },
    { id: 'ex_lng_16', name: 'Step Up (Hand Support)', categories: ['Lunge'], description: 'Step onto a box using hand support for balance. Focus on driving through the box-side heel.' },
    { id: 'ex_lng_17', name: 'Step Up with DB', categories: ['Lunge'], description: 'Hold DBs and step onto a box. Control the descent (eccentric phase) for best results.' },
    { id: 'ex_lng_18', name: 'Lateral Step Down', categories: ['Lunge'], description: 'Stand on a box and lower one foot to the side. Tap the ground lightly and drive back up.' },
    { id: 'ex_lng_19', name: 'Wall Constrained Lateral Step Down', categories: ['Lunge'], description: 'Perform step down next to a wall to ensure proper hip tracking and vertical alignment.' },

    // --- HINGE ---
    { id: 'ex_hng_1', name: 'RDL with Dumbbells', categories: ['Hinge'], description: 'Hinge at the hips while holding dumbbells. Keep back flat and feel the stretch in the hamstrings.' },
    { id: 'ex_hng_2', name: 'RDL with KB', categories: ['Hinge'], description: 'similar to DB RDL. Focus on pushing hips back and maintaining a neutral spine with the bell.' },
    { id: 'ex_hng_3', name: 'Barbell RDL', categories: ['Hinge'], description: 'Keep bar close to legs throughout. Hinge until just below knees or until hamstrings are tight.' },
    { id: 'ex_hng_4', name: 'Single Leg RDL (Hand Support)', categories: ['Hinge'], description: 'Balance on one leg using a rack for support. Hinge while keeping hips square to the floor.' },
    { id: 'ex_hng_5', name: 'Smith Machine Single Leg RDL', categories: ['Hinge'], description: 'Use the Smith machine for stability on the single-leg hinge. Focus on hamstring tension.' },
    { id: 'ex_hng_6', name: 'Trap Bar Deadlift', categories: ['Hinge'], description: 'Stand inside the trap bar. Drive through the ground while keeping chest up and back flat.' },
    { id: 'ex_hng_7', name: 'Conventional Deadlift', categories: ['Hinge'], description: 'Pull bar from floor. Keep back neutral and engage lats to keep the bar tight to the body.' },
    { id: 'ex_hng_8', name: 'Roman Chair Back Extension', categories: ['Hinge', 'Accessory'], description: 'Lower torso until perpendicular to legs, then extend back up using glutes and hamstrings.' },
    { id: 'ex_hng_9', name: 'Roman Chair Back Ext. Isometric', categories: ['Hinge', 'Isometric'], description: 'Hold a neutral back position at the top or parallel in the Roman chair. Keep core braced.' },
    { id: 'ex_hng_10', name: 'Weighted Roman Chair Back Ext.', categories: ['Hinge', 'Accessory'], description: 'Hold a weight plate to chest during the back extension for increased intensity.' },
    { id: 'ex_hng_11', name: 'Roman Chair Single Leg Back Ext.', categories: ['Hinge', 'Single Leg'], description: 'Perform back extension with one leg out of the support. Tests unilateral posterior strength.' },
    { id: 'ex_hng_12', name: 'GHR Back Extension', categories: ['Hinge', 'Accessory'], description: 'Standard back extension on the GHR machine. High glute and hamstring isolation.' },
    { id: 'ex_hng_13', name: 'GHR Weighted Back Ext.', categories: ['Hinge', 'Accessory'], description: 'Add load to the GHR extension. Maintain strictly neutral spine to avoid lumbar compensation.' },
    { id: 'ex_hng_14', name: 'GHR Back Ext. Isometric', categories: ['Hinge', 'Isometric'], description: 'Hold the peak tension position on the GHR. Brace core and squeeze glutes hard.' },

    // --- BRIDGES / THRUSTS ---
    { id: 'ex_hip_1', name: 'Glute Bridge', categories: ['Hinge', 'Glutes'], description: 'Lie on back, knees bent. Drive through heels to lift hips toward the ceiling. Squeeze glutes at the top.' },
    { id: 'ex_hip_2', name: 'Single Leg Glute Bridge', categories: ['Hinge', 'Glutes'], description: 'Perform glute bridge with one leg extended. Maintain level hips to challenge stability and unilateral strength.' },
    { id: 'ex_hip_3', name: 'Feet Elevated Bridge Isometric', categories: ['Hinge', 'Isometric'], description: 'Place feet on a box/bench. Lift hips and hold the peak tension position. Great for hamstring and glute endurance.' },
    { id: 'ex_hip_4', name: 'Feet Elevated Single Leg Bridge Iso', categories: ['Hinge', 'Isometric'], description: 'Single-leg version of the feet-elevated iso hold. Focus on keeping the core tight and hips high.' },
    { id: 'ex_hip_5', name: 'Feet Elevated Bridge', categories: ['Hinge', 'Glutes'], description: 'Dynamic bridge with feet on an elevated surface to increase range of motion and intensity.' },
    { id: 'ex_hip_6', name: 'Feet Elevated Single Leg Bridge', categories: ['Hinge', 'Glutes'], description: 'Isolate one leg at a time with feet elevated. Focus on a controlled descent and powerful drive.' },
    { id: 'ex_hip_7', name: 'Bodyweight Hip Thrust', categories: ['Hinge', 'Glutes'], description: 'Upper back on a bench. Pivot at the bench and drive hips up. Focus on maximal glute contraction.' },
    { id: 'ex_hip_8', name: 'DB Hip Thrust', categories: ['Hinge', 'Glutes'], description: 'Perform hip thrust with a DB across the hips. Maintain a chin-tuck position to keep a neutral spine.' },
    { id: 'ex_hip_9', name: 'Barbell Hip Thrust', categories: ['Hinge', 'Glutes'], description: 'The gold standard for glute development. Use a pad for the bar. Drive hard and hold for a second at the top.' },
    { id: 'ex_hip_10', name: 'B-Stance Hip Thrust', categories: ['Hinge', 'Glutes'], description: 'Place one foot slightly forward to bias the other leg while maintaining stability.' },
    { id: 'ex_hip_11', name: 'Single Leg Hip Thrust', categories: ['Hinge', 'Glutes'], description: 'Full unilateral hip thrust. Requires significant stability and strength. Keep the non-working hip high.' },

    // --- ERIC CUSTOM / MISSING PUSH & ACCESSORY ---
    { id: 'ex_push_1', name: 'Barbell Bench Press', categories: ['Push', 'Chest'], description: 'Drive heels into floor, maintain a slight arch, and press the bar in a controlled arc from chest to lockout.' },
    { id: 'ex_push_2', name: 'Push-Ups', categories: ['Push', 'Chest'], description: 'Maintain a rigid plank position. Lower chest to the floor and push back up without saggy hips.' },
    { id: 'ex_push_3', name: 'Pull ups', categories: ['Pull'], description: 'Hang from bar with overhand grip. Pull chin over bar by driving elbows down and back.' },
    { id: 'ex_push_4', name: 'Dips', categories: ['Push', 'Chest', 'Triceps'], description: 'Lower body until elbows are at 90 degrees, then press back to lockout. Lean forward for chest focus.' },
    { id: 'ex_push_5', name: 'Overhead Press', categories: ['Push', 'Shoulders'], description: 'Press bar vertically from shoulders to lockout. Maintain tight core and squeeze glutes to protect back.' },
    { id: 'ex_push_6', name: 'Barbell Row', categories: ['Pull', 'Back'], description: 'Hinge forward, pull bar to mid-stomach while squeezing shoulder blades together at the top.' },
    { id: 'ex_push_7', name: 'Seated Cable Row', categories: ['Pull', 'Back'], description: 'Sit upright, pull handle toward lower ribs while keeping shoulders down and back.' },
    { id: 'ex_er_5', name: 'Calf Raises (Machine)', categories: ['Accessory', 'Legs'], description: 'Stand on the edge of the platform and lower heels for a stretch, then drive onto the balls of your feet.' },
    { id: 'ex_er_6', name: 'Single Leg Leg Extension', categories: ['Accessory', 'Legs', 'Single Leg'], description: 'Isolate one quad at a time. Control the weight and squeeze hard at the peak of the extension.' },
    { id: 'ex_er_7', name: 'Burpees', categories: ['Conditioning'], description: 'Drop to a plank, touch chest to floor, jump feet back in, and explode into a vertical jump.' },
    { id: 'ex_er_8', name: 'Box Jumps', categories: ['Plyometrics'], description: 'Jump onto a box with both feet landing softly. Step down carefully between repetitions.' },
    { id: 'ex_er_9', name: '20 Min Zone 2 Jog', categories: ['Conditioning', 'Run'], description: 'Maintain a steady, conversational pace. Heart rate should remain in Zone 2 for the duration.' },
    { id: 'ex_er_10', name: 'V02 Max Intervals', categories: ['Conditioning', 'Run'], description: 'High-intensity intervals followed by recovery periods to maximize oxygen uptake and aerobic capacity.' },
    { id: 'ex_er_11', name: 'Core Circuit', categories: ['Core'], description: 'A series of core-focused movements performed sequentially with minimal rest for maximal engagement.' },

    // --- WEEK 1 & 2 CSV ADDITIONS ---
    { id: 'ex_csv_1', name: 'Skullcrushers (Cable Machine)', categories: ['Push', 'Triceps'], description: 'Use a cable bar. Keep elbows tucked and stationary while extending the forearms to work the triceps.' },
    { id: 'ex_csv_2', name: 'Lateral Lunge (Weight Plate Pull)', categories: ['Lunge', 'Legs'], description: 'Lunge laterally while pulling a weight plate across your body to engage the core and adductors.' },
    { id: 'ex_csv_3', name: 'Isometric Wall Squat (Ballistic Ball)', categories: ['Squat', 'Isometric'], description: 'Hold a wall squat with a ball between your knees. Squeeze the ball to engage the adductors and quads.' },
    { id: 'ex_csv_4', name: 'Deadbugs (Weighted)', categories: ['Core'], description: 'Hold a small weight. Lower opposite arm and leg while keeping the lower back pressed into the floor.' },
    { id: 'ex_csv_5', name: 'Crawlers (KB Pull Through)', categories: ['Core', 'Stability'], description: 'In a plank position, pull a kettlebell across your body from one side to the other without rotating hips.' },
    { id: 'ex_csv_6', name: 'ISO Wall Squat (Ballistic Ball)', categories: ['Squat', 'Isometric'], description: 'Maintain a 90-degree wall sit while squeezing a ball. Focus on breath and internal tension.' },
    { id: 'ex_csv_7', name: 'Good Mornings (Bar Only)', categories: ['Hinge'], description: 'Bar on traps. Hinge forward with soft knees, keeping back flat. Feel the stretch in hamstrings.' },
    { id: 'ex_csv_8', name: 'Glute Kickbacks (Machine)', categories: ['Hinge', 'Glutes'], description: 'Drive one leg back against the machine pad. Focus on glute contraction at the end of the range.' },
    { id: 'ex_csv_9', name: 'Explosive Push-Ups', categories: ['Push', 'Chest', 'Power'], description: 'Push up with enough force to lift hands off the ground. Land softly and go immediately into the next rep.' },
    { id: 'ex_csv_10', name: 'Mountain Climbers (Bosu Ball)', categories: ['Core', 'Conditioning'], description: 'Hands on a Bosu ball. Drive knees toward chest in a rapid, controlled running motion.' },
    { id: 'ex_csv_11', name: 'Bent Over Row (DB)', categories: ['Pull', 'Back'], description: 'Hinge over, pull DBs to hips while keeping elbows close to the body and squeezing shoulder blades.' },
    { id: 'ex_csv_12', name: 'V-Ups', categories: ['Core'], description: 'Simultaneously lift torso and legs to form a V-shape. Reach for toes and control the descent.' },
    { id: 'ex_csv_13', name: 'Russian Twists (Weighted)', categories: ['Core'], description: 'Sit on floor, knees bent. Rotate torso side to side while holding a weight. Keep feet off the floor for difficulty.' },
    { id: 'ex_csv_14', name: 'Copenhagens', categories: ['Core', 'Adductor'], description: 'Inner leg on a bench. Hold a side plank position to target the adductor and lateral core.' },
    { id: 'ex_csv_15', name: 'Plank Jacks', categories: ['Core'], description: 'In a plank position, jump feet out and in like a jumping jack. Keep hips low and core steady.' },
    { id: 'ex_csv_16', name: 'Chest Press Machine', categories: ['Push', 'Chest'], description: 'Sit in machine and press handles forward. Focus on chest contraction and control the eccentric phase.' },
    { id: 'ex_csv_17', name: 'Seated Lat Pulldowns', categories: ['Pull', 'Back'], description: 'Pull the bar down to the upper chest while keeping the torso slightly leaned back and chest up.' },
    { id: 'ex_csv_18', name: 'Bicep Cable Curls', categories: ['Pull', 'Arms'], description: 'Curl the cable bar toward shoulders. Keep elbows pinned to sides for maximum bicep isolation.' },
    { id: 'ex_csv_19', name: 'Tricep Cable Pushdowns', categories: ['Push', 'Triceps'], description: 'Push the cable bar down until arms are fully extended. Squeeze triceps at the bottom.' },
    { id: 'ex_csv_20', name: 'Six Inches', categories: ['Core'], description: 'Lie on back and lift legs six inches off the ground. Hold and press lower back into the floor.' },
    { id: 'ex_csv_21', name: 'Trampoline Knee Lifts', categories: ['Conditioning', 'Plyometrics'], description: 'High knees on a trampoline for reduced impact but high-intensity conditioning.' },
    { id: 'ex_csv_22', name: 'Lateral Bounds (Medicine Ball)', categories: ['Plyometrics', 'Power'], description: 'Explosive side-to-side jumps while holding a medicine ball at chest height.' },
    { id: 'ex_csv_23', name: 'Rope Skipping', categories: ['Conditioning'], description: 'Maintain a steady rhythm with light jumps. Focus on coordination and metabolic conditioning.' },
    { id: 'ex_csv_24', name: 'A-Skips', categories: ['Conditioning', 'Drills'], description: 'High knee skipping drill with a focus on powerful ground contact and upright posture.' },
    { id: 'ex_csv_25', name: 'B-Skips', categories: ['Conditioning', 'Drills'], description: 'Similar to A-Skips but with an active cyclical extension of the leg for better sprint mechanics.' },
    { id: 'ex_er_2', name: 'Air Bike Sprint', categories: ['Conditioning', 'Power'], description: 'Maximum effort sprint for 15-30 seconds. Focus on explosive power and high cadence.' },
    { id: 'ex_push_arnold', name: 'Arnold Press', categories: ['Push', 'Shoulders'], description: ' Palms face you at start, rotate outward during press overhead.' },
];

export const MOCK_SESSIONS = [
    {
        id: 's_er_1', title: 'Day 1: Upper Push & Core Focus', date: '2026-02-03', targetType: 'Individual', targetId: 'p_eric', trainingPhase: 'Strength', load: 'Medium', notes: 'WK1 Day 1: Focus on control in Wall Squats.',
        exercises: [
            { id: 'ex_push_1', sets: 3, reps: '10', weight: '-', rpe: 8, notes: 'Bench Press' },
            { id: 'ex_csv_1', sets: 3, reps: '10', weight: '-', rpe: 8, notes: 'Skullcrushers' },
            { id: 'ex_push_arnold', sets: 3, reps: '10', weight: '-', rpe: 8, notes: 'Arnold Press' },
            { id: 'ex_lng_3', sets: 3, reps: '10', weight: '-', rpe: 7, notes: 'Lunges' },
            { id: 'ex_csv_2', sets: 3, reps: '10', weight: '-', rpe: 7, notes: 'Lateral Lunge' },
            { id: 'ex_csv_3', sets: 3, reps: '30s', weight: '-', rpe: 9, notes: 'Wall Squat Hold' },
            { id: 'ex_csv_4', sets: 3, reps: '10', weight: '2.5', rpe: 7, notes: 'Deadbugs' },
            { id: 'ex_csv_5', sets: 3, reps: '10', weight: '10', rpe: 8, notes: 'Crawlers' },
            { id: 'ex_er_9', sets: 1, reps: '20min', weight: '-', rpe: 6, notes: 'Slow Jog' }
        ]
    },
    {
        id: 's_er_2', title: 'Day 2: Hinge & Power', date: '2026-02-04', targetType: 'Individual', targetId: 'p_eric', trainingPhase: 'GPP', load: 'High', notes: 'WK1 Day 2: Explosive movements.',
        exercises: [
            { id: 'ex_csv_6', sets: 3, reps: '20s', weight: '-', rpe: 8, notes: 'Wall Squat Iso' },
            { id: 'ex_csv_7', sets: 3, reps: '10', weight: '-', rpe: 6, notes: 'Good Mornings' },
            { id: 'ex_csv_8', sets: 3, reps: '10', weight: '-', rpe: 8, notes: 'Glute Kickbacks' },
            { id: 'ex_csv_9', sets: 3, reps: 'max', weight: '-', rpe: 9, notes: 'Explosive Push-ups' },
            { id: 'ex_push_3', sets: 3, reps: 'max', weight: '-', rpe: 9, notes: 'Pull ups' },
            { id: 'ex_er_1', sets: 3, reps: '10', weight: '-', rpe: 8, notes: 'Shoulder Press' },
            { id: 'ex_er_11', sets: 4, reps: '30s', weight: '-', rpe: 8, notes: 'Lateral Planks' },
            { id: 'ex_csv_10', sets: 4, reps: '20', weight: '-', rpe: 8, notes: 'Mountain Climbers' },
            { id: 'ex_er_10', sets: 1, reps: '30min', weight: '-', rpe: 7, notes: 'Slow Pace Run' }
        ]
    },
    {
        id: 's_er_3', title: 'Day 3: Full Body Hypertrophy', date: '2026-02-06', targetType: 'Individual', targetId: 'p_eric', trainingPhase: 'Power', load: 'High', notes: 'WK1 Day 3: Medium Pace Run.',
        exercises: [
            { id: 'ex_lng_7', sets: 3, reps: '8', weight: '-', rpe: 8, notes: 'Reverse Lunges' },
            { id: 'ex_sq_2', sets: 3, reps: '8', weight: '-', rpe: 8, notes: 'Squat' },
            { id: 'ex_er_5', sets: 3, reps: '8', weight: '-', rpe: 7, notes: 'Calf Raises' },
            { id: 'ex_lng_12', sets: 3, reps: '8', weight: '-', rpe: 9, notes: 'Bulgarian Split Squat' },
            { id: 'ex_sq_11', sets: 3, reps: '8', weight: '-', rpe: 8, notes: 'Seated Leg Curls' },
            { id: 'ex_hng_4', sets: 3, reps: '8', weight: '-', rpe: 8, notes: 'Single Leg RDL' },
            { id: 'ex_push_2', sets: 3, reps: '8', weight: '-', rpe: 8, notes: 'DB Bench Press' },
            { id: 'ex_csv_11', sets: 3, reps: '8', weight: '-', rpe: 8, notes: 'Bent Over Row' },
            { id: 'ex_csv_12', sets: 4, reps: '15', weight: '-', rpe: 9, notes: 'V-ups' },
            { id: 'ex_csv_13', sets: 4, reps: '30', weight: '-', rpe: 9, notes: 'Russian Twists' },
            { id: 'ex_er_9', sets: 1, reps: '30min', weight: '-', rpe: 8, notes: 'Medium Pace Jog' }
        ]
    },
    {
        id: 's_er_4', title: 'Day 5: Test & Capacity', date: '2026-02-07', targetType: 'Individual', targetId: 'p_eric', trainingPhase: 'Hypertrophy', load: 'Medium', notes: 'WK2 Test Day: Max effort testing.',
        exercises: [
            { id: 'ex_push_1', sets: 1, reps: '3', weight: 'tbd', rpe: 10, notes: 'Bench Press Max' },
            { id: 'ex_sq_6', sets: 1, reps: '3', weight: 'tbd', rpe: 10, notes: 'Squat Max' },
            { id: 'ex_csv_11', sets: 1, reps: '6', weight: 'tbd', rpe: 9, notes: 'Bent Over Row Max' },
            { id: 'ex_hng_7', sets: 1, reps: '3', weight: 'tbd', rpe: 10, notes: 'Deadlift Max' },
            { id: 'ex_er_1', sets: 1, reps: '6', weight: 'tbd', rpe: 9, notes: 'Shoulder Press Max' },
            { id: 'ex_csv_14', sets: 3, reps: '10', weight: '-', rpe: 8, notes: 'Copenhagens' },
            { id: 'ex_csv_15', sets: 4, reps: '20', weight: '-', rpe: 8, notes: 'Plank Jacks' },
            { id: 'ex_er_9', sets: 1, reps: '20min', weight: '-', rpe: 6, notes: 'Light Jog' }
        ]
    }
];

export const DB_KEYS = {
    EXERCISES: 'exercises',
    SESSIONS: 'sessions',
    ATHLETES: 'traineros_athletes_v4', // Not present in top-level DB, kept as placeholder or legacy
    TEAMS: 'teams',
    LOGS: 'logs', // Not present in top-level DB, kept as placeholder
    PROTOCOLS: 'protocols',
    QUESTIONNAIRES: 'questionnaires',
    GPS_DATA: 'gps_data',
    WATTBIKE_SESSIONS: 'wattbike_sessions',
    MEDICAL_REPORTS: 'medical_reports'
};

// Full AmaTuks-spec wellness questionnaire — matches the Google Form used in production
export const DEFAULT_WELLNESS_QUESTIONS = [
    {
        id: 'rpe', type: 'scale_1_10', category: 'readiness', required: true,
        text: 'Rate of Perceived Exertion — How intense was today\'s session?',
        labels: ['1 — Rest / Very Easy', '10 — Maximal Effort']
    },
    {
        id: 'fatigue', type: 'multiple_choice', category: 'wellness', required: true,
        text: 'Fatigue Levels',
        options: ['Very low (Feeling energetic)', 'Low', 'Average', 'High', 'Very high (Exhausted)'],
        numericMap: [1, 2, 3, 4, 5]
    },
    {
        id: 'energy', type: 'multiple_choice', category: 'wellness', required: true,
        text: 'Energy Levels',
        options: ['Very low (Very tired)', 'Low', 'Average', 'High', 'Very high (Very energetic)'],
        numericMap: [1, 2, 3, 4, 5]
    },
    {
        id: 'stress', type: 'multiple_choice', category: 'wellness', required: true,
        text: 'Stress',
        options: ['Very low (No stress)', 'Low', 'Average', 'High', 'Very high (Extremely stressed)'],
        numericMap: [1, 2, 3, 4, 5]
    },
    {
        id: 'motivation', type: 'multiple_choice', category: 'wellness', required: true,
        text: 'Motivation',
        options: ['Very low (No motivation)', 'Low', 'Average', 'High', 'Very high (Highly motivated)'],
        numericMap: [1, 2, 3, 4, 5]
    },
    {
        id: 'soreness', type: 'multiple_choice', category: 'wellness', required: true,
        text: 'Muscle Soreness',
        options: ['Very low (No soreness)', 'Low', 'Average', 'High', 'Very high (Extreme soreness)'],
        numericMap: [1, 2, 3, 4, 5]
    },
    {
        id: 'sleep_quality', type: 'multiple_choice', category: 'wellness', required: true,
        text: 'Sleep Quality',
        options: ['Very low (Poor sleep)', 'Low', 'Average', 'High', 'Very high (Excellent sleep)'],
        numericMap: [1, 2, 3, 4, 5]
    },
    {
        id: 'sleep_hours', type: 'multiple_choice', category: 'wellness', required: true,
        text: 'Hours Slept Last Night',
        options: ['1 - 3 hours', '3 - 6 hours', '6 - 8 hours', '8+']
    },
    {
        id: 'availability', type: 'multiple_choice', category: 'readiness', required: true,
        text: 'Training Availability',
        options: [
            'Fully available for training/competition',
            'Available for modified training',
            'Unavailable due to injury/illness'
        ]
    },
    // URTI / Illness symptoms — word-based severity (stored as 0-3 via numericMap)
    { id: 'urti_hoarseness', type: 'multiple_choice', category: 'health', required: true, text: 'Hoarseness (Voice roughness)', options: ['No Symptoms', 'Mild', 'Moderate', 'Severe'], numericMap: [0, 1, 2, 3] },
    { id: 'urti_blocked_nose', type: 'multiple_choice', category: 'health', required: true, text: 'Blocked / Plugged Nose', options: ['No Symptoms', 'Mild', 'Moderate', 'Severe'], numericMap: [0, 1, 2, 3] },
    { id: 'urti_runny_nose', type: 'multiple_choice', category: 'health', required: true, text: 'Runny Nose', options: ['No Symptoms', 'Mild', 'Moderate', 'Severe'], numericMap: [0, 1, 2, 3] },
    { id: 'urti_sinus_pressure', type: 'multiple_choice', category: 'health', required: true, text: 'Sinus Pressure (Facial pressure)', options: ['No Symptoms', 'Mild', 'Moderate', 'Severe'], numericMap: [0, 1, 2, 3] },
    { id: 'urti_sneezing', type: 'multiple_choice', category: 'health', required: true, text: 'Sneezing', options: ['No Symptoms', 'Mild', 'Moderate', 'Severe'], numericMap: [0, 1, 2, 3] },
    { id: 'urti_dry_cough', type: 'multiple_choice', category: 'health', required: true, text: 'Dry Cough', options: ['No Symptoms', 'Mild', 'Moderate', 'Severe'], numericMap: [0, 1, 2, 3] },
    { id: 'urti_wet_cough', type: 'multiple_choice', category: 'health', required: true, text: 'Wet Cough (sputum / mucus)', options: ['No Symptoms', 'Mild', 'Moderate', 'Severe'], numericMap: [0, 1, 2, 3] },
    { id: 'urti_headache', type: 'multiple_choice', category: 'health', required: true, text: 'Headache', options: ['No Symptoms', 'Mild', 'Moderate', 'Severe'], numericMap: [0, 1, 2, 3] },
    // Injury / Body Map
    {
        id: 'body_map', type: 'body_map', category: 'injury', required: false,
        text: 'Injuries or Knocks'
    },
    {
        id: 'injury_type', type: 'multiple_choice', category: 'injury', required: true,
        text: 'Nature of Pain / Discomfort',
        conditional: { questionId: 'body_map', notEmpty: true },
        options: [
            'Soreness (pain during exercise)', 'Strain (sharp, pulling pain)',
            'Cramp (intense muscle contraction)', 'Spasm (involuntary muscle tightening)',
            'Swelling (inflamed area)', 'Bruising (discoloured skin)',
            'Weakness (reduced muscle strength)', 'Other'
        ]
    },
    {
        id: 'injury_timing', type: 'multiple_choice', category: 'injury', required: true,
        text: 'When did it occur?',
        conditional: { questionId: 'body_map', notEmpty: true },
        options: ['Warm Up', 'Early session', 'Middle of session', 'Towards end of session', 'Before training (pre-existing)']
    },
    {
        id: 'injury_mechanism', type: 'multiple_choice', category: 'injury', required: true,
        text: 'Injury Mechanism',
        conditional: { questionId: 'body_map', notEmpty: true },
        options: ['Contact', 'Non-contact', 'Overuse', 'Unknown']
    },
    {
        id: 'injury_side', type: 'multiple_choice', category: 'injury', required: true,
        text: 'Affected Side',
        conditional: { questionId: 'body_map', notEmpty: true },
        options: ['Left', 'Right', 'Both', 'Not sure']
    },
    {
        id: 'training_interruption', type: 'yes_no', category: 'injury', required: true,
        text: 'Did this interrupt your training?',
        conditional: { questionId: 'body_map', notEmpty: true }
    }
];

// Body map areas — matches the anatomical image (docs/public/body-map.png)
// Each area has: key, label, view (front/back), colour matching the image
export const BODY_MAP_AREAS = [
    // Front
    { key: 'chest',          label: 'Chest / Pectorals',        view: 'front', color: '#f97316' },
    { key: 'abs',            label: 'Abs / Core',               view: 'front', color: '#22d3ee' },
    { key: 'shoulders',      label: 'Shoulders',                view: 'front', color: '#a855f7' },
    { key: 'biceps',         label: 'Biceps / Upper Arm',       view: 'front', color: '#a855f7' },
    { key: 'forearms',       label: 'Forearms',                 view: 'front', color: '#a855f7' },
    { key: 'hip_flexors',    label: 'Hip Flexors / Groin',      view: 'front', color: '#ec4899' },
    { key: 'quads',          label: 'Quadriceps',               view: 'front', color: '#eab308' },
    { key: 'knee',           label: 'Knee',                     view: 'front', color: '#3b82f6' },
    { key: 'shin',           label: 'Shin / Tibialis',          view: 'front', color: '#22c55e' },
    { key: 'ankle_foot',     label: 'Ankle / Foot',             view: 'front', color: '#3b82f6' },
    // Back
    { key: 'upper_back',     label: 'Upper Back / Traps',       view: 'back',  color: '#f97316' },
    { key: 'lower_back',     label: 'Lower Back',               view: 'back',  color: '#a855f7' },
    { key: 'rear_shoulders', label: 'Rear Shoulders / Delts',   view: 'back',  color: '#a855f7' },
    { key: 'triceps',        label: 'Triceps',                  view: 'back',  color: '#a855f7' },
    { key: 'glutes',         label: 'Glutes',                   view: 'back',  color: '#ef4444' },
    { key: 'hamstrings',     label: 'Hamstrings',               view: 'back',  color: '#ec4899' },
    { key: 'calves',         label: 'Calves / Achilles',        view: 'back',  color: '#22c55e' },
];

// Default severity levels for body map questions
export const DEFAULT_SEVERITY_LEVELS: import('../types/types').SeverityLevel[] = [
    { value: 1, label: 'Mild',     shortLabel: 'Mild',   style: 'bg-yellow-400 border-yellow-400 text-white', legendColor: '#facc15' },
    { value: 2, label: 'Moderate', shortLabel: 'Mod',    style: 'bg-orange-500 border-orange-500 text-white', legendColor: '#f97316' },
    { value: 3, label: 'Severe',   shortLabel: 'Severe', style: 'bg-red-600 border-red-600 text-white',       legendColor: '#dc2626' },
];

// Default body map config — derived from BODY_MAP_AREAS for backward compat
export const DEFAULT_BODY_MAP_CONFIG: import('../types/types').BodyMapConfig = {
    areas: BODY_MAP_AREAS.map(a => ({ key: a.key, label: a.label, view: a.view as 'front' | 'back', color: a.color, hasSeverity: true })),
    severityLevels: DEFAULT_SEVERITY_LEVELS,
    referenceImageUrl: '/body-image.jpeg',
    instructionText: '1. Tap an area to mark it\n2. Tap again to increase severity of injury\n3. Tap a third time to clear',
    subInputType: 'buttons',
};

// --- INJURY REPORT CONSTANTS ---

export const INJURY_CLASSIFICATIONS = [
    'Muscle Strain', 'Ligament Sprain', 'Fracture', 'Contusion',
    'Tendinopathy', 'Dislocation', 'Overuse', 'Concussion',
    'Laceration', 'Nerve Injury', 'Other'
] as const;

export const SEVERITY_GRADES = [
    { value: 1, label: 'Grade 1 — Mild',     color: 'bg-yellow-100 text-yellow-700' },
    { value: 2, label: 'Grade 2 — Moderate',  color: 'bg-orange-100 text-orange-700' },
    { value: 3, label: 'Grade 3 — Severe',    color: 'bg-red-100 text-red-700' },
] as const;

export const LATERALITY_OPTIONS = ['Left', 'Right', 'Bilateral', 'Central'] as const;
export const INJURY_ACTIVITIES = ['Training', 'Match', 'Warm-up', 'Gym', 'Other'] as const;
export const PAIN_KINDS = ['Sharp', 'Dull', 'Burning', 'Throbbing', 'Radiating'] as const;
export const RANGE_OF_MOTION_OPTIONS = ['Full', 'Limited', 'None'] as const;
export const WEIGHT_BEARING_OPTIONS = ['Full', 'Partial', 'Non-weight-bearing'] as const;
export const TRAINING_STATUS_OPTIONS = ['Full Training', 'Modified Training', 'Rehab Only', 'Complete Rest'] as const;
export const TREATMENT_OPTIONS = ['Ice', 'Physio', 'Massage', 'Strapping', 'Medication', 'Surgery Referral', 'Imaging Referral'] as const;
export const RTP_PHASES = [
    'Phase 1 - Rest',
    'Phase 2 - Rehab',
    'Phase 3 - Modified Training',
    'Phase 4 - Full Return'
] as const;

export const MOCK_INJURY_REPORTS: import('../types/types').InjuryReport[] = [
    {
        id: 'ir_1',
        athleteId: 'p1',
        athleteName: 'John Doe',
        teamId: 't1',
        areas: [{ area: 'hamstrings', side: 'left', severity: 2 }],
        classification: 'Muscle Strain',
        severityGrade: 2,
        laterality: 'Left',
        recurrence: 'New',
        activity: 'Training',
        dateOfInjury: '2026-02-20',
        mechanism: 'Non-contact sprint during conditioning drill, felt sharp pull in left hamstring at full stretch.',
        painLevel: 7,
        painKinds: ['Sharp'],
        hasSwelling: true,
        swellingSeverity: 'Mild',
        hasBruising: false,
        rangeOfMotion: 'Limited',
        weightBearing: 'Full',
        stoppedTraining: true,
        currentStatus: 'Rehab Only',
        treatmentPrescribed: ['Ice', 'Physio', 'Massage'],
        treatmentRecommendations: 'Progressive hamstring loading protocol. Nordic curls when pain-free at walking pace.',
        followUpDate: '2026-02-27',
        returnToPlayPhase: 'Phase 2 - Rehab',
        expectedTimeOut: '2-3 weeks',
        comments: 'Athlete reports similar sensation to previous hamstring issue 6 months ago but less severe. MRI scheduled for Feb 22.',
        attachmentUrls: [],
        createdAt: '2026-02-20T14:30:00Z',
    },
    {
        id: 'ir_2',
        athleteId: 'p2',
        athleteName: 'Jane Smith',
        teamId: 't1',
        areas: [{ area: 'ankle_foot', side: 'right', severity: 1 }],
        classification: 'Ligament Sprain',
        severityGrade: 1,
        laterality: 'Right',
        recurrence: 'New',
        activity: 'Match',
        dateOfInjury: '2026-02-18',
        mechanism: 'Landed awkwardly on right ankle after jump.',
        painLevel: 4,
        painKinds: ['Dull', 'Throbbing'],
        hasSwelling: true,
        swellingSeverity: 'Mild',
        hasBruising: true,
        bruisingSeverity: 'Mild',
        rangeOfMotion: 'Limited',
        weightBearing: 'Partial',
        stoppedTraining: true,
        currentStatus: 'Modified Training',
        treatmentPrescribed: ['Ice', 'Strapping', 'Physio'],
        treatmentRecommendations: 'RICE protocol for 48 hours, then progressive weight-bearing exercises.',
        followUpDate: '2026-02-25',
        returnToPlayPhase: 'Phase 3 - Modified Training',
        expectedTimeOut: '1-2 weeks',
        comments: 'Low-grade inversion sprain. No structural damage suspected.',
        attachmentUrls: [],
        createdAt: '2026-02-18T10:15:00Z',
    },
    {
        id: 'ir_3',
        athleteId: 'p1',
        athleteName: 'John Doe',
        teamId: 't1',
        areas: [{ area: 'knee', side: 'left', severity: 1 }],
        classification: 'Tendinopathy',
        severityGrade: 1,
        laterality: 'Left',
        recurrence: 'Recurrence',
        activity: 'Gym',
        dateOfInjury: '2026-03-01',
        mechanism: 'Gradual onset pain during heavy squat session. Anterior knee ache at bottom of ROM.',
        painLevel: 3,
        painKinds: ['Dull'],
        hasSwelling: false,
        hasBruising: false,
        rangeOfMotion: 'Full',
        weightBearing: 'Full',
        stoppedTraining: false,
        currentStatus: 'Modified Training',
        treatmentPrescribed: ['Physio'],
        treatmentRecommendations: 'Isometric quad exercises, avoid deep knee flexion under load for 2 weeks.',
        followUpDate: '2026-03-15',
        returnToPlayPhase: 'Phase 3 - Modified Training',
        expectedTimeOut: '2-4 weeks',
        comments: 'Recurring patellar tendon irritation. Similar episode in Dec 2025 resolved with isometric protocol.',
        attachmentUrls: [],
        createdAt: '2026-03-01T09:00:00Z',
    },
];
