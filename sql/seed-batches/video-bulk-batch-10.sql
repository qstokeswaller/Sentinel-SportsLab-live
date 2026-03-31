UPDATE exercises AS e
SET video_url = v.url
FROM (VALUES
  ('Bodyweight Side Lying Clamshell', 'https://youtu.be/G3yQITNPIz8?si=V_AVSgSWE_RFAsSE'),
  ('Double Cable Incline Bench Chest Fly', 'https://youtu.be/i6WHN9L5uYk?si=YLzKzoCoztvNvlQl&amp;utm_source=MTQxZ'),
  ('Double Cable Seated Chest Fly', 'https://youtu.be/kMmV0thhwnA?si=JAh7-DW4Wpz2xBJd&amp;utm_source=MTQxZ'),
  ('Double Cable Decline Bench Chest Fly', 'https://youtu.be/jIt8nG02Ss0?si=eVQ-M_zbzpxQN1mL&amp;utm_source=MTQxZ'),
  ('Plate Overhead Carry', 'https://youtu.be/pzWVXEdABFg?si=rDT20cfa7nGutLCH&amp;utm_source=MTQxZ'),
  ('Slider Plank Jack', 'https://youtu.be/lM33VtF6SCg?si=JG_kyBmQ8H-MspnB&amp;utm_source=MTQxZ'),
  ('Suspension Feet Elevated Plank', 'https://youtu.be/g93DurTL79E?si=BG_2IXTND6t0_DRn&amp;utm_source=MTQxZ'),
  ('Suspension Feet Elevated Forearm Plank', 'https://youtu.be/hRWpFtDyofg?si=Xwts69VNdiYCB5-r&amp;utm_source=MTQxZ'),
  ('Suspension Feet Elevated Side Plank', 'https://youtu.be/Wkeg0Gr1n7g?si=Xq62yMZ9kUc0lizD&amp;utm_source=MTQxZ'),
  ('Stability Ball Feet Elevated Plank', 'https://youtu.be/MepSU7ua6Dw?si=wDktIQCYf3BtFlRS&amp;utm_source=MTQxZ'),
  ('Cable Straight Bar Reverse Grip Front Raise', 'https://youtu.be/7W7yCOrQMsA?si=fMaW2CwMSudtqBx5&amp;utm_source=MTQxZ'),
  ('EZ Bar Reverse Grip Front Raise', 'https://youtu.be/yTHdkQntOy0?si=MyTLO7RESotzfRsT&amp;utm_source=MTQxZ'),
  ('Sled Sprint', 'https://youtu.be/LyN1Mt53HI4?si=D2E6-rpfLFoTHTc8&amp;utm_source=MTQxZ')
) AS v(name, url)
WHERE LOWER(TRIM(e.name)) = LOWER(v.name);