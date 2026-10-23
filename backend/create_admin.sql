-- Replace the example values with the intended admin account before running.
INSERT INTO users (username, email, role) VALUES ('admin', 'admin@example.com', 'admin');

-- Verify
SELECT id, username, email, role FROM users;
