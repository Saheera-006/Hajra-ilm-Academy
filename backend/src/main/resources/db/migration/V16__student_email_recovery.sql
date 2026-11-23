ALTER TABLE portal_users
    MODIFY phone VARCHAR(25) NULL,
    ADD COLUMN email_verified BOOLEAN NOT NULL DEFAULT FALSE;

DELETE FROM student_password_resets;
ALTER TABLE student_password_resets MODIFY otp_hash VARCHAR(255) NOT NULL;
