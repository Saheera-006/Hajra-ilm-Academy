-- Uploaded PDFs remain in TiDB; Render's ephemeral filesystem is never used.
CREATE TABLE academy_certificate_manual_drafts (
 id BIGINT PRIMARY KEY AUTO_INCREMENT,
 enrollment_id BIGINT NOT NULL UNIQUE,
 certificate_code VARCHAR(80) NOT NULL UNIQUE,
 student_name VARCHAR(180) NOT NULL,
 completion_date DATE NOT NULL,
 pdf_data MEDIUMBLOB NOT NULL,
 created_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
 CONSTRAINT fk_manual_draft_enrollment FOREIGN KEY(enrollment_id) REFERENCES portal_enrollments(id)
);
CREATE TABLE academy_certificate_uploaded_pdfs (
 certificate_id BIGINT PRIMARY KEY,
 pdf_data MEDIUMBLOB NOT NULL,
 CONSTRAINT fk_uploaded_certificate FOREIGN KEY(certificate_id) REFERENCES academy_certificates(id)
);
