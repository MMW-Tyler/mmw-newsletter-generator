-- ============================================================
-- MMW Newsletter Generator — Seed data
-- ============================================================
-- Run after 01_schema.sql.
-- Idempotent: clears calendar_events first, then re-inserts.
-- ae_list seed only inserts if table is empty.
-- ============================================================

-- ----- AEs (only seed if empty) -----
insert into ae_list (name)
select x.name from (values
  ('Ami'),
  ('Stephany'),
  ('Account Executive 3')
) as x(name)
where not exists (select 1 from ae_list);

-- ----- Calendar events -----
truncate table calendar_events;

insert into calendar_events (month, day, title, description, applicable_verticals) values
-- January
(1, null, 'Cervical Health Awareness Month', 'Promote screening, HPV awareness, well-woman visits.', array['obgyn','urogyn']),
(1, null, 'Thyroid Awareness Month', 'Hormone health, fatigue, weight changes.', array['functional','obgyn']),
(1, null, 'Glaucoma Awareness Month', 'Eye health awareness.', array['functional']),
(1, 1, 'New Year', 'Goal-setting, fresh start tone.', array['obgyn','medspa','functional','urogyn']),

-- February
(2, null, 'American Heart Month', 'Cardiovascular health, lifestyle, stress, sleep.', array['obgyn','medspa','functional','urogyn']),
(2, null, 'Low Vision Awareness Month', 'Eye health.', array['functional']),
(2, null, 'AMD/Low Vision Awareness Month', 'Functional eye and brain health.', array['functional']),
(2, 14, 'Valentine''s Day', 'Couples, self-care, heart-themed promotions.', array['obgyn','medspa','functional','urogyn']),

-- March
(3, null, 'Endometriosis Awareness Month', 'Pelvic pain, periods, advocacy.', array['obgyn']),
(3, null, 'National Nutrition Month', 'Diet, gut health, micronutrients.', array['functional','medspa','obgyn']),
(3, null, 'Colorectal Cancer Awareness Month', 'Screening, gut health.', array['functional']),
(3, null, 'National Sleep Awareness Month', 'Sleep hygiene, hormones, recovery.', array['functional','medspa','obgyn']),
(3, 8, 'International Women''s Day', 'Celebrate women''s health.', array['obgyn','medspa','urogyn']),
(3, 17, 'Saint Patrick''s Day', 'Light seasonal hook.', array['obgyn','medspa','functional','urogyn']),

-- April
(4, null, 'Stress Awareness Month', 'Cortisol, burnout, nervous system regulation.', array['obgyn','medspa','functional','urogyn']),
(4, null, 'Rosacea Awareness Month', 'Sensitive skin, redness, triggers.', array['medspa']),
(4, null, 'IBS Awareness Month', 'Gut health, food sensitivities.', array['functional']),
(4, null, 'Alcohol Awareness Month', 'Liver health, sober-curious wellness.', array['functional']),
(4, 7, 'World Health Day', 'Broad wellness theme.', array['obgyn','medspa','functional','urogyn']),
(4, 22, 'Earth Day', 'Clean beauty, sustainable wellness.', array['medspa','functional']),

-- May
(5, null, 'Women''s Health Month', 'Whole-woman health, screenings, hormones.', array['obgyn','urogyn']),
(5, null, 'Skin Cancer Awareness Month', 'Sun protection, screening, SPF.', array['medspa']),
(5, null, 'Mental Health Awareness Month', 'Mood, hormones, support.', array['obgyn','medspa','functional','urogyn']),
(5, null, 'Maternal Mental Health Month', 'Postpartum mood, perinatal care.', array['obgyn']),
(5, null, 'Melanoma Awareness Month', 'Skin checks, mole mapping.', array['medspa']),
(5, null, 'Celiac Awareness Month', 'Gluten, gut health.', array['functional']),
(5, null, 'National Osteoporosis Month', 'Bone health, hormones, post-menopausal.', array['obgyn','functional','urogyn']),
(5, null, 'Better Sleep Month', 'Sleep and recovery.', array['functional','obgyn']),
(5, 12, 'Mother''s Day', 'Honoring moms; gift card / mom-focused services.', array['obgyn','medspa','functional','urogyn']),
(5, 26, 'Memorial Day', 'Holiday weekend hook.', array['obgyn','medspa','functional','urogyn']),

-- June
(6, null, 'Men''s Health Month', 'Hormones, prostate, testosterone, lifestyle.', array['functional']),
(6, null, 'Migraine & Headache Awareness Month', 'Hormonal triggers, gut, sleep.', array['functional','obgyn']),
(6, null, 'Alzheimer''s & Brain Awareness Month', 'Brain health, longevity.', array['functional']),
(6, null, 'PTSD Awareness Month', 'Mind-body health.', array['functional']),
(6, null, 'Cataract Awareness Month', 'Eye health.', array['functional']),
(6, 15, 'Father''s Day', 'Men''s wellness focus, gift cards.', array['medspa','functional']),
(6, 21, 'First Day of Summer', 'Sun, hydration, body confidence.', array['medspa','functional','obgyn']),

-- July
(7, null, 'UV Safety Month', 'Sunscreen, skin protection.', array['medspa']),
(7, null, 'Cord Blood Awareness Month', 'Pregnancy, cord blood banking.', array['obgyn']),
(7, null, 'Group B Strep Awareness Month', 'Prenatal screening.', array['obgyn']),
(7, 4, 'Independence Day', 'Holiday weekend hook.', array['obgyn','medspa','functional','urogyn']),

-- August
(8, null, 'National Wellness Month', 'Self-care, healthy habits.', array['functional','medspa','obgyn']),
(8, null, 'Hair Loss Awareness Month', 'PRP, supplements, hormones.', array['medspa','functional']),
(8, null, 'National Breastfeeding Month', 'Lactation, postpartum.', array['obgyn']),
(8, null, 'Psoriasis Awareness Month', 'Inflammation, skin.', array['medspa','functional']),
(8, null, 'Children''s Eye Health & Safety Month', 'Family wellness.', array['functional']),

-- September
(9, null, 'Polycystic Ovary Syndrome Awareness Month', 'PCOS, hormones, metabolic health.', array['obgyn','functional']),
(9, null, 'Menopause Awareness Month', 'Perimenopause, HRT, symptoms.', array['obgyn','functional','urogyn']),
(9, null, 'Ovarian Cancer Awareness Month', 'Screening, awareness.', array['obgyn']),
(9, null, 'Prostate Cancer Awareness Month', 'Men''s health.', array['functional']),
(9, null, 'National Suicide Prevention Month', 'Mental health support.', array['obgyn','medspa','functional','urogyn']),
(9, null, 'Self-Improvement Month', 'Goal setting, fresh start.', array['obgyn','medspa','functional','urogyn']),
(9, null, 'Healthy Aging Month', 'Longevity, hormones, skin, bones.', array['medspa','functional','obgyn','urogyn']),
(9, 1, 'Labor Day', 'Holiday weekend.', array['obgyn','medspa','functional','urogyn']),

-- October
(10, null, 'Breast Cancer Awareness Month', 'Screening, prevention, support.', array['obgyn','medspa','functional','urogyn']),
(10, null, 'National Physical Therapy Month', 'Pelvic floor, posture.', array['urogyn','functional']),
(10, null, 'National Bullying Prevention Month', 'Mental health adjacency.', array['obgyn','medspa','functional','urogyn']),
(10, null, 'Health Literacy Month', 'Education-forward content.', array['obgyn','medspa','functional','urogyn']),
(10, null, 'Pregnancy & Infant Loss Awareness Month', 'Sensitive support.', array['obgyn']),
(10, 31, 'Halloween', 'Light seasonal hook.', array['medspa','obgyn']),

-- November
(11, null, 'National Healthy Skin Month', 'Skincare routines, fall/winter prep.', array['medspa']),
(11, null, 'Diabetes Awareness Month', 'Blood sugar, metabolic health.', array['functional','obgyn']),
(11, null, 'Lung Cancer Awareness Month', 'General awareness.', array['functional']),
(11, null, 'Bladder Health Awareness Month', 'Incontinence, urgency.', array['urogyn']),
(11, null, 'COPD Awareness Month', 'Respiratory health.', array['functional']),
(11, 13, 'World Kindness Day', 'Soft community hook.', array['obgyn','medspa','functional','urogyn']),
(11, 19, 'National Botox Day', 'Aesthetic feature day.', array['medspa']),
(11, 27, 'Thanksgiving', 'Gratitude, family, gift cards.', array['obgyn','medspa','functional','urogyn']),

-- December
(12, null, 'National Handwashing Awareness Week', 'Cold/flu, infection prevention.', array['obgyn','medspa','functional','urogyn']),
(12, null, 'Safe Toys & Gifts Month', 'Family-themed.', array['obgyn']),
(12, 25, 'Christmas', 'Holiday season hook.', array['obgyn','medspa','functional','urogyn']),
(12, 31, 'New Year''s Eve', 'Year-end reflection, gift cards.', array['obgyn','medspa','functional','urogyn']);
