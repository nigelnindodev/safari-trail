-- Create langfuse database
CREATE DATABASE IF NOT EXISTS langfuse;

-- Create user (if not exists)
CREATE USER IF NOT EXISTS 'langfuse' IDENTIFIED BY 'langfuse_password';

-- Grant privileges
GRANT ALL PRIVILEGES ON langfuse.* TO 'langfuse';
