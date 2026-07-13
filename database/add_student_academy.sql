ALTER TABLE students
  ADD COLUMN academy ENUM('Global Academy', 'Religious Academy') NULL AFTER grade_level;
