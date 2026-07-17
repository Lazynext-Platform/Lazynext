-- Lazynext PostgreSQL Migration Tracking
-- Applied via Drizzle ORM (apps/web/drizzle.config.ts) and sqlx (Rust gateway)
-- See apps/web/src/db/schema.ts for the authoritative Drizzle schema
-- See rust/api-gateway/src/db.rs for the Rust gateway's sqlx queries

-- Migration order (chronological):
-- 001_initial_schema  — users, sessions, accounts, verifications (better-auth)
-- 002_projects        — projects, timelines, tracks, clips
-- 003_assets          — media assets, storage references
-- 004_agents          — AI agent configurations, API keys
-- 005_subscriptions   — Dodo Payments subscriptions
-- 006_feedback        — user feedback, bug reports
-- 007_analytics       — Kafka-proxied analytics persistence

-- To apply migrations locally:
--   bun run db:push:local    (Drizzle — schema push to dev DB)
--   bun run db:migrate       (Drizzle — migration-based apply)
--
-- To apply to PostgreSQL:

--   DATABASE_URL=<url> bun run db:migrate