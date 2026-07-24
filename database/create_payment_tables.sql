-- Migration script for Enterprise Payment & Invoice Module

CREATE TABLE IF NOT EXISTS fee_plan_master (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  academy_id VARCHAR(100) NOT NULL, -- e.g., 'Global Academy', 'Religious Academy' or ID
  grade_level VARCHAR(50) NOT NULL, -- e.g., '1st Grade', 'Pre-K'
  plan_name VARCHAR(150) NOT NULL,
  currency VARCHAR(10) NOT NULL DEFAULT 'USD',
  total_amount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  status ENUM('active', 'inactive') NOT NULL DEFAULT 'active',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_fee_plan_academy_grade (academy_id, grade_level),
  INDEX idx_fee_plan_status (status)
);

CREATE TABLE IF NOT EXISTS fee_plan_items (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  fee_plan_id BIGINT UNSIGNED NOT NULL,
  component_name VARCHAR(150) NOT NULL, -- e.g., 'Tuition', 'Books', 'Registration'
  amount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  display_order INT NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_fee_plan_items_plan (fee_plan_id),
  CONSTRAINT fk_fee_items_plan
    FOREIGN KEY (fee_plan_id)
    REFERENCES fee_plan_master(id)
    ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS student_invoice (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  invoice_number VARCHAR(100) NOT NULL UNIQUE,
  student_id BIGINT UNSIGNED NOT NULL,
  parent_id BIGINT UNSIGNED NOT NULL,
  academy_id VARCHAR(100) NULL DEFAULT NULL,
  fee_plan_id BIGINT UNSIGNED NULL DEFAULT NULL,
  subtotal DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  discount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  tax DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  grand_total DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  currency VARCHAR(10) NOT NULL DEFAULT 'USD',
  invoice_status ENUM('pending', 'paid', 'cancelled', 'expired') NOT NULL DEFAULT 'pending',
  generated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  due_date DATETIME NULL DEFAULT NULL,
  paid_at DATETIME NULL DEFAULT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_invoice_student (student_id),
  INDEX idx_invoice_parent (parent_id),
  INDEX idx_invoice_status (invoice_status),
  INDEX idx_invoice_number (invoice_number)
);

CREATE TABLE IF NOT EXISTS student_invoice_items (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  invoice_id BIGINT UNSIGNED NOT NULL,
  item_name VARCHAR(150) NOT NULL,
  amount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  quantity INT UNSIGNED NOT NULL DEFAULT 1,
  total DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_invoice_items_invoice (invoice_id),
  CONSTRAINT fk_invoice_items_invoice
    FOREIGN KEY (invoice_id)
    REFERENCES student_invoice(id)
    ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS payment_transactions (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  invoice_id BIGINT UNSIGNED NOT NULL,
  student_id BIGINT UNSIGNED NOT NULL,
  parent_id BIGINT UNSIGNED NOT NULL,
  provider ENUM('manual', 'stripe', 'paypal', 'razorpay') NOT NULL DEFAULT 'manual',
  transaction_reference VARCHAR(255) NULL DEFAULT NULL,
  payment_status ENUM('pending', 'processing', 'success', 'failed', 'refunded') NOT NULL DEFAULT 'pending',
  amount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  currency VARCHAR(10) NOT NULL DEFAULT 'USD',
  payment_date DATETIME NULL DEFAULT NULL,
  gateway_response JSON NULL DEFAULT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_trans_invoice (invoice_id),
  INDEX idx_trans_student (student_id),
  INDEX idx_trans_parent (parent_id),
  INDEX idx_trans_status (payment_status),
  CONSTRAINT fk_trans_invoice
    FOREIGN KEY (invoice_id)
    REFERENCES student_invoice(id)
    ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS payment_provider_settings (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  provider VARCHAR(50) NOT NULL UNIQUE, -- e.g., 'manual', 'stripe', 'paypal', 'razorpay'
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  configuration_json JSON NULL DEFAULT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Seed default manual payment provider setting
INSERT INTO payment_provider_settings (provider, enabled, configuration_json)
VALUES ('manual', TRUE, '{"mode": "manual", "auto_confirm": false}')
ON DUPLICATE KEY UPDATE enabled = VALUES(enabled);
