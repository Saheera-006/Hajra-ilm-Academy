CREATE TABLE academy_certificate_drafts (
 id BIGINT PRIMARY KEY AUTO_INCREMENT,
 enrollment_id BIGINT NOT NULL UNIQUE,
 certificate_code VARCHAR(80) NOT NULL UNIQUE,
 student_name VARCHAR(180) NOT NULL,
 completion_date DATE NOT NULL,
 created_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
 updated_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
 CONSTRAINT fk_certificate_draft_enrollment FOREIGN KEY(enrollment_id) REFERENCES portal_enrollments(id)
);
ALTER TABLE academy_certificates ADD COLUMN display_name VARCHAR(180) NULL;
ALTER TABLE academy_certificates ADD COLUMN completion_date DATE NULL;
