-- Database Initialization Script for AdminReach


-- Create the Users Table
-- Stores credentials and user permissions
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,                                -- unique auto-incrementing identifier
    username VARCHAR(50) UNIQUE NOT NULL,                  -- username for login (must be unique)
    password_hash VARCHAR(255) NOT NULL,                   -- secure bcrypt hash of the password
    role VARCHAR(20) NOT NULL CHECK (role IN ('admin', 'user')) -- restricts roles to either 'admin' or 'user'
);





-- Create the Messages Table
-- Stores the chat history between users and admins
CREATE TABLE IF NOT EXISTS messages (
    id SERIAL PRIMARY KEY,                                -- unique message ID
    sender_id INT REFERENCES users(id) ON DELETE CASCADE,  -- link to the sender (deletes message if user is deleted)
    receiver_id INT REFERENCES users(id) ON DELETE CASCADE, -- link to the receiver
    content TEXT NOT NULL,                                 -- the actual message content
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,         -- automatic timestamp of when message was sent
    is_read BOOLEAN DEFAULT FALSE                          -- tracks if the message has been seen by the receiver
);





-- Seed Initial Data
-- Password for all seed users is: 'password123'
-- The hash was generated using bcrypt with 10 salt rounds

INSERT INTO users (username, password_hash, role) VALUES 
('admin1', '$2b$10$n6yoARjUhbpX/GTF9SAwzOaHm9hncqtYIAxzlDzr319IxZ0TIchom', 'admin'),
('user1', '$2b$10$n6yoARjUhbpX/GTF9SAwzOaHm9hncqtYIAxzlDzr319IxZ0TIchom', 'user'),
('user2', '$2b$10$n6yoARjUhbpX/GTF9SAwzOaHm9hncqtYIAxzlDzr319IxZ0TIchom', 'user')
ON CONFLICT (username) DO NOTHING;                        -- skips if the users already exist to prevent errors

