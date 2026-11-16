
-- V11: Batch management, student IDs, one-open-batch guard,
-- and attendance audit trail.

-- 1. Optional batch dates
ALTER TABLE academy_batches
  MODIFY COLUMN enrollment_closes_at DATETIME(6) NULL;

ALTER TABLE academy_batches
  MODIFY COLUMN classes_start_at DATETIME(6) NULL;

ALTER TABLE academy_batches
  MODIFY COLUMN classes_end_at DATETIME(6) NULL;

ALTER TABLE academy_batches
  ADD COLUMN batch_number INT NULL;

ALTER TABLE academy_batches
  ADD COLUMN whatsapp_link VARCHAR(500) NULL;

ALTER TABLE academy_batches
  ADD COLUMN next_roll INT NOT NULL DEFAULT 1;

UPDATE academy_batches
SET enrollment_closes_at = NULL
WHERE YEAR(enrollment_closes_at) = 2099;

UPDATE academy_batches
SET classes_start_at = NULL
WHERE YEAR(classes_start_at) = 2099;

UPDATE academy_batches
SET classes_end_at = NULL
WHERE YEAR(classes_end_at) = 2099;

-- 2. Sequential batch numbers
UPDATE academy_batches b
JOIN (
    SELECT
        id,
        ROW_NUMBER() OVER (
            ORDER BY created_at, id
        ) AS rn
    FROM academy_batches
) x ON x.id = b.id
SET b.batch_number = x.rn;

ALTER TABLE academy_batches
  MODIFY COLUMN batch_number INT NOT NULL;

ALTER TABLE academy_batches
  ADD UNIQUE KEY uq_batch_number (batch_number);

-- 3. Ensure at most one OPEN batch
-- Preserve the newest open batch and close older ones.

UPDATE academy_batches
SET status = 'CLOSED'
WHERE status = 'OPEN'
  AND id <> (
      SELECT mx
      FROM (
          SELECT MAX(id) AS mx
          FROM academy_batches
          WHERE status = 'OPEN'
      ) t
  );

-- TiDB: use VIRTUAL instead of STORED.
-- Verify support for indexing this generated column.

ALTER TABLE academy_batches
  ADD COLUMN open_flag TINYINT
  GENERATED ALWAYS AS (
      CASE
          WHEN status = 'OPEN' THEN 1
          ELSE NULL
      END
  ) VIRTUAL;

ALTER TABLE academy_batches
  ADD UNIQUE KEY uq_single_open_batch (open_flag);

-- 4. Preserve legacy student IDs
ALTER TABLE portal_users
  ADD COLUMN legacy_student_number VARCHAR(30) NULL;

UPDATE portal_users
SET legacy_student_number = student_number
WHERE student_number IS NOT NULL;

-- Generate HIA + YYYY + BB + RRR
UPDATE portal_users u
JOIN (
    SELECT
        e.user_id,
        e.batch_id,
        YEAR(e.created_at) AS yr,
        ROW_NUMBER() OVER (
            PARTITION BY e.batch_id
            ORDER BY e.id
        ) AS roll
    FROM portal_enrollments e
    JOIN (
        SELECT
            user_id,
            MAX(id) AS mid
        FROM portal_enrollments
        WHERE batch_id IS NOT NULL
        GROUP BY user_id
    ) m ON m.mid = e.id
    JOIN portal_users pu
      ON pu.id = e.user_id
     AND pu.student_number IS NOT NULL
) x ON x.user_id = u.id
JOIN academy_batches b
  ON b.id = x.batch_id
SET u.student_number = CONCAT(
    'HIA',
    x.yr,
    LPAD(b.batch_number, 2, '0'),
    LPAD(x.roll, 3, '0')
)
WHERE u.role = 'STUDENT';

-- 5. Initialize batch roll counters
UPDATE academy_batches b
SET next_roll = 1 + (
    SELECT COUNT(*)
    FROM portal_enrollments e
    WHERE e.batch_id = b.id
);

-- 6. Attendance audit trail
ALTER TABLE portal_attendance
  ADD COLUMN marked_by BIGINT NULL;

ALTER TABLE portal_attendance
  ADD COLUMN updated_at TIMESTAMP(6) NULL;

CREATE TABLE portal_attendance_audit (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    enrollment_id BIGINT NOT NULL,
    class_date DATE NOT NULL,
    old_status VARCHAR(20) NULL,
    new_status VARCHAR(20) NOT NULL,
    changed_by BIGINT NOT NULL,
    changed_at TIMESTAMP(6) NOT NULL
        DEFAULT CURRENT_TIMESTAMP(6),
    KEY idx_att_audit_enrollment (
        enrollment_id,
        class_date
    )
);
