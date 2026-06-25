-- 1. Generate a bcrypt hash:
--    node -e "require('bcrypt').hash('Admin@123', 10).then(console.log)"
--
-- 2. Replace HASH_HERE with the generated hash before running this insert.
INSERT INTO admins (name, email, password, status)
VALUES ('Super Admin', 'admin@example.com', 'HASH_HERE', 'active');
