ALTER TABLE portal_announcements
    ADD COLUMN batch_id BIGINT NULL,
    ADD CONSTRAINT fk_portal_announcement_batch FOREIGN KEY (batch_id) REFERENCES academy_batches(id);

ALTER TABLE academy_notifications
    ADD COLUMN batch_id BIGINT NULL,
    ADD CONSTRAINT fk_academy_notification_batch FOREIGN KEY (batch_id) REFERENCES academy_batches(id);

UPDATE portal_courses
SET title = 'Islamic Learning Programme · இஸ்லாமியக் கல்விப் பாடத்திட்டம்'
WHERE title = 'Quran Learning' OR id IN (SELECT course_id FROM academy_batches);
