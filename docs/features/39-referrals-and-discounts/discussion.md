# 📝 Discussion: Referrals, Coupons, and Discounts

## 1. What Are We Building?

We are introducing a comprehensive **Promotions and Growth** engine for the Lazynext platform. This includes:
1. **Refer & Earn**: A system where users can generate unique referral links, share them, and earn platform credits or discounts when new users sign up and subscribe.
2. **Coupons**: A system to generate, validate, and consume promotional codes for percentage or fixed-amount discounts.
3. **Discounts**: Automated pricing reductions based on specific criteria (e.g., student discounts, seasonal sales).

These features must be seamlessly integrated across all interface shells (Web, Desktop, Mobile, Browser Extension, API Gateway, CLI, and MCP Server) while keeping all business logic strictly within the `rust/` core.

## 2. Why Are We Building It?

To drive user acquisition, improve retention, and provide flexible monetization options via Dodo Payments. A native referral engine leverages our multi-platform presence, allowing users to share clips via the mobile app with their referral link embedded, driving organic growth.

## 3. Key Constraints & Rules

- **Rust Owns Logic**: Validation, code generation, and balance calculation must happen in a new Rust crate (e.g., `crates/promotions`).
- **Dodo Payments Integration**: Coupons and discounts must sync with our existing Dodo Payments subscription setup defined in `project-context.md`.
- **Stateless Shells**: Apps under `apps/` must only render the UI and call the API gateway or WASM bindings; they cannot hold pricing or validation logic.
- **Graceful Degradation**: If the Dodo Payments API is down, users should still be able to use the core editor (though checkout might fail gracefully).

## 4. Current State

- The current codebase handles basic authentication (`better-auth`) and mentions Dodo Payments for subscription management.
- There are **no existing database tables** for `referrals`, `coupons`, or `user_balances`.
- There are **no API endpoints** or UI screens for managing promotions.

## 5. Proposed Approach

1. **Database Schema**: Add `promotions`, `referral_links`, and `wallet_balances` tables via Drizzle ORM.
2. **Rust Core (`crates/promotions`)**: Implement the core logic for validating codes against rules (expiry, usage limits).
3. **API Gateway**: Expose `/api/v1/promotions/apply` and `/api/v1/referrals/generate`.
4. **UI Shells**: Build standard React/GPUI components for inputting codes and viewing referral statistics.

## 6. Open Questions

- Should earnings be mapped as raw currency (USD) or platform credits (e.g., "Render Minutes")? *Assumption: Platform credits mapped to Dodo Payments discounts.*
- Do we need a separate admin dashboard for generating campaign coupons? *Assumption: Yes, via CLI initially.*
