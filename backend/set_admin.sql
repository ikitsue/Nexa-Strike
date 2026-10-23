-- Script to set user as admin after registration
-- Run this after you've registered your account

-- Find your user and set role to admin
UPDATE users SET role = 'admin' WHERE email = 'votre_email@example.com';

-- Verify:
SELECT id, email, username, role FROM users;
