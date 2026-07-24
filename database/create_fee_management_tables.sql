-- Database Migration & Seed Script for Configurable Fee Management System

-- 1. Academy Master
CREATE TABLE IF NOT EXISTS academy_master (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(150) NOT NULL UNIQUE,
  description TEXT NULL DEFAULT NULL,
  status ENUM('active', 'inactive') NOT NULL DEFAULT 'active',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- 2. Grade Level Master
CREATE TABLE IF NOT EXISTS grade_level_master (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  academy_id BIGINT UNSIGNED NULL DEFAULT NULL, -- NULL means applicable to all academies
  grade_name VARCHAR(100) NOT NULL,
  display_order INT NOT NULL DEFAULT 1,
  status ENUM('active', 'inactive') NOT NULL DEFAULT 'active',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_grade_academy (academy_id)
);

-- 3. Fee Component Master
CREATE TABLE IF NOT EXISTS fee_component_master (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  component_name VARCHAR(150) NOT NULL UNIQUE,
  component_type ENUM('Tuition', 'Enrollment', 'ReEnrollment', 'Technology', 'Textbook', 'Miscellaneous') NOT NULL,
  frequency ENUM('One Time', 'Monthly', 'Annual') NOT NULL DEFAULT 'Monthly',
  status ENUM('active', 'inactive') NOT NULL DEFAULT 'active',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- 4. Re-create / Upgrade Fee Plan Master to support student_type
DROP TABLE IF EXISTS fee_plan_items;
DROP TABLE IF EXISTS fee_plan_master;

CREATE TABLE IF NOT EXISTS fee_plan_master (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  academy_id BIGINT UNSIGNED NOT NULL,
  student_type ENUM('new', 'returning', 'all') NOT NULL DEFAULT 'all',
  plan_name VARCHAR(255) NOT NULL,
  currency VARCHAR(10) NOT NULL DEFAULT 'USD',
  status ENUM('active', 'inactive') NOT NULL DEFAULT 'active',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_plan_academy_type (academy_id, student_type)
);

-- 5. Fee Plan Items
CREATE TABLE IF NOT EXISTS fee_plan_items (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  fee_plan_id BIGINT UNSIGNED NOT NULL,
  fee_component_id BIGINT UNSIGNED NOT NULL,
  amount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  is_required BOOLEAN NOT NULL DEFAULT TRUE,
  display_order INT NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_items_plan (fee_plan_id),
  INDEX idx_items_component (fee_component_id),
  CONSTRAINT fk_fee_items_master_plan
    FOREIGN KEY (fee_plan_id)
    REFERENCES fee_plan_master(id)
    ON DELETE CASCADE,
  CONSTRAINT fk_fee_items_component
    FOREIGN KEY (fee_component_id)
    REFERENCES fee_component_master(id)
    ON DELETE CASCADE
);

-- 6. Discount Master
CREATE TABLE IF NOT EXISTS discount_master (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  discount_name VARCHAR(150) NOT NULL,
  discount_type ENUM('percentage', 'fixed') NOT NULL DEFAULT 'percentage',
  value DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  applicable_component VARCHAR(100) NOT NULL DEFAULT 'Tuition',
  academy_id BIGINT UNSIGNED NULL DEFAULT NULL,
  grade_level_id BIGINT UNSIGNED NULL DEFAULT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- 7. Add calculation_snapshot JSON column to student_invoice table
SET @dbname = DATABASE();
SET @tablename = "student_invoice";
SET @columnname = "calculation_snapshot";
SET @prestatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = @dbname
    AND TABLE_NAME = @tablename
    AND COLUMN_NAME = @columnname
  ) > 0,
  "SELECT 1",
  "ALTER TABLE student_invoice ADD COLUMN calculation_snapshot JSON NULL AFTER invoice_status;"
));
PREPARE alterIfNotExists FROM @prestatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- --- SEED INITIAL MASTER DATA ---

-- Seed Academies
INSERT INTO academy_master (id, name, description, status) VALUES
(1, 'Global Academy', 'Secular, Quran, Islamic, and Arabic Studies', 'active'),
(2, 'Religious Academy', 'Quran, Islamic, and Arabic Studies', 'active')
ON DUPLICATE KEY UPDATE name = VALUES(name), description = VALUES(description);

-- Seed Grade Levels
INSERT INTO grade_level_master (id, academy_id, grade_name, display_order, status) VALUES
(1, NULL, 'Pre-K', 1, 'active'),
(2, NULL, 'Kindergarten', 2, 'active'),
(3, NULL, '1st Grade', 3, 'active'),
(4, NULL, '2nd Grade', 4, 'active'),
(5, NULL, '3rd Grade', 5, 'active'),
(6, NULL, '4th Grade', 6, 'active')
ON DUPLICATE KEY UPDATE grade_name = VALUES(grade_name);

-- Seed Fee Components
INSERT INTO fee_component_master (id, component_name, component_type, frequency, status) VALUES
(1, 'Tuition Fee', 'Tuition', 'Monthly', 'active'),
(2, 'Enrollment Fee', 'Enrollment', 'One Time', 'active'),
(3, 'Re-Enrollment Fee', 'ReEnrollment', 'Annual', 'active'),
(4, 'Technology Fee', 'Technology', 'Annual', 'active'),
(5, 'Textbook Fee', 'Textbook', 'Annual', 'active'),
(6, 'Miscellaneous Fee', 'Miscellaneous', 'One Time', 'active')
ON DUPLICATE KEY UPDATE component_name = VALUES(component_name);

-- Seed Fee Plans
-- Plan 1: Global Academy - New Student
INSERT INTO fee_plan_master (id, academy_id, student_type, plan_name, currency, status) VALUES
(1, 1, 'new', 'Global Academy - New Student Plan', 'USD', 'active'),
-- Plan 2: Global Academy - Returning Student
(2, 1, 'returning', 'Global Academy - Returning Student Plan', 'USD', 'active'),
-- Plan 3: Religious Academy - New Student
(3, 2, 'new', 'Religious Academy - New Student Plan', 'USD', 'active'),
-- Plan 4: Religious Academy - Returning Student
(4, 2, 'returning', 'Religious Academy - Returning Student Plan', 'USD', 'active')
ON DUPLICATE KEY UPDATE plan_name = VALUES(plan_name);

-- Seed Fee Plan Items
-- Plan 1 (Global New): Tuition ($350), Enrollment ($150), Technology ($200)
INSERT INTO fee_plan_items (fee_plan_id, fee_component_id, amount, is_required, display_order) VALUES
(1, 1, 350.00, TRUE, 1),
(1, 2, 150.00, TRUE, 2),
(1, 4, 200.00, TRUE, 3);

-- Plan 2 (Global Returning): Tuition ($350), Re-Enrollment ($75), Technology ($200)
INSERT INTO fee_plan_items (fee_plan_id, fee_component_id, amount, is_required, display_order) VALUES
(2, 1, 350.00, TRUE, 1),
(2, 3, 75.00, TRUE, 2),
(2, 4, 200.00, TRUE, 3);

-- Plan 3 (Religious New): Tuition ($250), Enrollment ($150) [No Tech Fee]
INSERT INTO fee_plan_items (fee_plan_id, fee_component_id, amount, is_required, display_order) VALUES
(3, 1, 250.00, TRUE, 1),
(3, 2, 150.00, TRUE, 2);

-- Plan 4 (Religious Returning): Tuition ($250), Re-Enrollment ($75) [No Tech Fee]
INSERT INTO fee_plan_items (fee_plan_id, fee_component_id, amount, is_required, display_order) VALUES
(4, 1, 250.00, TRUE, 1),
(4, 3, 75.00, TRUE, 2);

-- Seed Discounts
INSERT INTO discount_master (id, discount_name, discount_type, value, applicable_component, is_active) VALUES
(1, 'Full Tuition Payment Discount', 'percentage', 10.00, 'Tuition', TRUE),
(2, 'Sibling Discount', 'percentage', 10.00, 'Tuition', TRUE)
ON DUPLICATE KEY UPDATE discount_name = VALUES(discount_name);
