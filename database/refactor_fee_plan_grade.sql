-- Migration to remove grade_level_id from fee_plan_master

-- 1. Drop indices/foreign keys if they exist
ALTER TABLE fee_plan_master DROP INDEX idx_plan_academy_grade_type;

-- 2. Drop grade_level_id column
ALTER TABLE fee_plan_master DROP COLUMN grade_level_id;

-- 3. Add clean simplified index for academy and student_type
ALTER TABLE fee_plan_master ADD INDEX idx_plan_academy_type (academy_id, student_type);
