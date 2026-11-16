CREATE TABLE student_password_resets (
    user_id BIGINT PRIMARY KEY,
    otp_hash VARCHAR(64) NOT NULL,
    expires_at TIMESTAMP(6) NOT NULL,
    requested_at TIMESTAMP(6) NOT NULL,
    attempts INT NOT NULL DEFAULT 0,
    CONSTRAINT fk_student_reset_user FOREIGN KEY (user_id) REFERENCES portal_users(id) ON DELETE CASCADE
);
