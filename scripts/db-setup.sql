-- ── Database Setup ──────────────────────────────────────────────────────
-- Creates users, roles, extensions, and grants for Lazynext PostgreSQL.
-- Run: psql -h localhost -U postgres -d lazynext -f scripts/db-setup.sql
--
-- Production: Run once during initial database provisioning.

-- ── Extensions ────────────────────────────────────────────────────────────

-- UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Full-text search for blog, changelog, project search
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Vector embeddings for AI-powered similarity search (semantic clip tagging)
CREATE EXTENSION IF NOT EXISTS "vector";

-- Cryptography helpers for token hashing
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Table statistics for query optimization
-- (pg_stat_statements must be enabled in postgresql.conf: shared_preload_libraries)
-- CREATE EXTENSION IF NOT EXISTS "pg_stat_statements";

-- ── Application Roles ─────────────────────────────────────────────────────

-- Read-only role for analytics and reporting queries
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'lazynext_readonly') THEN
        CREATE ROLE lazynext_readonly WITH LOGIN PASSWORD 'CHANGE_ME_READONLY_PASSWORD';
    END IF;
END $$;

-- Render worker role — limited to render-related tables only
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'lazynext_render') THEN
        CREATE ROLE lazynext_render WITH LOGIN PASSWORD 'CHANGE_ME_RENDER_PASSWORD';
    END IF;
END $$;

-- AI agent role — access to transcription + AI metadata tables
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'lazynext_ai') THEN
        CREATE ROLE lazynext_ai WITH LOGIN PASSWORD 'CHANGE_ME_AI_PASSWORD';
    END IF;
END $$;

-- ── Schema Grants ─────────────────────────────────────────────────────────

-- Default: grant all to the main application user
GRANT ALL PRIVILEGES ON DATABASE lazynext TO lazynext_app;
GRANT ALL ON SCHEMA public TO lazynext_app;

-- Read-only user: SELECT on all tables
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO lazynext_readonly;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON SEQUENCES TO lazynext_readonly;
GRANT CONNECT ON DATABASE lazynext TO lazynext_readonly;
GRANT USAGE ON SCHEMA public TO lazynext_readonly;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO lazynext_readonly;

-- Render user: specific table access
GRANT CONNECT ON DATABASE lazynext TO lazynext_render;
GRANT USAGE ON SCHEMA public TO lazynext_render;

-- AI user: specific table access
GRANT CONNECT ON DATABASE lazynext TO lazynext_ai;
GRANT USAGE ON SCHEMA public TO lazynext_ai;

-- ── Performance Tuning ────────────────────────────────────────────────────

-- Auto-explain slow queries in development
-- ALTER SYSTEM SET auto_explain.log_min_duration = 1000;  -- 1 second
-- ALTER SYSTEM SET auto_explain.log_analyze = on;
-- SELECT pg_reload_conf();

-- Increase work_mem for sort-heavy operations (render queue ordering)
ALTER DATABASE lazynext SET work_mem = '32MB';

-- ── Verify ─────────────────────────────────────────────────────────────────

SELECT
    extname AS extension,
    extversion AS version
FROM pg_extension
WHERE extname IN ('uuid-ossp', 'pg_trgm', 'vector', 'pgcrypto')
ORDER BY extname;

SELECT
    rolname AS role,
    rolsuper AS superuser,
    rolcanlogin AS can_login
FROM pg_roles
WHERE rolname LIKE 'lazynext_%'
ORDER BY rolname;
