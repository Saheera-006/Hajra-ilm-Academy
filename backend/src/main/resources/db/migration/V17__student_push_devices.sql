CREATE TABLE student_push_devices (
    token VARCHAR(512) CHARACTER SET ascii COLLATE ascii_bin PRIMARY KEY,
    user_id BIGINT NOT NULL,
    INDEX (user_id),
    FOREIGN KEY (user_id) REFERENCES portal_users(id) ON DELETE CASCADE
);
