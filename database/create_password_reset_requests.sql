CREATE TABLE IF NOT EXISTS password_reset_requests (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT NOT NULL,
  email VARCHAR(150) NOT NULL,
  token VARCHAR(128) NOT NULL UNIQUE,
  status ENUM('pending', 'approved', 'used', 'expired') NOT NULL DEFAULT 'pending',
  approved_at TIMESTAMP NULL DEFAULT NULL,
  used_at TIMESTAMP NULL DEFAULT NULL,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_password_reset_requests_token (token),
  INDEX idx_password_reset_requests_user_status (user_id, status)
);
