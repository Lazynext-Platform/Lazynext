-- ============================================================================
-- Lazynext Database Migration: Kysely → Drizzle Schema Consolidation
-- Version: 0001_dual_schema_consolidation
-- 
-- This migration consolidates the dual Kysely/Drizzle schemas into a unified
-- Drizzle ORM schema. Run with: bun run db:migrate
-- ============================================================================

-- ── Extensions ─────────────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ── User Table ─────────────────────────────────────────────────────────────
-- Unifies the Kysely 'users' and Drizzle 'user' tables
CREATE TABLE IF NOT EXISTS "user" (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) NOT NULL UNIQUE,
    name VARCHAR(255),
    email_verified BOOLEAN DEFAULT FALSE,
    image TEXT,
    role VARCHAR(50) DEFAULT 'user',
    dodo_customer_id VARCHAR(255),
    ai_credits INTEGER DEFAULT 50,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Migrate data from old 'users' table if it exists
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'users') THEN
        INSERT INTO "user" (id, email, name, email_verified, image, role, created_at, updated_at)
        SELECT 
            COALESCE(id, uuid_generate_v4()),
            email,
            name,
            COALESCE(email_verified, FALSE),
            image,
            COALESCE(role, 'user'),
            COALESCE(created_at, NOW()),
            COALESCE(updated_at, NOW())
        FROM users
        ON CONFLICT (email) DO UPDATE SET
            name = EXCLUDED.name,
            email_verified = EXCLUDED.email_verified,
            image = EXCLUDED.image,
            role = EXCLUDED.role,
            updated_at = NOW();
        
        -- Optionally drop old table after verification
        -- DROP TABLE IF EXISTS users;
    END IF;
END $$;

-- ── Session Table ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "session" (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
    token TEXT NOT NULL UNIQUE,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    ip_address VARCHAR(45),
    user_agent TEXT
);

CREATE INDEX IF NOT EXISTS idx_session_user_id ON "session"(user_id);
CREATE INDEX IF NOT EXISTS idx_session_token ON "session"(token);
CREATE INDEX IF NOT EXISTS idx_session_expires ON "session"(expires_at);

-- ── Account Table (OAuth providers) ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "account" (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
    provider VARCHAR(50) NOT NULL,
    provider_account_id VARCHAR(255) NOT NULL,
    refresh_token TEXT,
    access_token TEXT,
    expires_at TIMESTAMP WITH TIME ZONE,
    token_type VARCHAR(50),
    scope TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(provider, provider_account_id)
);

CREATE INDEX IF NOT EXISTS idx_account_user_id ON "account"(user_id);

-- ── Project Table ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "project" (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL DEFAULT 'Untitled Project',
    description TEXT,
    crdt_state JSONB DEFAULT '{}',
    thumbnail_url TEXT,
    width INTEGER DEFAULT 1920,
    height INTEGER DEFAULT 1080,
    framerate REAL DEFAULT 24.0,
    is_archived BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_project_user_id ON "project"(user_id);
CREATE INDEX IF NOT EXISTS idx_project_updated ON "project"(updated_at DESC);

-- ── Subscription Table ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "subscription" (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
    dodo_subscription_id VARCHAR(255),
    dodo_price_id VARCHAR(255),
    dodo_current_period_end TIMESTAMP WITH TIME ZONE,
    tier VARCHAR(50) DEFAULT 'free',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_subscription_user_id ON "subscription"(user_id);
CREATE INDEX IF NOT EXISTS idx_subscription_dodo_id ON "subscription"(dodo_subscription_id);

-- ── API Key Table ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "api_key" (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL DEFAULT 'Default',
    key_hash VARCHAR(255) NOT NULL UNIQUE,
    key_prefix VARCHAR(8) NOT NULL,
    scopes TEXT[] DEFAULT ARRAY['read', 'write'],
    last_used_at TIMESTAMP WITH TIME ZONE,
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_api_key_user_id ON "api_key"(user_id);

-- ── Render Job Table ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "render_job" (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES "project"(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
    status VARCHAR(50) DEFAULT 'queued',
    format VARCHAR(20) DEFAULT 'mp4',
    progress INTEGER DEFAULT 0,
    output_url TEXT,
    error_message TEXT,
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_render_job_user_id ON "render_job"(user_id);
CREATE INDEX IF NOT EXISTS idx_render_job_project_id ON "render_job"(project_id);
CREATE INDEX IF NOT EXISTS idx_render_job_status ON "render_job"(status);

-- ── Audit Log Table ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "audit_log" (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES "user"(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    resource_type VARCHAR(50) NOT NULL,
    resource_id UUID,
    metadata JSONB DEFAULT '{}',
    ip_address VARCHAR(45),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_log_user_id ON "audit_log"(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_action ON "audit_log"(action);
CREATE INDEX IF NOT EXISTS idx_audit_log_created ON "audit_log"(created_at DESC);

-- ── Updated At Trigger ─────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply the trigger to tables with updated_at
DO $$
DECLARE
    tbl TEXT;
BEGIN
    FOR tbl IN 
        SELECT table_name FROM information_schema.columns 
        WHERE column_name = 'updated_at' 
        AND table_schema = 'public'
    LOOP
        EXECUTE format(
            'DROP TRIGGER IF EXISTS trg_%I_updated_at ON %I;
             CREATE TRIGGER trg_%I_updated_at 
             BEFORE UPDATE ON %I 
             FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()',
            tbl, tbl, tbl, tbl
        );
    END LOOP;
END $$;

-- ── Verification Query ─────────────────────────────────────────────────────
-- Run after migration to verify data integrity:
-- SELECT 'users' as table_name, count(*) FROM "user"
-- UNION ALL SELECT 'sessions', count(*) FROM "session"
-- UNION ALL SELECT 'accounts', count(*) FROM "account"
-- UNION ALL SELECT 'projects', count(*) FROM "project"
-- UNION ALL SELECT 'subscriptions', count(*) FROM "subscription"
-- UNION ALL SELECT 'api_keys', count(*) FROM "api_key"
-- UNION ALL SELECT 'render_jobs', count(*) FROM "render_job";
