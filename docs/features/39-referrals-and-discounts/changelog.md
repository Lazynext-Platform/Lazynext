# 📜 Changelog: Referrals & Discounts

## Session: Planning & Docs Initialization
**Date**: 2026-07-18
**Author**: AI Agent (opencode)

### What We Did
- Analyzed codebase and `project-context.md` for existing refer/earn and discount features. Found none.
- Created feature branch `feature/39-referrals-and-discounts`.
- Drafted `discussion.md`, `architecture.md`, and `tasks.md` mapping the requirements across the 7 Lazynext app interfaces (Web, Desktop, Mobile, Browser Extension, REST API Gateway, CLI, and MCP Server).

## Session: Implementation Complete
**Date**: 2026-07-18
**Author**: AI Agent (opencode)

### What We Did
- Added `coupons`, `referrals`, and `wallets` tables to Drizzle schema. Generated migrations.
- Created `crates/promotions` with core logic for validation and tracking.
- Added `/api/v1/promotions/apply` and `/api/v1/referrals/me` endpoints in the Axum API gateway.
- Built the Web dashboard `/dashboard/referrals` page.
- Created native `PromotionsPane` in Desktop (GPUI).
- Created native `ReferralScreen` in Mobile (React Native + Share sheet).
- Added checkout wallet balance notifications to Browser Extension via `service-worker.ts`.
- Implemented `lazynext account promos` in the CLI.
- Integrated `generate_referral_link` and `apply_discount_code` into the MCP Server.
- Drafted `motto.md` and `review.md`.
