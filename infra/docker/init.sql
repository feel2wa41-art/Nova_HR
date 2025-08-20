-- Initial database setup for Nova HR
-- This script runs when PostgreSQL container starts for the first time

-- Create additional databases if needed
-- CREATE DATABASE nova_hr_test;

-- Create extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
-- CREATE EXTENSION IF NOT EXISTS "postgis" SCHEMA public;

-- Create initial roles and permissions
-- (Prisma will handle table creation)

-- Log the initialization
-- INSERT INTO pg_stat_statements_info (dealloc) VALUES (0)
-- ON CONFLICT DO NOTHING;