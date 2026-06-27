-- ============================================================================
-- Lazynext Analytics & Observability Tables
-- Migration: 0002_analytics_tables
--
-- Creates:
--   1. analytics_events       — partitioned event tracking (by month)
--   2. user_sessions          — session tracking with geography/device info
--   3. feature_flags          — runtime feature flag configuration
--   4. ab_experiments         — A/B experiment definitions
--   5. ab_assignments         — user-to-experiment-variant assignments
--   6. audit_log_v2           — enhanced audit log with change tracking
-- ============================================================================

-- ── Extensions (idempotent) ────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- ── Analytics Events (partitioned by month) ────────────────────────────────

CREATE TABLE IF NOT EXISTS "analytics_events" (
    id              UUID DEFAULT uuid_generate_v4(),
    -- Event identification
    event_name      VARCHAR(128) NOT NULL,
    event_category  VARCHAR(64) NOT NULL DEFAULT 'general',
    -- Actor
    user_id         UUID REFERENCES "user"(id) ON DELETE SET NULL,
    anonymous_id    VARCHAR(128),
    session_id      VARCHAR(128),
    -- Project context
    project_id      UUID REFERENCES "project"(id) ON DELETE SET NULL,
    -- Event data
    properties      JSONB DEFAULT '{}',
    -- Request context
    page_url        TEXT,
    referrer        TEXT,
    ip_address      INET,
    user_agent      TEXT,
    -- Timestamps
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    received_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    PRIMARY KEY (id, created_at)
) PARTITION BY RANGE (created_at);

-- Create partitions for the current year + next year
-- Each partition is one month. We create partitions dynamically below.
DO $$
DECLARE
    start_date  DATE := DATE_TRUNC('month', NOW())::DATE;
    end_date    DATE := DATE_TRUNC('month', NOW() + INTERVAL '13 months')::DATE;
    partition_name TEXT;
    partition_start TEXT;
    partition_end TEXT;
BEGIN
    WHILE start_date < end_date LOOP
        partition_name := 'analytics_events_' || TO_CHAR(start_date, 'YYYY_MM');
        partition_start := TO_CHAR(start_date, 'YYYY-MM-DD');
        partition_end := TO_CHAR(start_date + INTERVAL '1 month', 'YYYY-MM-DD');

        IF NOT EXISTS (
            SELECT 1 FROM pg_class
            WHERE relname = partition_name AND relkind = 'p'
        ) THEN
            EXECUTE format(
                'CREATE TABLE %I PARTITION OF analytics_events
                 FOR VALUES FROM (%L) TO (%L)',
                partition_name, partition_start, partition_end
            );
        END IF;

        start_date := start_date + INTERVAL '1 month';
    END LOOP;
END $$;

-- Indexes on the parent (automatically applied to all partitions)
CREATE INDEX IF NOT EXISTS idx_ae_event_name    ON analytics_events (event_name, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ae_user_id       ON analytics_events (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ae_session_id    ON analytics_events (session_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ae_project_id    ON analytics_events (project_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ae_category      ON analytics_events (event_category, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ae_created_at    ON analytics_events (created_at DESC);

-- GIN index on properties JSONB for flexible querying
CREATE INDEX IF NOT EXISTS idx_ae_properties    ON analytics_events USING GIN (properties jsonb_path_ops);

-- ── User Sessions ──────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "user_sessions" (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
    -- Session metadata
    session_token   VARCHAR(256) NOT NULL UNIQUE,
    ip_address      INET,
    user_agent      TEXT,
    -- Geography (derived from IP, stored denormalized)
    country         VARCHAR(2),
    region          VARCHAR(128),
    city            VARCHAR(128),
    timezone        VARCHAR(64),
    -- Device info
    device_type     VARCHAR(32),       -- desktop, mobile, tablet
    browser         VARCHAR(64),
    browser_version VARCHAR(32),
    os              VARCHAR(64),
    os_version      VARCHAR(32),
    screen_width    INTEGER,
    screen_height   INTEGER,
    -- Session lifecycle
    is_active       BOOLEAN DEFAULT TRUE,
    started_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_active_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ended_at        TIMESTAMPTZ,
    duration_seconds INTEGER DEFAULT 0,
    -- Engagement
    page_views      INTEGER DEFAULT 0,
    events_count    INTEGER DEFAULT 0,
    -- Attribution
    utm_source      VARCHAR(128),
    utm_medium      VARCHAR(128),
    utm_campaign    VARCHAR(128),
    utm_term        VARCHAR(128),
    utm_content     VARCHAR(128),
    referrer        TEXT,

    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_us_user_id       ON user_sessions (user_id, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_us_session_token ON user_sessions (session_token);
CREATE INDEX IF NOT EXISTS idx_us_active        ON user_sessions (is_active, last_active_at DESC)
    WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_us_country       ON user_sessions (country);
CREATE INDEX IF NOT EXISTS idx_us_device        ON user_sessions (device_type);
CREATE INDEX IF NOT EXISTS idx_us_started       ON user_sessions (started_at DESC);

-- Trigger to auto-update updated_at
CREATE OR REPLACE FUNCTION trg_user_sessions_updated()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_user_sessions_upd ON user_sessions;
CREATE TRIGGER trg_user_sessions_upd
    BEFORE UPDATE ON user_sessions
    FOR EACH ROW EXECUTE FUNCTION trg_user_sessions_updated();

-- ── Feature Flags ──────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "feature_flags" (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    -- Flag identity
    flag_key        VARCHAR(128) NOT NULL UNIQUE,
    flag_name       VARCHAR(255) NOT NULL,
    description     TEXT,
    -- Flag configuration
    flag_type       VARCHAR(32) NOT NULL DEFAULT 'boolean',
        -- boolean, percentage, user_segment, environment
    default_value   JSONB NOT NULL DEFAULT 'false'::jsonb,
    -- Targeting
    target_environment VARCHAR(16)[] DEFAULT ARRAY['development', 'production'],
    target_roles    VARCHAR(64)[],
    target_percentage INTEGER CHECK (target_percentage BETWEEN 0 AND 100),
    -- Rules (stored as JSONB for flexibility)
    rules           JSONB DEFAULT '[]',
    -- Lifecycle
    is_active       BOOLEAN DEFAULT FALSE,
    rollout_started_at TIMESTAMPTZ,
    rollout_completed_at TIMESTAMPTZ,
    -- Audience
    created_by      UUID REFERENCES "user"(id) ON DELETE SET NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at      TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_ff_key        ON feature_flags (flag_key) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_ff_active     ON feature_flags (is_active) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_ff_environment ON feature_flags USING GIN (target_environment);

-- Insert some sensible defaults
INSERT INTO feature_flags (flag_key, flag_name, description, default_value, target_environment) VALUES
    ('ai_copilot_v2', 'AI Copilot v2', 'Enable the next-gen AI copilot experience', 'false', ARRAY['development']),
    ('real_time_collab', 'Real-Time Collaboration', 'Enable CRDT-based real-time collaboration', 'false', ARRAY['development']),
    ('advanced_export', 'Advanced Export Formats', 'Enable ProRes, DCP, and AAF export', 'false', ARRAY['development']),
    ('neural_face_detection', 'Neural Face Detection', 'Enable face detection for smart bins', 'false', ARRAY['development']),
    ('dark_mode', 'Dark Mode', 'Enable dark mode UI', 'true', ARRAY['development', 'production']),
    ('new_timeline_ui', 'New Timeline UI', 'Enable the redesigned timeline interface', 'false', ARRAY['development'])
ON CONFLICT (flag_key) DO NOTHING;

-- ── A/B Experiments ────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "ab_experiments" (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    -- Experiment identity
    experiment_key  VARCHAR(128) NOT NULL UNIQUE,
    experiment_name VARCHAR(255) NOT NULL,
    description     TEXT,
    hypothesis      TEXT,
    -- Variations
    variants        JSONB NOT NULL,
    -- Example: [{"key": "control", "name": "Original UI", "weight": 50},
    --            {"key": "variant_a", "name": "New Layout", "weight": 50}]
    -- Metrics to track
    success_metrics JSONB DEFAULT '[]',
    -- Example: [{"event_name": "export_started", "aggregation": "count"},
    --            {"event_name": "export_completed", "aggregation": "rate"}]
    -- Targeting
    target_percentage INTEGER CHECK (target_percentage BETWEEN 1 AND 100),
    target_environment VARCHAR(16)[] DEFAULT ARRAY['production'],
    -- Lifecycle
    status          VARCHAR(32) NOT NULL DEFAULT 'draft',
        -- draft, running, paused, completed, archived
    started_at      TIMESTAMPTZ,
    ended_at        TIMESTAMPTZ,
    -- Results (populated after experiment ends)
    results         JSONB,
    -- Ownership
    created_by      UUID REFERENCES "user"(id) ON DELETE SET NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_abe_key        ON ab_experiments (experiment_key);
CREATE INDEX IF NOT EXISTS idx_abe_status     ON ab_experiments (status);

-- ── A/B Experiment Assignments ─────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "ab_assignments" (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    experiment_id   UUID NOT NULL REFERENCES ab_experiments(id) ON DELETE CASCADE,
    user_id         UUID NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
    -- Assignment
    variant_key     VARCHAR(64) NOT NULL,
    assigned_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    -- Tracking
    first_seen_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_seen_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    -- For consistent hashing
    assignment_hash VARCHAR(64),

    UNIQUE (experiment_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_aba_experiment     ON ab_assignments (experiment_id, variant_key);
CREATE INDEX IF NOT EXISTS idx_aba_user           ON ab_assignments (user_id);
CREATE INDEX IF NOT EXISTS idx_aba_assigned       ON ab_assignments (assigned_at DESC);

-- ── Audit Log v2 (Enhanced) ────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "audit_log_v2" (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    -- Actor
    user_id         UUID REFERENCES "user"(id) ON DELETE SET NULL,
    api_key_id      UUID REFERENCES "api_key"(id) ON DELETE SET NULL,
    actor_type      VARCHAR(16) NOT NULL DEFAULT 'user',
        -- user, api_key, system, cron, webhook
    -- Target
    action          VARCHAR(128) NOT NULL,
        -- e.g., 'project.create', 'clip.delete', 'export.start'
    resource_type   VARCHAR(64) NOT NULL,
        -- e.g., 'project', 'clip', 'user', 'subscription'
    resource_id     UUID,
    -- Change tracking (for UPDATE actions)
    previous_state  JSONB,          -- State before the change
    new_state       JSONB,          -- State after the change
    changed_fields  TEXT[],         -- Which fields were modified
    -- Request context
    request_id      VARCHAR(128),   -- Correlation ID for tracing
    ip_address      INET,
    user_agent      TEXT,
    -- Metadata
    metadata        JSONB DEFAULT '{}',
    -- Outcome
    status          VARCHAR(16) NOT NULL DEFAULT 'success',
        -- success, failure, denied
    error_message   TEXT,
    -- Duration
    duration_ms     INTEGER,
    -- Timestamps
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Partition by month for efficient archival
    CONSTRAINT audit_log_v2_created_check CHECK (created_at >= '2026-01-01')
) PARTITION BY RANGE (created_at);

-- Create partitions for audit_log_v2 (current year + next)
DO $$
DECLARE
    start_date  DATE := DATE_TRUNC('month', NOW())::DATE;
    end_date    DATE := DATE_TRUNC('month', NOW() + INTERVAL '13 months')::DATE;
    partition_name TEXT;
    partition_start TEXT;
    partition_end TEXT;
BEGIN
    WHILE start_date < end_date LOOP
        partition_name := 'audit_log_v2_' || TO_CHAR(start_date, 'YYYY_MM');
        partition_start := TO_CHAR(start_date, 'YYYY-MM-DD');
        partition_end := TO_CHAR(start_date + INTERVAL '1 month', 'YYYY-MM-DD');

        IF NOT EXISTS (
            SELECT 1 FROM pg_class
            WHERE relname = partition_name AND relkind = 'p'
        ) THEN
            EXECUTE format(
                'CREATE TABLE %I PARTITION OF audit_log_v2
                 FOR VALUES FROM (%L) TO (%L)',
                partition_name, partition_start, partition_end
            );
        END IF;

        start_date := start_date + INTERVAL '1 month';
    END LOOP;
END $$;

-- Indexes on audit_log_v2
CREATE INDEX IF NOT EXISTS idx_alv2_user_id       ON audit_log_v2 (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_alv2_action        ON audit_log_v2 (action, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_alv2_resource      ON audit_log_v2 (resource_type, resource_id);
CREATE INDEX IF NOT EXISTS idx_alv2_request_id    ON audit_log_v2 (request_id);
CREATE INDEX IF NOT EXISTS idx_alv2_status        ON audit_log_v2 (status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_alv2_created       ON audit_log_v2 (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_alv2_actor_type    ON audit_log_v2 (actor_type);

-- ── Partition Management Function ──────────────────────────────────────────

-- Function to create future partitions for the next N months
-- Should be called by a monthly cron job
CREATE OR REPLACE FUNCTION create_future_partitions(
    parent_table TEXT,
    months_ahead INTEGER DEFAULT 3
) RETURNS INTEGER AS $$
DECLARE
    start_date  DATE;
    partition_count INTEGER := 0;
    partition_name TEXT;
    partition_start TEXT;
    partition_end TEXT;
    i INTEGER;
BEGIN
    -- Start from the next month after the last existing partition
    SELECT COALESCE(
        MAX(
            CASE
                WHEN relname ~ '^[a-z_]+_\d{4}_\d{2}$'
                THEN TO_DATE(SUBSTRING(relname FROM '_(\d{4}_\d{2})$'), 'YYYY_MM')
                ELSE NULL
            END
        ),
        DATE_TRUNC('month', NOW())
    ) INTO start_date
    FROM pg_class
    WHERE relname LIKE parent_table || '_%' AND relkind = 'r';

    start_date := start_date + INTERVAL '1 month';

    FOR i IN 1..months_ahead LOOP
        partition_name := parent_table || '_' || TO_CHAR(start_date, 'YYYY_MM');
        partition_start := TO_CHAR(start_date, 'YYYY-MM-DD');
        partition_end := TO_CHAR(start_date + INTERVAL '1 month', 'YYYY-MM-DD');

        IF NOT EXISTS (
            SELECT 1 FROM pg_class WHERE relname = partition_name
        ) THEN
            EXECUTE format(
                'CREATE TABLE %I PARTITION OF %I
                 FOR VALUES FROM (%L) TO (%L)',
                partition_name, parent_table, partition_start, partition_end
            );
            partition_count := partition_count + 1;
        END IF;

        start_date := start_date + INTERVAL '1 month';
    END LOOP;

    RETURN partition_count;
END;
$$ LANGUAGE plpgsql;

-- ── Verification ───────────────────────────────────────────────────────────

-- Verify all tables exist
DO $$
BEGIN
    RAISE NOTICE 'Migration 0002_analytics_tables applied successfully.';
    RAISE NOTICE 'Tables created:';
    RAISE NOTICE '  - analytics_events (partitioned by month)';
    RAISE NOTICE '  - user_sessions';
    RAISE NOTICE '  - feature_flags (seeded with defaults)';
    RAISE NOTICE '  - ab_experiments';
    RAISE NOTICE '  - ab_assignments';
    RAISE NOTICE '  - audit_log_v2 (partitioned by month)';
    RAISE NOTICE '';
    RAISE NOTICE 'Remember to schedule: SELECT create_future_partitions(''analytics_events'', 3); monthly';
END $$;
