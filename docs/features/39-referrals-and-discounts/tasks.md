# 📋 Tasks: Referrals & Discounts

## Planning
- [x] Create feature branch
- [x] Write `discussion.md`
- [x] Write `architecture.md`
- [x] Get Human Approval

## Phase 1: Database & Rust Core (Business Logic)
- [x] Create Drizzle migration for `coupons`, `referrals`, `wallets`
- [x] Create `crates/promotions/` cargo workspace crate
- [x] Implement coupon validation logic (expiry, usage counts)
- [x] Implement Dodo Payments webhook handler for referral conversion

## Phase 2: REST API Gateway (Format 1/7)
- [x] Add `GET /api/v1/referrals/me` route in Axum
- [x] Add `POST /api/v1/promotions/apply` route in Axum
- [x] Add `GET /api/v1/promotions/wallet` route in Axum

## Phase 3: Web App (Format 2/7)
- [x] Build `/dashboard/referrals` page (Tailwind CSS)
- [x] Update checkout flow to include promo code input field

## Phase 4: Desktop App (Format 3/7)
- [x] Add `promotions.rs` in `apps/desktop` using GPUI
- [x] Integrate rust core APIs to fetch and display wallet balance natively

## Phase 5: Mobile App (Format 4/7)
- [x] Add `ReferralScreen.tsx` in `apps/mobile`
- [x] Implement native share functionality for referral links

## Phase 6: Browser Extension (Format 5/7)
- [x] Add notification pop-up for available wallet credits when on checkout URL

## Phase 7: CLI Tool (Format 6/7)
- [x] Add `lazynext account promos` subcommands using Clap
- [x] Support `--use-credits` flag for CLI rendering jobs

## Phase 8: MCP Server (Format 7/7)
- [x] Add `generate_referral_link` tool to `services/mcp-server/src/index.ts`
- [x] Add `apply_discount_code` tool

## Finalization
- [x] Write `motto.md`
- [x] Write `review.md`
- [x] E2E Testing of the complete flow
