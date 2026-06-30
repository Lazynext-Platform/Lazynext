-- ============================================================================
-- Lazynext Database Migration: Schema Reconciliation
-- Version: 0003_reconcile_schema
--
-- Reconciles the Drizzle ORM schema (schema.ts) with existing migration-created
-- tables. All statements are idempotent — safe to run multiple times.
--
-- 1. Renames tables to match Drizzle's plural convention (project→projects)
-- 2. Adds tables defined in schema.ts but missing from 0001/0002:
--    verification, timelines, tracks, clips, agents, feedback, assets
-- ============================================================================

-- ── 1. Table Renames ────────────────────────────────────────────────────

DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'project')
       AND NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'projects') THEN
        ALTER TABLE project RENAME TO projects;
    END IF;
END $$;

DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'subscription')
       AND NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'subscriptions') THEN
        ALTER TABLE subscription RENAME TO subscriptions;
    END IF;
END $$;

-- ── 2. Verification Table (Better-Auth) ─────────────────────────────────

CREATE TABLE IF NOT EXISTS "verification" (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    identifier VARCHAR(255) NOT NULL,
    value TEXT NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_verification_identifier ON "verification" (identifier);

-- ── 3. Timelines ────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "timelines" (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID REFERENCES "projects"(id) ON DELETE CASCADE,
    width INTEGER NOT NULL DEFAULT 1920,
    height INTEGER NOT NULL DEFAULT 1080,
    framerate INTEGER NOT NULL DEFAULT 30
);
CREATE INDEX IF NOT EXISTS idx_timelines_project ON "timelines" (project_id);

-- ── 4. Tracks ───────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "tracks" (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID REFERENCES "projects"(id) ON DELETE CASCADE,
    timeline_id UUID REFERENCES "timelines"(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(64) NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    z_index INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_tracks_project   ON "tracks" (project_id);
CREATE INDEX IF NOT EXISTS idx_tracks_timeline  ON "tracks" (timeline_id);

-- ── 5. Clips ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "clips" (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    track_id UUID REFERENCES "tracks"(id) ON DELETE CASCADE,
    asset_url TEXT NOT NULL,
    start_frame INTEGER NOT NULL,
    duration_frames INTEGER NOT NULL,
    offset_frames INTEGER DEFAULT 0,
    metadata JSONB
);
CREATE INDEX IF NOT EXISTS idx_clips_track ON "clips" (track_id);

-- ── 6. Agents (AI memory context) ───────────────────────────────────────

CREATE TABLE IF NOT EXISTS "agents" (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID REFERENCES "projects"(id) ON DELETE CASCADE,
    agent_type VARCHAR(64) NOT NULL,
    memory_context JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_agents_project ON "agents" (project_id);

-- ── 7. Feedback ─────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "feedback" (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    message TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ── 8. Assets ───────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "assets" (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES "projects"(id) ON DELETE CASCADE,
    type VARCHAR(32) NOT NULL,
    url TEXT NOT NULL,
    metadata TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_assets_project ON "assets" (project_id);

-- ── Verify ──────────────────────────────────────────────────────────────

DO $$ BEGIN
    RAISE NOTICE 'Migration 0003_reconcile_schema applied.';
    RAISE NOTICE 'Renamed: project→projects, subscription→subscriptions (if needed)';
    RAISE NOTICE 'Created: verification, timelines, tracks, clips, agents, feedback, assets';
END $$;

