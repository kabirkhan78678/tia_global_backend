ALTER TABLE users
ADD COLUMN approval_status ENUM('pending', 'approved', 'rejected')
NOT NULL DEFAULT 'pending' AFTER password;

UPDATE users
SET approval_status = 'approved'
WHERE approval_status = 'pending';
