-- Create database if not exists
SELECT 'CREATE DATABASE nova_hr'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'nova_hr')\gexec

-- Grant privileges
GRANT ALL PRIVILEGES ON DATABASE nova_hr TO postgres;