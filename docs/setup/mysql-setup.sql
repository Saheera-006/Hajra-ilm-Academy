-- Run once as your MySQL admin user (e.g. root). Replace the placeholder password
-- with a NEW strong one before running. Never commit the real password.
CREATE USER IF NOT EXISTS 'hajara_app'@'localhost' IDENTIFIED BY 'CHANGE_ME_STRONG_PASSWORD';

-- Development: Flyway runs as this user, so it needs DDL rights on this one database only.
-- Production: use a separate migration user, and give the app user only SELECT/INSERT/UPDATE/DELETE.
GRANT SELECT, INSERT, UPDATE, DELETE, CREATE, ALTER, DROP, INDEX, REFERENCES
  ON hajara_academy.* TO 'hajara_app'@'localhost';
FLUSH PRIVILEGES;
