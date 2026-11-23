-- Persistent account lockout, TOTP replay protection and one-time admin recovery codes.
ALTER TABLE portal_users
  ADD COLUMN failed_attempts INT NOT NULL DEFAULT 0,
  ADD COLUMN locked_until TIMESTAMP NULL DEFAULT NULL,
  ADD COLUMN mfa_last_step BIGINT NULL;

-- One enrollment per student per course (also prevents duplicates from double-clicks).
ALTER TABLE portal_enrollments
  ADD CONSTRAINT uq_enrollment_user_course UNIQUE (user_id, course_id);

CREATE TABLE admin_recovery_codes (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  user_id BIGINT NOT NULL,
  code_hash CHAR(64) NOT NULL,
  used_at TIMESTAMP NULL DEFAULT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_recovery_user_hash (user_id, code_hash),
  CONSTRAINT fk_recovery_user FOREIGN KEY (user_id) REFERENCES portal_users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE INDEX idx_admin_audit_time ON admin_audit_log (event_time);
