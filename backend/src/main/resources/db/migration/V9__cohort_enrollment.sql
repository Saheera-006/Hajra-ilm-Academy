CREATE TABLE academy_batches (
 id BIGINT PRIMARY KEY AUTO_INCREMENT,
 course_id BIGINT NOT NULL,
 name VARCHAR(150) NOT NULL,
 enrollment_opens_at DATETIME(6) NOT NULL,
 enrollment_closes_at DATETIME(6) NOT NULL,
 classes_start_at DATETIME(6) NOT NULL,
 classes_end_at DATETIME(6) NOT NULL,
 status VARCHAR(20) NOT NULL DEFAULT 'DRAFT',
 created_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
 CONSTRAINT fk_batch_course FOREIGN KEY(course_id) REFERENCES portal_courses(id)
);
ALTER TABLE portal_enrollments ADD COLUMN batch_id BIGINT NULL,
 ADD CONSTRAINT fk_enrollment_batch FOREIGN KEY(batch_id) REFERENCES academy_batches(id);
ALTER TABLE portal_users ADD COLUMN student_number VARCHAR(30) NULL UNIQUE;
