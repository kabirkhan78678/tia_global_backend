ALTER TABLE students
  ADD COLUMN email VARCHAR(255) NULL AFTER grade_level;

UPDATE students
SET email = CONCAT('student-', id, '@pending.local')
WHERE email IS NULL OR email = '';

ALTER TABLE students
  MODIFY COLUMN email VARCHAR(255) NOT NULL,
  MODIFY COLUMN password VARCHAR(255) NULL,
  ADD UNIQUE KEY uq_students_email (email);

ALTER TABLE students
  DROP COLUMN username;
