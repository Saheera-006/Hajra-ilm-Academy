-- Optional display fields for the teacher profile and course card. All editable in the CMS later.
ALTER TABLE course
  ADD COLUMN title_ar VARCHAR(200) NULL,
  ADD COLUMN level VARCHAR(60) NULL,
  ADD COLUMN short_description VARCHAR(300) NULL,
  ADD COLUMN short_description_ta VARCHAR(300) NULL,
  ADD COLUMN image_url VARCHAR(500) NULL;

UPDATE course SET level = 'Beginner' WHERE level IS NULL;

-- Designations are one per line as "English | Arabic".
INSERT IGNORE INTO site_content (content_key, label, content_group, content_value_en) VALUES
 ('teacher.name','Teacher name (shown only if filled in)','teacher',NULL),
 ('teacher.photo_url','Teacher photo URL (https only)','teacher',NULL),
 ('teacher.designations','Designations, one per line as: English | Arabic','teacher','Muallama | مُعَلِّمَة\nMuballigha | مُبَلِّغَة'),
 ('teacher.specialization','Specialization','teacher',NULL),
 ('teacher.bio','Short biography','teacher',NULL);

-- Muallama and Muballigha now live in designations; keep only the qualification here (if untouched).
UPDATE site_content SET content_value_en = 'Certified Aalima'
 WHERE content_key = 'teacher.qualifications'
   AND content_value_en = 'Certified Aalima\nMuallama\nMuballiga';
