ALTER TABLE students
  ADD COLUMN is_first_login TINYINT(1) NOT NULL DEFAULT 1 AFTER status,
  ADD COLUMN first_login_at DATETIME NULL AFTER is_first_login,
  ADD COLUMN is_password_generated TINYINT(1) NOT NULL DEFAULT 0 AFTER first_login_at;
