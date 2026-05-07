-- Mobility Exercises Batch 1: Hip Mobility, Ankle Mobility, Thoracic Spine (ex_mob_001 - ex_mob_050)
INSERT INTO exercises (id,club_id,name,description,body_parts,categories,video_url,tags,options,tracking_type,equipment) VALUES

-- === HIP MOBILITY (001-016) ===
('ex_mob_001',NULL,'90/90 Hip Stretch',NULL,ARRAY['Glutes','Hip Flexors'],ARRAY['Lower Body','Mobility'],NULL,ARRAY['mobility','static','warm-up','Seated Floor','No Grip'],NULL,'time',NULL),
('ex_mob_002',NULL,'Pigeon Stretch',NULL,ARRAY['Glutes','Hip Flexors'],ARRAY['Lower Body','Mobility'],NULL,ARRAY['mobility','static','recovery','Prone','No Grip'],NULL,'time',NULL),
('ex_mob_003',NULL,'Hip CARs',NULL,ARRAY['Glutes','Hip Flexors','Abductors','Adductors'],ARRAY['Lower Body','Mobility'],NULL,ARRAY['mobility','CARs','dynamic','warm-up','Standing','No Grip'],NULL,'reps_only',NULL),
('ex_mob_004',NULL,'Frog Stretch',NULL,ARRAY['Adductors','Hip Flexors'],ARRAY['Lower Body','Mobility'],NULL,ARRAY['mobility','static','recovery','Quadruped','No Grip'],NULL,'time',NULL),
('ex_mob_005',NULL,'Cossack Squat',NULL,ARRAY['Adductors','Glutes','Quadriceps'],ARRAY['Lower Body','Mobility'],NULL,ARRAY['mobility','dynamic','warm-up','Standing','No Grip'],NULL,'reps_only',NULL),
('ex_mob_006',NULL,'Standing Hip Flexor Stretch',NULL,ARRAY['Hip Flexors','Quadriceps'],ARRAY['Lower Body','Mobility'],NULL,ARRAY['mobility','static','recovery','Standing','No Grip','Alternating'],NULL,'time',NULL),
('ex_mob_007',NULL,'Seated Figure 4 Stretch',NULL,ARRAY['Glutes'],ARRAY['Lower Body','Mobility'],NULL,ARRAY['mobility','static','recovery','Seated','No Grip','Alternating'],NULL,'time',NULL),
('ex_mob_008',NULL,'Butterfly Stretch',NULL,ARRAY['Adductors','Hip Flexors'],ARRAY['Lower Body','Mobility'],NULL,ARRAY['mobility','static','recovery','Seated Floor','No Grip'],NULL,'time',NULL),
('ex_mob_009',NULL,'Standing Hip Circles',NULL,ARRAY['Hip Flexors','Glutes','Abductors'],ARRAY['Lower Body','Mobility'],NULL,ARRAY['mobility','dynamic','warm-up','Standing','No Grip','Alternating'],NULL,'reps_only',NULL),
('ex_mob_010',NULL,'Fire Hydrant Circles',NULL,ARRAY['Glutes','Abductors'],ARRAY['Lower Body','Mobility'],NULL,ARRAY['mobility','dynamic','warm-up','Quadruped','No Grip','Alternating'],NULL,'reps_only',NULL),
('ex_mob_011',NULL,'Front Leg Swings',NULL,ARRAY['Hip Flexors','Hamstrings'],ARRAY['Lower Body','Mobility'],NULL,ARRAY['mobility','dynamic','warm-up','Standing','No Grip','Alternating'],NULL,'reps_only',NULL),
('ex_mob_012',NULL,'Lateral Leg Swings',NULL,ARRAY['Adductors','Abductors'],ARRAY['Lower Body','Mobility'],NULL,ARRAY['mobility','dynamic','warm-up','Standing','No Grip','Alternating'],NULL,'reps_only',NULL),
('ex_mob_013',NULL,'Banded Hip Distraction',NULL,ARRAY['Hip Flexors','Glutes'],ARRAY['Lower Body','Mobility'],NULL,ARRAY['mobility','static','rehab','Half Kneeling','No Grip','Alternating'],NULL,'time',ARRAY['Superband']),
('ex_mob_014',NULL,'Couch Stretch',NULL,ARRAY['Hip Flexors','Quadriceps'],ARRAY['Lower Body','Mobility'],NULL,ARRAY['mobility','static','recovery','Half Kneeling','No Grip','Alternating'],NULL,'time',NULL),
('ex_mob_015',NULL,'Lizard Stretch',NULL,ARRAY['Hip Flexors','Adductors','Glutes'],ARRAY['Lower Body','Mobility'],NULL,ARRAY['mobility','static','recovery','Prone','No Grip','Alternating'],NULL,'time',NULL),
('ex_mob_016',NULL,'Half Kneeling Hip Flexor Stretch',NULL,ARRAY['Hip Flexors','Quadriceps'],ARRAY['Lower Body','Mobility'],NULL,ARRAY['mobility','static','warm-up','Half Kneeling','No Grip','Alternating'],NULL,'time',NULL),
('ex_mob_017',NULL,'Deep Squat Hold',NULL,ARRAY['Hip Flexors','Glutes','Quadriceps','Calves'],ARRAY['Lower Body','Mobility'],NULL,ARRAY['mobility','static','warm-up','Standing','No Grip'],NULL,'time',NULL),

-- === ANKLE MOBILITY (018-024) ===
('ex_mob_018',NULL,'Wall Ankle Mobilization',NULL,ARRAY['Calves'],ARRAY['Lower Body','Mobility'],NULL,ARRAY['mobility','dynamic','rehab','Standing','No Grip','Alternating'],NULL,'reps_only',NULL),
('ex_mob_019',NULL,'Banded Ankle Distraction',NULL,ARRAY['Calves'],ARRAY['Lower Body','Mobility'],NULL,ARRAY['mobility','dynamic','rehab','Half Kneeling','No Grip','Alternating'],NULL,'reps_only',ARRAY['Superband']),
('ex_mob_020',NULL,'Ankle CARs',NULL,ARRAY['Calves'],ARRAY['Lower Body','Mobility'],NULL,ARRAY['mobility','CARs','dynamic','warm-up','Seated','No Grip','Alternating'],NULL,'reps_only',NULL),
('ex_mob_021',NULL,'Wall Calf Stretch',NULL,ARRAY['Calves'],ARRAY['Lower Body','Mobility'],NULL,ARRAY['mobility','static','recovery','Standing','No Grip','Alternating'],NULL,'time',NULL),
('ex_mob_022',NULL,'Soleus Stretch',NULL,ARRAY['Calves'],ARRAY['Lower Body','Mobility'],NULL,ARRAY['mobility','static','recovery','Standing','No Grip','Alternating'],NULL,'time',NULL),
('ex_mob_023',NULL,'Ankle Circles',NULL,ARRAY['Calves'],ARRAY['Lower Body','Mobility'],NULL,ARRAY['mobility','dynamic','warm-up','Seated','No Grip','Alternating'],NULL,'reps_only',NULL),
('ex_mob_024',NULL,'Kneeling Ankle Mobilization',NULL,ARRAY['Calves'],ARRAY['Lower Body','Mobility'],NULL,ARRAY['mobility','dynamic','rehab','Kneeling','No Grip','Alternating'],NULL,'reps_only',NULL),

-- === THORACIC SPINE MOBILITY (025-034) ===
('ex_mob_025',NULL,'Cat-Cow',NULL,ARRAY['Core','Upper Back'],ARRAY['Core','Mobility'],NULL,ARRAY['mobility','dynamic','warm-up','Quadruped','No Grip'],NULL,'reps_only',NULL),
('ex_mob_026',NULL,'Thread the Needle',NULL,ARRAY['Upper Back','Shoulders'],ARRAY['Upper Body','Mobility'],NULL,ARRAY['mobility','dynamic','warm-up','Quadruped','No Grip','Alternating'],NULL,'reps_only',NULL),
('ex_mob_027',NULL,'Open Book Rotation',NULL,ARRAY['Upper Back','Core'],ARRAY['Core','Mobility'],NULL,ARRAY['mobility','dynamic','warm-up','Side Lying','No Grip','Alternating'],NULL,'reps_only',NULL),
('ex_mob_028',NULL,'Quadruped Thoracic Rotation',NULL,ARRAY['Upper Back','Core'],ARRAY['Core','Mobility'],NULL,ARRAY['mobility','dynamic','warm-up','Quadruped','No Grip','Alternating'],NULL,'reps_only',NULL),
('ex_mob_029',NULL,'Seated Thoracic Rotation',NULL,ARRAY['Upper Back','Core'],ARRAY['Core','Mobility'],NULL,ARRAY['mobility','dynamic','warm-up','Seated','No Grip','Alternating'],NULL,'reps_only',NULL),
('ex_mob_030',NULL,'Prone Scorpion',NULL,ARRAY['Upper Back','Hip Flexors'],ARRAY['Core','Mobility'],NULL,ARRAY['mobility','dynamic','warm-up','Prone','No Grip','Alternating'],NULL,'reps_only',NULL),
('ex_mob_031',NULL,'Supine Windshield Wipers',NULL,ARRAY['Core','Hip Flexors'],ARRAY['Core','Mobility'],NULL,ARRAY['mobility','dynamic','warm-up','Supine','No Grip'],NULL,'reps_only',NULL),
('ex_mob_032',NULL,'Side-Lying Windmill',NULL,ARRAY['Upper Back','Shoulders','Core'],ARRAY['Upper Body','Mobility'],NULL,ARRAY['mobility','dynamic','warm-up','Side Lying','No Grip','Alternating'],NULL,'reps_only',NULL),
('ex_mob_033',NULL,'Bench Thoracic Extension',NULL,ARRAY['Upper Back','Lats'],ARRAY['Upper Body','Mobility'],NULL,ARRAY['mobility','static','recovery','Kneeling','No Grip'],NULL,'time',ARRAY['Bench']),

-- === SHOULDER MOBILITY GAPS (034-042) ===
('ex_mob_034',NULL,'Wall Slides',NULL,ARRAY['Shoulders','Upper Back'],ARRAY['Upper Body','Mobility'],NULL,ARRAY['mobility','dynamic','warm-up','rehab','Standing','No Grip'],NULL,'reps_only',NULL),
('ex_mob_035',NULL,'Wall Angels',NULL,ARRAY['Shoulders','Upper Back'],ARRAY['Upper Body','Mobility'],NULL,ARRAY['mobility','dynamic','warm-up','rehab','Standing','No Grip'],NULL,'reps_only',NULL),
('ex_mob_036',NULL,'Sleeper Stretch',NULL,ARRAY['Rotator Cuff','Shoulders'],ARRAY['Upper Body','Mobility'],NULL,ARRAY['mobility','static','recovery','rehab','Side Lying','No Grip','Alternating'],NULL,'time',NULL),
('ex_mob_037',NULL,'Cross-Body Shoulder Stretch',NULL,ARRAY['Shoulders'],ARRAY['Upper Body','Mobility'],NULL,ARRAY['mobility','static','recovery','Standing','No Grip','Alternating'],NULL,'time',NULL),
('ex_mob_038',NULL,'Doorway Chest Stretch',NULL,ARRAY['Chest','Shoulders'],ARRAY['Upper Body','Mobility'],NULL,ARRAY['mobility','static','recovery','Standing','No Grip'],NULL,'time',NULL),
('ex_mob_039',NULL,'Prone Y Raise',NULL,ARRAY['Shoulders','Upper Back','Traps'],ARRAY['Upper Body','Mobility'],NULL,ARRAY['mobility','dynamic','rehab','Prone','No Grip'],NULL,'reps_only',NULL),
('ex_mob_040',NULL,'Prone T Raise',NULL,ARRAY['Shoulders','Upper Back','Traps'],ARRAY['Upper Body','Mobility'],NULL,ARRAY['mobility','dynamic','rehab','Prone','No Grip'],NULL,'reps_only',NULL),
('ex_mob_041',NULL,'Prone W Raise',NULL,ARRAY['Shoulders','Rotator Cuff','Traps'],ARRAY['Upper Body','Mobility'],NULL,ARRAY['mobility','dynamic','rehab','Prone','No Grip'],NULL,'reps_only',NULL),
('ex_mob_042',NULL,'Scapular Push Ups',NULL,ARRAY['Shoulders','Upper Back'],ARRAY['Upper Body','Mobility'],NULL,ARRAY['mobility','dynamic','warm-up','rehab','Prone','No Grip'],NULL,'reps_only',NULL),
('ex_mob_043',NULL,'Banded Face Pull (Mobility)',NULL,ARRAY['Shoulders','Rotator Cuff','Upper Back'],ARRAY['Upper Body','Mobility'],NULL,ARRAY['mobility','dynamic','warm-up','rehab','Standing','Pronated'],NULL,'reps_only',ARRAY['Resistance Band']),
('ex_mob_044',NULL,'Overhead Band Stretch',NULL,ARRAY['Shoulders','Lats'],ARRAY['Upper Body','Mobility'],NULL,ARRAY['mobility','static','recovery','Standing','Pronated'],NULL,'time',ARRAY['Resistance Band']),

-- === WRIST & ELBOW MOBILITY (045-049) ===
('ex_mob_045',NULL,'Wrist CARs',NULL,ARRAY['Forearms'],ARRAY['Upper Body','Mobility'],NULL,ARRAY['mobility','CARs','dynamic','warm-up','Seated','No Grip','Alternating'],NULL,'reps_only',NULL),
('ex_mob_046',NULL,'Wrist Flexor Stretch',NULL,ARRAY['Forearms'],ARRAY['Upper Body','Mobility'],NULL,ARRAY['mobility','static','recovery','Standing','No Grip','Alternating'],NULL,'time',NULL),
('ex_mob_047',NULL,'Wrist Extensor Stretch',NULL,ARRAY['Forearms'],ARRAY['Upper Body','Mobility'],NULL,ARRAY['mobility','static','recovery','Standing','No Grip','Alternating'],NULL,'time',NULL),
('ex_mob_048',NULL,'Prayer Stretch',NULL,ARRAY['Forearms'],ARRAY['Upper Body','Mobility'],NULL,ARRAY['mobility','static','recovery','Standing','No Grip'],NULL,'time',NULL),
('ex_mob_049',NULL,'Reverse Prayer Stretch',NULL,ARRAY['Forearms'],ARRAY['Upper Body','Mobility'],NULL,ARRAY['mobility','static','recovery','Standing','No Grip'],NULL,'time',NULL),

-- === NECK & CERVICAL (050) ===
('ex_mob_050',NULL,'Neck CARs',NULL,ARRAY['Neck'],ARRAY['Upper Body','Mobility'],NULL,ARRAY['mobility','CARs','dynamic','warm-up','Standing','No Grip'],NULL,'reps_only',NULL)

ON CONFLICT (id) DO NOTHING;
