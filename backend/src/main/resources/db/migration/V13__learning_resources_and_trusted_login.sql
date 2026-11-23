-- Preserve legacy lesson content; administrators can reassign its learning area.
ALTER TABLE academy_lessons MODIFY course_id BIGINT NULL, ADD COLUMN learning_area VARCHAR(20) NOT NULL DEFAULT 'quran';
ALTER TABLE academy_notifications ADD COLUMN student_id VARCHAR(30) NULL;
CREATE TABLE academy_notes (
 id BIGINT PRIMARY KEY AUTO_INCREMENT, title VARCHAR(200) NOT NULL,
 batch_id BIGINT NULL, file_name VARCHAR(255) NOT NULL, media_type VARCHAR(120) NOT NULL,
 file_data LONGBLOB NOT NULL, created_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
 FOREIGN KEY(batch_id) REFERENCES academy_batches(id)
);
CREATE TABLE academy_meetings (
 id BIGINT PRIMARY KEY AUTO_INCREMENT, title VARCHAR(200) NOT NULL, meet_url VARCHAR(500) NOT NULL,
 batch_id BIGINT NULL, FOREIGN KEY(batch_id) REFERENCES academy_batches(id)
);
CREATE TABLE admin_trusted_devices (
 token_hash CHAR(64) PRIMARY KEY, user_id BIGINT NOT NULL, password_fingerprint CHAR(64) NOT NULL,
 expires_at TIMESTAMP(6) NOT NULL, FOREIGN KEY(user_id) REFERENCES portal_users(id) ON DELETE CASCADE
);
