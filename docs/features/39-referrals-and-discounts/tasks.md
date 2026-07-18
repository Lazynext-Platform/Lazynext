# 📋 Tasks: Referrals & Discounts

## Planning
- [x] Create feature branch
- [x] Write `discussion.md`
- [x] Write `architecture.md`
- [ ] Get Human Approval

## Phase 1: Database & Rust Core (Business Logic)
- [ ] Create Drizzle migration for `coupons`, `referrals`, `wallets`
- [ ] Create `crates/promotions/` cargo workspace crate
- [ ] Implement coupon validation logic (expiry, usage counts)
- [ ] Implement Dodo Payments webhook handler for referral conversion

## Phase 2: REST API Gateway (Format 1/7)
- [ ] Add `GET /api/v1/referrals/me` route in Axum
- [ ] Add `POST /api/v1/promotions/apply` route in Axum
- [ ] Add `GET /api/v1/wallets/balance` route in Axum

## Phase 3: Web App (Format 2/7)
- [ ] Build `/dashboard/referrals` page (Tailwind CSS)
- [ ] Update checkout flow to include promo code input field

## Phase 4: Desktop App (Format 3/7)
- [ ] Add `ReferralsModal.rs` in `apps/desktop` using GPUI
- [ ] Integrate rust core APIs to fetch and display wallet balance natively

## Phase 5: Mobile App (Format 4/7)
- [ ] Add `ReferralScreen.tsx` in `apps/mobile`
- [ ] Implement native share functionality for referral links

## Phase 6: Browser Extension (Format 5/7)
- [ ] Add notification pop-up for available wallet credits when on checkout URL

## Phase 7: CLI Tool (Format 6/7)
- [ ] Add `lazynext account promos` subcommands using Clap
- [ ] Support `--use-credits` flag for CLI rendering jobs

## Phase 8: MCP Server (Format 7/7)
- [ ] Add `generate_referral_link` tool to `rust/mcp-server/src/index.ts` (or Rust equivalent)
- [ ] Add `apply_discount_code` tool

## Finalization
- [ ] Write `motto.md`
- [ ] Write `review.md`
- [ ] E2E Testing of the complete flow
