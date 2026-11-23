-- Hashed, individually revocable persistent student login credentials.
CREATE TABLE student_remembered_devices (
 token_hash CHAR(64) PRIMARY KEY,
 user_id BIGINT NOT NULL,
 password_fingerprint CHAR(64) NOT NULL,
 expires_at TIMESTAMP(6) NOT NULL,
 FOREIGN KEY (user_id) REFERENCES portal_users(id) ON DELETE CASCADE
);
CREATE INDEX idx_student_remembered_user ON student_remembered_devices(user_id);
