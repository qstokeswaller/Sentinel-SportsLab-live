-- Mobility Exercises Batch 3: Banded Drills, Additional Exercises (ex_mob_101 - ex_mob_140)
INSERT INTO exercises (id,club_id,name,description,body_parts,categories,video_url,tags,options,tracking_type,equipment) VALUES

-- === BANDED MOBILITY DRILLS (101-107) ===
('ex_mob_101',NULL,'Banded Shoulder Distraction',NULL,ARRAY['Shoulders'],ARRAY['Upper Body','Mobility'],NULL,ARRAY['mobility','dynamic','rehab','Standing','No Grip','Alternating'],NULL,'time',ARRAY['Superband']),
('ex_mob_102',NULL,'Banded Lat Stretch',NULL,ARRAY['Lats'],ARRAY['Upper Body','Mobility'],NULL,ARRAY['mobility','static','recovery','Kneeling','No Grip','Alternating'],NULL,'time',ARRAY['Superband']),
('ex_mob_103',NULL,'Banded Hamstring Stretch',NULL,ARRAY['Hamstrings'],ARRAY['Lower Body','Mobility'],NULL,ARRAY['mobility','static','recovery','Supine','No Grip','Alternating'],NULL,'time',ARRAY['Superband']),
('ex_mob_104',NULL,'Banded Hip Flexor Stretch',NULL,ARRAY['Hip Flexors'],ARRAY['Lower Body','Mobility'],NULL,ARRAY['mobility','static','recovery','Half Kneeling','No Grip','Alternating'],NULL,'time',ARRAY['Superband']),
('ex_mob_105',NULL,'X-Band Walk (Mobility)',NULL,ARRAY['Glutes','Abductors'],ARRAY['Lower Body','Mobility'],NULL,ARRAY['mobility','dynamic','warm-up','Standing','No Grip'],NULL,'reps_only',ARRAY['Resistance Band']),
('ex_mob_106',NULL,'Banded Pull Apart (Mobility)',NULL,ARRAY['Shoulders','Upper Back','Rotator Cuff'],ARRAY['Upper Body','Mobility'],NULL,ARRAY['mobility','dynamic','warm-up','rehab','Standing','Pronated'],NULL,'reps_only',ARRAY['Resistance Band']),
('ex_mob_107',NULL,'Banded Chest Stretch',NULL,ARRAY['Chest','Shoulders'],ARRAY['Upper Body','Mobility'],NULL,ARRAY['mobility','static','recovery','Standing','No Grip'],NULL,'time',ARRAY['Superband']),

-- === ADDITIONAL HIP MOBILITY (108-114) ===
('ex_mob_108',NULL,'Supine Knee to Chest',NULL,ARRAY['Glutes','Hip Flexors'],ARRAY['Lower Body','Mobility'],NULL,ARRAY['mobility','static','recovery','Supine','No Grip','Alternating'],NULL,'time',NULL),
('ex_mob_109',NULL,'Supine Figure 4 Stretch',NULL,ARRAY['Glutes'],ARRAY['Lower Body','Mobility'],NULL,ARRAY['mobility','static','recovery','Supine','No Grip','Alternating'],NULL,'time',NULL),
('ex_mob_110',NULL,'Happy Baby Stretch',NULL,ARRAY['Hip Flexors','Adductors','Glutes'],ARRAY['Lower Body','Mobility'],NULL,ARRAY['mobility','yoga','static','recovery','Supine','No Grip'],NULL,'time',NULL),
('ex_mob_111',NULL,'Lying Crossover Stretch',NULL,ARRAY['Glutes','Core'],ARRAY['Lower Body','Mobility'],NULL,ARRAY['mobility','static','recovery','Supine','No Grip','Alternating'],NULL,'time',NULL),
('ex_mob_112',NULL,'Standing Adductor Stretch',NULL,ARRAY['Adductors'],ARRAY['Lower Body','Mobility'],NULL,ARRAY['mobility','static','recovery','Standing','No Grip','Alternating'],NULL,'time',NULL),
('ex_mob_113',NULL,'Kneeling Hip Flexor Rock Back',NULL,ARRAY['Hip Flexors','Quadriceps'],ARRAY['Lower Body','Mobility'],NULL,ARRAY['mobility','dynamic','warm-up','Half Kneeling','No Grip','Alternating'],NULL,'reps_only',NULL),
('ex_mob_114',NULL,'Wall 90/90 Hip Lift',NULL,ARRAY['Hip Flexors','Glutes','Core'],ARRAY['Lower Body','Mobility'],NULL,ARRAY['mobility','dynamic','rehab','Supine','No Grip'],NULL,'reps_only',NULL),

-- === ADDITIONAL SHOULDER & UPPER BODY (115-122) ===
('ex_mob_115',NULL,'Shoulder Pass-Throughs (Dowel)',NULL,ARRAY['Shoulders','Chest'],ARRAY['Upper Body','Mobility'],NULL,ARRAY['mobility','dynamic','warm-up','Standing','Pronated'],NULL,'reps_only',ARRAY['Dowel']),
('ex_mob_116',NULL,'Behind the Neck Press (Dowel)',NULL,ARRAY['Shoulders'],ARRAY['Upper Body','Mobility'],NULL,ARRAY['mobility','dynamic','warm-up','Standing','Pronated'],NULL,'reps_only',ARRAY['Dowel']),
('ex_mob_117',NULL,'Supine Pec Stretch',NULL,ARRAY['Chest','Shoulders'],ARRAY['Upper Body','Mobility'],NULL,ARRAY['mobility','static','recovery','Supine','No Grip','Alternating'],NULL,'time',ARRAY['Foam Roller']),
('ex_mob_118',NULL,'Prone Swimmers',NULL,ARRAY['Shoulders','Upper Back'],ARRAY['Upper Body','Mobility'],NULL,ARRAY['mobility','dynamic','warm-up','Prone','No Grip'],NULL,'reps_only',NULL),
('ex_mob_119',NULL,'Floor Angels',NULL,ARRAY['Shoulders','Upper Back'],ARRAY['Upper Body','Mobility'],NULL,ARRAY['mobility','dynamic','warm-up','rehab','Supine','No Grip'],NULL,'reps_only',NULL),
('ex_mob_120',NULL,'Prone I Raise',NULL,ARRAY['Shoulders','Traps'],ARRAY['Upper Body','Mobility'],NULL,ARRAY['mobility','dynamic','rehab','Prone','No Grip'],NULL,'reps_only',NULL),
('ex_mob_121',NULL,'Side-Lying External Rotation',NULL,ARRAY['Rotator Cuff','Shoulders'],ARRAY['Upper Body','Mobility'],NULL,ARRAY['mobility','dynamic','rehab','Side Lying','No Grip','Alternating'],NULL,'reps_only',NULL),
('ex_mob_122',NULL,'Standing Lat Stretch',NULL,ARRAY['Lats'],ARRAY['Upper Body','Mobility'],NULL,ARRAY['mobility','static','recovery','Standing','No Grip','Alternating'],NULL,'time',NULL),

-- === ADDITIONAL DYNAMIC WARM-UP (123-130) ===
('ex_mob_123',NULL,'Toy Soldier Walk',NULL,ARRAY['Hamstrings','Hip Flexors'],ARRAY['Lower Body','Mobility'],NULL,ARRAY['mobility','dynamic','warm-up','Standing','No Grip','Alternating'],NULL,'reps_only',NULL),
('ex_mob_124',NULL,'Walking Spiderman Lunge',NULL,ARRAY['Hip Flexors','Adductors','Upper Back'],ARRAY['Full Body','Mobility'],NULL,ARRAY['mobility','dynamic','warm-up','Standing','No Grip','Alternating'],NULL,'reps_only',NULL),
('ex_mob_125',NULL,'Walking Spiderman with Rotation',NULL,ARRAY['Hip Flexors','Upper Back','Core'],ARRAY['Full Body','Mobility'],NULL,ARRAY['mobility','dynamic','warm-up','Standing','No Grip','Alternating'],NULL,'reps_only',NULL),
('ex_mob_126',NULL,'Reverse Lunge with Overhead Reach',NULL,ARRAY['Hip Flexors','Quadriceps','Shoulders'],ARRAY['Full Body','Mobility'],NULL,ARRAY['mobility','dynamic','warm-up','Standing','No Grip','Alternating'],NULL,'reps_only',NULL),
('ex_mob_127',NULL,'Lateral Lunge with Reach',NULL,ARRAY['Adductors','Glutes'],ARRAY['Lower Body','Mobility'],NULL,ARRAY['mobility','dynamic','warm-up','Standing','No Grip','Alternating'],NULL,'reps_only',NULL),
('ex_mob_128',NULL,'Knee Hug to Forward Lunge',NULL,ARRAY['Glutes','Hip Flexors','Quadriceps'],ARRAY['Lower Body','Mobility'],NULL,ARRAY['mobility','dynamic','warm-up','Standing','No Grip','Alternating'],NULL,'reps_only',NULL),
('ex_mob_129',NULL,'Quad Pull to Lunge',NULL,ARRAY['Quadriceps','Hip Flexors'],ARRAY['Lower Body','Mobility'],NULL,ARRAY['mobility','dynamic','warm-up','Standing','No Grip','Alternating'],NULL,'reps_only',NULL),
('ex_mob_130',NULL,'Walking Spiderman with Hip Lift',NULL,ARRAY['Hip Flexors','Hamstrings','Adductors'],ARRAY['Lower Body','Mobility'],NULL,ARRAY['mobility','dynamic','warm-up','Standing','No Grip','Alternating'],NULL,'reps_only',NULL),

-- === ADDITIONAL CORE / SPINE MOBILITY (131-135) ===
('ex_mob_131',NULL,'Supine Trunk Rotation',NULL,ARRAY['Core','Obliques'],ARRAY['Core','Mobility'],NULL,ARRAY['mobility','dynamic','warm-up','Supine','No Grip'],NULL,'reps_only',NULL),
('ex_mob_132',NULL,'Quadruped Hip Circles',NULL,ARRAY['Hip Flexors','Glutes'],ARRAY['Lower Body','Mobility'],NULL,ARRAY['mobility','dynamic','warm-up','Quadruped','No Grip','Alternating'],NULL,'reps_only',NULL),
('ex_mob_133',NULL,'Jefferson Curl',NULL,ARRAY['Hamstrings','Upper Back','Core'],ARRAY['Full Body','Mobility'],NULL,ARRAY['mobility','dynamic','recovery','Standing','No Grip'],NULL,'reps_only',NULL),
('ex_mob_134',NULL,'Seated Straddle Stretch',NULL,ARRAY['Hamstrings','Adductors'],ARRAY['Lower Body','Mobility'],NULL,ARRAY['mobility','static','recovery','Seated Floor','No Grip'],NULL,'time',NULL),
('ex_mob_135',NULL,'Pancake Stretch',NULL,ARRAY['Hamstrings','Adductors'],ARRAY['Lower Body','Mobility'],NULL,ARRAY['mobility','static','recovery','Seated Floor','No Grip'],NULL,'time',NULL),

-- === ADDITIONAL FOAM ROLLING / MYOFASCIAL (136-140) ===
('ex_mob_136',NULL,'Forearm Foam Roll',NULL,ARRAY['Forearms'],ARRAY['Mobility','Mobility'],NULL,ARRAY['mobility','foam rolling','recovery','Kneeling','No Grip','Alternating'],NULL,'time',ARRAY['Foam Roller']),
('ex_mob_137',NULL,'Bicep Foam Roll',NULL,ARRAY['Biceps'],ARRAY['Mobility','Mobility'],NULL,ARRAY['mobility','foam rolling','recovery','Prone','No Grip','Alternating'],NULL,'time',ARRAY['Foam Roller']),
('ex_mob_138',NULL,'Lacrosse Ball Piriformis Release',NULL,ARRAY['Glutes'],ARRAY['Mobility','Mobility'],NULL,ARRAY['mobility','trigger point','recovery','Seated Floor','No Grip','Alternating'],NULL,'time',ARRAY['Lacrosse Ball']),
('ex_mob_139',NULL,'Lacrosse Ball Shoulder Release',NULL,ARRAY['Shoulders','Rotator Cuff'],ARRAY['Mobility','Mobility'],NULL,ARRAY['mobility','trigger point','recovery','Supine','No Grip','Alternating'],NULL,'time',ARRAY['Lacrosse Ball']),
('ex_mob_140',NULL,'Lacrosse Ball Hip Flexor Release',NULL,ARRAY['Hip Flexors'],ARRAY['Mobility','Mobility'],NULL,ARRAY['mobility','trigger point','recovery','Prone','No Grip','Alternating'],NULL,'time',ARRAY['Lacrosse Ball'])

ON CONFLICT (id) DO NOTHING;
