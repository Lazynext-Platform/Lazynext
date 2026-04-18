-- ─────────────────────────────────────────────────────────────────────────────
-- Migration 00002: Decision Intelligence Spine
-- Enforces decisions as the atomic unit: every workflow node (task/doc/thread/
-- table/automation) must either link to a parent decision OR carry an explicit
-- operational_reason. Adds 4-dimension score breakdown, expected_by, and the
-- Workspace Maturity Score (WMS) column that drives progressive exposure.
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. NODES: add decision_id FK + operational_reason + constraint
ALTER TABLE nodes
  ADD COLUMN IF NOT EXISTS decision_id uuid REFERENCES decisions(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS operational_reason text;

CREATE INDEX IF NOT EXISTS idx_nodes_decision_id ON nodes(decision_id);

-- Constraint: non-decision nodes must link to a decision OR declare operational reason.
-- Decision nodes themselves are exempt (they ARE the spine).
ALTER TABLE nodes DROP CONSTRAINT IF EXISTS nodes_decision_spine_check;
ALTER TABLE nodes
  ADD CONSTRAINT nodes_decision_spine_check
  CHECK (
    type = 'decision'
    OR decision_id IS NOT NULL
    OR operational_reason IS NOT NULL
  );

-- 2. DECISIONS: add expected_by, score_breakdown, public sharing, embedding stub
ALTER TABLE decisions
  ADD COLUMN IF NOT EXISTS expected_by timestamptz,
  ADD COLUMN IF NOT EXISTS score_breakdown jsonb,
  ADD COLUMN IF NOT EXISTS is_public boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS public_slug text UNIQUE,
  ADD COLUMN IF NOT EXISTS score_model_version text,
  ADD COLUMN IF NOT EXISTS score_rationale text;

CREATE INDEX IF NOT EXISTS idx_decisions_expected_by ON decisions(expected_by)
  WHERE outcome = 'pending' AND expected_by IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_decisions_public_slug ON decisions(public_slug)
  WHERE is_public = true;

-- 3. WORKSPACES: add Workspace Maturity Score (WMS) for progressive exposure
ALTER TABLE workspaces
  ADD COLUMN IF NOT EXISTS wms_score integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS wms_updated_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS power_user_override boolean NOT NULL DEFAULT false;

-- 4. OUTCOME REMINDERS: track whether we've nudged the owner
ALTER TABLE decisions
  ADD COLUMN IF NOT EXISTS outcome_reminder_sent_at timestamptz;

-- 5. Helpful composite index for decision listing / dashboard
CREATE INDEX IF NOT EXISTS idx_decisions_workspace_created
  ON decisions(workspace_id, created_at DESC);
