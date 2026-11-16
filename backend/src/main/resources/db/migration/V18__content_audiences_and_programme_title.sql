
-- V18: Announcement audiences and official programme title
-- TiDB-compatible migration

-- 1. Add batch ID to portal announcements
ALTER TABLE portal_announcements
    ADD COLUMN batch_id BIGINT NULL;

-- 2. Add foreign key separately
ALTER TABLE portal_announcements
    ADD CONSTRAINT fk_portal_announcement_batch
    FOREIGN KEY (batch_id)
    REFERENCES academy_batches(id);

-- 3. Add batch ID to academy notifications
ALTER TABLE academy_notifications
    ADD COLUMN batch_id BIGINT NULL;

-- 4. Add foreign key separately
ALTER TABLE academy_notifications
    ADD CONSTRAINT fk_academy_notification_batch
    FOREIGN KEY (batch_id)
    REFERENCES academy_batches(id);

-- 5. Update the official programme title
UPDATE portal_courses
SET title = 'Islamic Learning Programme · இஸ்லாமியக் கல்விப் பாடத்திட்டம்'
WHERE title = 'Quran Learning'
   OR id IN (
       SELECT course_id
       FROM academy_batches
   );
