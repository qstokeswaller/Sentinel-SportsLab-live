-- Mobility Exercises Batch 2: Neck, Dynamic Warm-Up, Foam Rolling (ex_mob_051 - ex_mob_100)
INSERT INTO exercises (id,club_id,name,description,body_parts,categories,video_url,tags,options,tracking_type,equipment) VALUES

-- === NECK & CERVICAL continued (051-054) ===
('ex_mob_051',NULL,'Chin Tucks',NULL,ARRAY['Neck'],ARRAY['Upper Body','Mobility'],NULL,ARRAY['mobility','dynamic','rehab','Seated','No Grip'],NULL,'reps_only',NULL),
('ex_mob_052',NULL,'Levator Scapulae Stretch',NULL,ARRAY['Neck','Traps'],ARRAY['Upper Body','Mobility'],NULL,ARRAY['mobility','static','recovery','Seated','No Grip','Alternating'],NULL,'time',NULL),
('ex_mob_053',NULL,'Upper Trap Stretch',NULL,ARRAY['Traps','Neck'],ARRAY['Upper Body','Mobility'],NULL,ARRAY['mobility','static','recovery','Seated','No Grip','Alternating'],NULL,'time',NULL),
('ex_mob_054',NULL,'SCM Stretch',NULL,ARRAY['Neck'],ARRAY['Upper Body','Mobility'],NULL,ARRAY['mobility','static','recovery','Seated','No Grip','Alternating'],NULL,'time',NULL),

-- === DYNAMIC WARM-UP MOBILITY (055-067) ===
('ex_mob_055',NULL,'World''s Greatest Stretch',NULL,ARRAY['Hip Flexors','Upper Back','Hamstrings','Glutes'],ARRAY['Full Body','Mobility'],NULL,ARRAY['mobility','dynamic','warm-up','Standing','No Grip','Alternating'],NULL,'reps_only',NULL),
('ex_mob_056',NULL,'Walking Knee Hugs',NULL,ARRAY['Glutes','Hip Flexors'],ARRAY['Lower Body','Mobility'],NULL,ARRAY['mobility','dynamic','warm-up','Standing','No Grip','Alternating'],NULL,'reps_only',NULL),
('ex_mob_057',NULL,'Walking Quad Pulls',NULL,ARRAY['Quadriceps','Hip Flexors'],ARRAY['Lower Body','Mobility'],NULL,ARRAY['mobility','dynamic','warm-up','Standing','No Grip','Alternating'],NULL,'reps_only',NULL),
('ex_mob_058',NULL,'A-Skip',NULL,ARRAY['Hip Flexors','Calves'],ARRAY['Lower Body','Mobility'],NULL,ARRAY['mobility','dynamic','warm-up','Standing','No Grip','Alternating'],NULL,'reps_only',NULL),
('ex_mob_059',NULL,'B-Skip',NULL,ARRAY['Hip Flexors','Hamstrings','Calves'],ARRAY['Lower Body','Mobility'],NULL,ARRAY['mobility','dynamic','warm-up','Standing','No Grip','Alternating'],NULL,'reps_only',NULL),
('ex_mob_060',NULL,'High Knees (Mobility)',NULL,ARRAY['Hip Flexors','Calves'],ARRAY['Lower Body','Mobility'],NULL,ARRAY['mobility','dynamic','warm-up','Standing','No Grip','Alternating'],NULL,'reps_only',NULL),
('ex_mob_061',NULL,'Butt Kicks',NULL,ARRAY['Hamstrings','Quadriceps'],ARRAY['Lower Body','Mobility'],NULL,ARRAY['mobility','dynamic','warm-up','Standing','No Grip','Alternating'],NULL,'reps_only',NULL),
('ex_mob_062',NULL,'Walking Leg Cradles',NULL,ARRAY['Glutes','Hip Flexors','Adductors'],ARRAY['Lower Body','Mobility'],NULL,ARRAY['mobility','dynamic','warm-up','Standing','No Grip','Alternating'],NULL,'reps_only',NULL),
('ex_mob_063',NULL,'Walking Lateral Lunges',NULL,ARRAY['Adductors','Glutes','Quadriceps'],ARRAY['Lower Body','Mobility'],NULL,ARRAY['mobility','dynamic','warm-up','Standing','No Grip','Alternating'],NULL,'reps_only',NULL),
('ex_mob_064',NULL,'Walking RDL',NULL,ARRAY['Hamstrings','Glutes'],ARRAY['Lower Body','Mobility'],NULL,ARRAY['mobility','dynamic','warm-up','Standing','No Grip','Alternating'],NULL,'reps_only',NULL),
('ex_mob_065',NULL,'Frankenstein Walks',NULL,ARRAY['Hamstrings','Hip Flexors'],ARRAY['Lower Body','Mobility'],NULL,ARRAY['mobility','dynamic','warm-up','Standing','No Grip','Alternating'],NULL,'reps_only',NULL),
('ex_mob_066',NULL,'Scorpion Stretch',NULL,ARRAY['Hip Flexors','Upper Back','Core'],ARRAY['Full Body','Mobility'],NULL,ARRAY['mobility','dynamic','warm-up','Prone','No Grip','Alternating'],NULL,'reps_only',NULL),
('ex_mob_067',NULL,'Iron Cross',NULL,ARRAY['Adductors','Hip Flexors','Core'],ARRAY['Full Body','Mobility'],NULL,ARRAY['mobility','dynamic','warm-up','Supine','No Grip','Alternating'],NULL,'reps_only',NULL),

-- === MORE FOAM ROLLING (068-076) ===
('ex_mob_068',NULL,'Adductor Foam Roll',NULL,ARRAY['Adductors'],ARRAY['Mobility','Mobility'],NULL,ARRAY['mobility','foam rolling','recovery','Prone','No Grip','Alternating'],NULL,'time',ARRAY['Foam Roller']),
('ex_mob_069',NULL,'Chest Foam Roll',NULL,ARRAY['Chest'],ARRAY['Mobility','Mobility'],NULL,ARRAY['mobility','foam rolling','recovery','Prone','No Grip','Alternating'],NULL,'time',ARRAY['Foam Roller']),
('ex_mob_070',NULL,'Upper Back Foam Roll',NULL,ARRAY['Upper Back'],ARRAY['Mobility','Mobility'],NULL,ARRAY['mobility','foam rolling','recovery','Supine','No Grip'],NULL,'time',ARRAY['Foam Roller']),
('ex_mob_071',NULL,'Hip Flexor Foam Roll',NULL,ARRAY['Hip Flexors'],ARRAY['Mobility','Mobility'],NULL,ARRAY['mobility','foam rolling','recovery','Prone','No Grip','Alternating'],NULL,'time',ARRAY['Foam Roller']),
('ex_mob_072',NULL,'TFL Foam Roll',NULL,ARRAY['Abductors'],ARRAY['Mobility','Mobility'],NULL,ARRAY['mobility','foam rolling','recovery','Side Lying','No Grip','Alternating'],NULL,'time',ARRAY['Foam Roller']),
('ex_mob_073',NULL,'Pec Foam Roll',NULL,ARRAY['Chest'],ARRAY['Mobility','Mobility'],NULL,ARRAY['mobility','foam rolling','recovery','Prone','No Grip','Alternating'],NULL,'time',ARRAY['Foam Roller']),
('ex_mob_074',NULL,'Shin Foam Roll',NULL,ARRAY['Calves'],ARRAY['Mobility','Mobility'],NULL,ARRAY['mobility','foam rolling','recovery','Kneeling','No Grip','Alternating'],NULL,'time',ARRAY['Foam Roller']),
('ex_mob_075',NULL,'Foot Roll (Lacrosse Ball)',NULL,ARRAY['Calves'],ARRAY['Mobility','Mobility'],NULL,ARRAY['mobility','trigger point','recovery','Standing','No Grip','Alternating'],NULL,'time',ARRAY['Lacrosse Ball']),
('ex_mob_076',NULL,'Piriformis Foam Roll',NULL,ARRAY['Glutes'],ARRAY['Mobility','Mobility'],NULL,ARRAY['mobility','foam rolling','recovery','Seated Floor','No Grip','Alternating'],NULL,'time',ARRAY['Foam Roller']),

-- === LACROSSE BALL / TRIGGER POINT (077-082) ===
('ex_mob_077',NULL,'Lacrosse Ball Pec Release',NULL,ARRAY['Chest'],ARRAY['Mobility','Mobility'],NULL,ARRAY['mobility','trigger point','recovery','Standing','No Grip','Alternating'],NULL,'time',ARRAY['Lacrosse Ball']),
('ex_mob_078',NULL,'Lacrosse Ball Glute Release',NULL,ARRAY['Glutes'],ARRAY['Mobility','Mobility'],NULL,ARRAY['mobility','trigger point','recovery','Seated Floor','No Grip','Alternating'],NULL,'time',ARRAY['Lacrosse Ball']),
('ex_mob_079',NULL,'Lacrosse Ball Foot Release',NULL,ARRAY['Calves'],ARRAY['Mobility','Mobility'],NULL,ARRAY['mobility','trigger point','recovery','Standing','No Grip','Alternating'],NULL,'time',ARRAY['Lacrosse Ball']),
('ex_mob_080',NULL,'Lacrosse Ball Trap Release',NULL,ARRAY['Traps'],ARRAY['Mobility','Mobility'],NULL,ARRAY['mobility','trigger point','recovery','Supine','No Grip','Alternating'],NULL,'time',ARRAY['Lacrosse Ball']),
('ex_mob_081',NULL,'Lacrosse Ball Lat Release',NULL,ARRAY['Lats'],ARRAY['Mobility','Mobility'],NULL,ARRAY['mobility','trigger point','recovery','Side Lying','No Grip','Alternating'],NULL,'time',ARRAY['Lacrosse Ball']),
('ex_mob_082',NULL,'Lacrosse Ball Thoracic Release',NULL,ARRAY['Upper Back'],ARRAY['Mobility','Mobility'],NULL,ARRAY['mobility','trigger point','recovery','Supine','No Grip'],NULL,'time',ARRAY['Lacrosse Ball']),

-- === PNF / CONTRACT-RELAX (083-086) ===
('ex_mob_083',NULL,'PNF Hamstring Stretch',NULL,ARRAY['Hamstrings'],ARRAY['Lower Body','Mobility'],NULL,ARRAY['mobility','PNF','static','recovery','rehab','Supine','No Grip','Alternating'],NULL,'time',NULL),
('ex_mob_084',NULL,'PNF Hip Flexor Stretch',NULL,ARRAY['Hip Flexors'],ARRAY['Lower Body','Mobility'],NULL,ARRAY['mobility','PNF','static','recovery','rehab','Half Kneeling','No Grip','Alternating'],NULL,'time',NULL),
('ex_mob_085',NULL,'PNF Quad Stretch',NULL,ARRAY['Quadriceps'],ARRAY['Lower Body','Mobility'],NULL,ARRAY['mobility','PNF','static','recovery','rehab','Side Lying','No Grip','Alternating'],NULL,'time',NULL),
('ex_mob_086',NULL,'PNF Chest Stretch',NULL,ARRAY['Chest','Shoulders'],ARRAY['Upper Body','Mobility'],NULL,ARRAY['mobility','PNF','static','recovery','rehab','Standing','No Grip'],NULL,'time',NULL),

-- === YOGA-BASED MOBILITY (087-094) ===
('ex_mob_087',NULL,'Downward Dog',NULL,ARRAY['Hamstrings','Calves','Shoulders','Lats'],ARRAY['Full Body','Mobility'],NULL,ARRAY['mobility','yoga','static','warm-up','recovery','Prone','No Grip'],NULL,'time',NULL),
('ex_mob_088',NULL,'Upward Dog',NULL,ARRAY['Chest','Abdominals','Hip Flexors'],ARRAY['Full Body','Mobility'],NULL,ARRAY['mobility','yoga','static','warm-up','recovery','Prone','No Grip'],NULL,'time',NULL),
('ex_mob_089',NULL,'Child''s Pose',NULL,ARRAY['Lats','Upper Back','Glutes'],ARRAY['Full Body','Mobility'],NULL,ARRAY['mobility','yoga','static','recovery','Kneeling','No Grip'],NULL,'time',NULL),
('ex_mob_090',NULL,'Pigeon Pose',NULL,ARRAY['Glutes','Hip Flexors'],ARRAY['Lower Body','Mobility'],NULL,ARRAY['mobility','yoga','static','recovery','Prone','No Grip','Alternating'],NULL,'time',NULL),
('ex_mob_091',NULL,'Warrior 1 Pose',NULL,ARRAY['Hip Flexors','Quadriceps','Shoulders'],ARRAY['Full Body','Mobility'],NULL,ARRAY['mobility','yoga','static','warm-up','Standing','No Grip','Alternating'],NULL,'time',NULL),
('ex_mob_092',NULL,'Warrior 2 Pose',NULL,ARRAY['Hip Flexors','Adductors','Shoulders'],ARRAY['Full Body','Mobility'],NULL,ARRAY['mobility','yoga','static','warm-up','Standing','No Grip','Alternating'],NULL,'time',NULL),
('ex_mob_093',NULL,'Triangle Pose',NULL,ARRAY['Hamstrings','Obliques','Adductors'],ARRAY['Full Body','Mobility'],NULL,ARRAY['mobility','yoga','static','recovery','Standing','No Grip','Alternating'],NULL,'time',NULL),
('ex_mob_094',NULL,'Half Moon Pose',NULL,ARRAY['Glutes','Obliques','Hamstrings'],ARRAY['Full Body','Mobility'],NULL,ARRAY['mobility','yoga','static','recovery','Standing','No Grip','Alternating'],NULL,'time',NULL),
('ex_mob_095',NULL,'Standing Forward Fold',NULL,ARRAY['Hamstrings','Calves'],ARRAY['Lower Body','Mobility'],NULL,ARRAY['mobility','yoga','static','recovery','Standing','No Grip'],NULL,'time',NULL),

-- === JOINT CARs (096-100) ===
('ex_mob_096',NULL,'Shoulder CARs',NULL,ARRAY['Shoulders','Rotator Cuff'],ARRAY['Upper Body','Mobility'],NULL,ARRAY['mobility','CARs','dynamic','warm-up','Standing','No Grip','Alternating'],NULL,'reps_only',NULL),
('ex_mob_097',NULL,'Spine CARs',NULL,ARRAY['Core','Upper Back'],ARRAY['Core','Mobility'],NULL,ARRAY['mobility','CARs','dynamic','warm-up','Standing','No Grip'],NULL,'reps_only',NULL),
('ex_mob_098',NULL,'Knee CARs',NULL,ARRAY['Quadriceps','Hamstrings'],ARRAY['Lower Body','Mobility'],NULL,ARRAY['mobility','CARs','dynamic','warm-up','Standing','No Grip','Alternating'],NULL,'reps_only',NULL),
('ex_mob_099',NULL,'Elbow CARs',NULL,ARRAY['Forearms','Biceps','Triceps'],ARRAY['Upper Body','Mobility'],NULL,ARRAY['mobility','CARs','dynamic','warm-up','Standing','No Grip','Alternating'],NULL,'reps_only',NULL),
('ex_mob_100',NULL,'Toe CARs',NULL,ARRAY['Calves'],ARRAY['Lower Body','Mobility'],NULL,ARRAY['mobility','CARs','dynamic','warm-up','Seated','No Grip','Alternating'],NULL,'reps_only',NULL)

ON CONFLICT (id) DO NOTHING;
