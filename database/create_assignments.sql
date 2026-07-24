-- Database migration for Assignment & Grading System

CREATE TABLE IF NOT EXISTS assignments (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  teacher_id BIGINT UNSIGNED NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT NULL,
  grade_level VARCHAR(50) NOT NULL,
  subject VARCHAR(100) NULL DEFAULT NULL,
  due_date DATETIME NULL DEFAULT NULL,
  total_points INT UNSIGNED NOT NULL DEFAULT 100,
  attachment_url VARCHAR(500) NULL DEFAULT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_assignments_teacher_id (teacher_id),
  INDEX idx_assignments_grade_level (grade_level),
  INDEX idx_assignments_due_date (due_date)
);

CREATE TABLE IF NOT EXISTS assignment_submissions (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  assignment_id BIGINT UNSIGNED NOT NULL,
  student_id BIGINT UNSIGNED NOT NULL,
  submission_text TEXT NULL DEFAULT NULL,
  attachment_url VARCHAR(500) NULL DEFAULT NULL,
  submitted_at DATETIME NULL DEFAULT NULL,
  status ENUM('pending', 'submitted', 'graded') NOT NULL DEFAULT 'pending',
  marks_obtained DECIMAL(5,2) NULL DEFAULT NULL,
  grade VARCHAR(20) NULL DEFAULT NULL,
  feedback TEXT NULL DEFAULT NULL,
  graded_at DATETIME NULL DEFAULT NULL,
  graded_by BIGINT UNSIGNED NULL DEFAULT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_assignment_student (assignment_id, student_id),
  INDEX idx_submissions_assignment_id (assignment_id),
  INDEX idx_submissions_student_id (student_id),
  INDEX idx_submissions_status (status),
  CONSTRAINT fk_submissions_assignment
    FOREIGN KEY (assignment_id)
    REFERENCES assignments(id)
    ON DELETE CASCADE
);
