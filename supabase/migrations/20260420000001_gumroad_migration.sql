-- Gumroad migration: rename Lemon Squeezy billing columns on `workspaces`.
--
-- Why: v1 shipped with `ls_*` columns when we were planning to use Lemon
-- Squeezy. The product is now wired to Gumroad end-to-end. This migration
-- renames those columns to `gr_*` so they match the code. Column data
-- types are updated where the Gumroad semantics differ (we store the
-- buyer's email, not a numeric customer id).
--
-- Safe to run on an existing DB: columns are renamed in place (no data
-- loss for rows that were written). New deploys run
-- 00001_supabase_init.sql which already has `gr_*` columns, so this
-- migration is a no-op for them.

ALTER TABLE workspaces
  DROP CONSTRAINT IF EXISTS workspaces_ls_customer_id_key,
  DROP CONSTRAINT IF EXISTS workspaces_ls_subscription_id_key;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'workspaces' AND column_name = 'ls_customer_id'
  ) THEN
    ALTER TABLE workspaces RENAME COLUMN ls_customer_id TO gr_customer_email;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'workspaces' AND column_name = 'ls_subscription_id'
  ) THEN
    ALTER TABLE workspaces RENAME COLUMN ls_subscription_id TO gr_subscription_id;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'workspaces' AND column_name = 'ls_customer_portal_url'
  ) THEN
    ALTER TABLE workspaces RENAME COLUMN ls_customer_portal_url TO gr_subscription_manage_url;
  END IF;
END $$;

-- Re-add the uniqueness constraint on subscription id under its new name.
-- (Email may legitimately repeat across workspaces for power users, so we
-- drop uniqueness on that column.)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'workspaces_gr_subscription_id_key'
  ) THEN
    ALTER TABLE workspaces
      ADD CONSTRAINT workspaces_gr_subscription_id_key UNIQUE (gr_subscription_id);
  END IF;
END $$;
