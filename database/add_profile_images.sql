ALTER TABLE users
  ADD COLUMN profile_image VARCHAR(500) NULL AFTER email;

ALTER TABLE students
  ADD COLUMN profile_image VARCHAR(500) NULL AFTER status;
