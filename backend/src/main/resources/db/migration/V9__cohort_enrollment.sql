
-- V9: Cohort Enrollment Migration
-- Hajara Ilm Academy

-- 1. Create academy batches table
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

    CONSTRAINT fk_batch_course
        FOREIGN KEY (course_id)
        REFERENCES portal_courses(id)
);

-- 2. Add batch ID to enrollments
ALTER TABLE portal_enrollments
    ADD COLUMN batch_id BIGINT NULL;

-- 3. Add batch foreign key separately
ALTER TABLE portal_enrollments
    ADD CONSTRAINT fk_enrollment_batch
    FOREIGN KEY (batch_id)
    REFERENCES academy_batches(id);

-- 4. Add student number without UNIQUE
ALTER TABLE portal_users
    ADD COLUMN student_number VARCHAR(30) NULL;

-- 5. Create UNIQUE constraint separately
ALTER TABLE portal_users
    ADD CONSTRAINT uq_portal_users_student_number
    UNIQUE (student_number);
