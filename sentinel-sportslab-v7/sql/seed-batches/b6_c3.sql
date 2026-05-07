INSERT INTO exercises (id, name, description, categories, body_parts, video_url, options) VALUES
('ex_1770810675263_3256','EZ Bar Reverse Grip Front Raise','No description provided.',ARRAY['Upper Body','Bodybuilding'],ARRAY['Shoulders'],'','{"posture": "Standing", "grip": "Supinated", "alternating": false, "movementPattern": "Shoulder Flexion", "mechanics": "Isolation", "longVideoUrl": ""}'::jsonb),
('ex_1770810675263_3257','Sled Sprint','No description provided.',ARRAY['Lower Body','Unsorted'],ARRAY['Quadriceps'],'','{"posture": "Running", "grip": "Neutral", "alternating": true, "movementPattern": "Knee Dominant", "mechanics": "Compound", "longVideoUrl": ""}'::jsonb)
ON CONFLICT (id) DO NOTHING;
