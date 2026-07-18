# 🏗️ Architecture: Referrals & Discounts

## 1. Overview

This document outlines the technical design for the Promotions Engine, spanning the `rust/` core, the PostgreSQL database, and the 7 platform interfaces (formats).

## 2. Core Components (Rust Workspace)

### New Crate: `crates/promotions/`
Responsible for the core domain logic:
- `coupon.rs`: Structs for `Coupon`, `DiscountType` (Percentage, Fixed, FreeMonths).
- `referral.rs`: Structs for `ReferralLink`, `ReferralTree`.
- `validator.rs`: Pure functions to validate if a coupon can be applied given a user's state.

### Modifications to `crates/state/`
- Introduce `WalletState` CRDT if we need real-time sync of earned credits across a user's collaborative sessions, otherwise keep it purely server-side.

## 3. Data Schema (Drizzle ORM)

```sql
CREATE TABLE coupons (
    id UUID PRIMARY KEY,
    code VARCHAR(20) UNIQUE NOT NULL,
    discount_type VARCHAR(20) NOT NULL,
    discount_value DECIMAL(10, 2) NOT NULL,
    max_uses INT,
    current_uses INT DEFAULT 0,
    expires_at TIMESTAMP
);

CREATE TABLE referrals (
    id UUID PRIMARY KEY,
    referrer_id UUID REFERENCES users(id),
    referred_id UUID REFERENCES users(id),
    status VARCHAR(20), -- 'pending', 'converted'
    reward_granted BOOLEAN DEFAULT FALSE
);

CREATE TABLE wallets (
    user_id UUID PRIMARY KEY REFERENCES users(id),
    balance DECIMAL(10, 2) DEFAULT 0
);
```

## 4. Platform Interface Integration (The 7 Formats)

1. **Web App (`apps/web`)**: Next.js pages `/dashboard/referrals` to copy links and view earnings. Checkout page component for coupon entry.
2. **Desktop App (`apps/desktop`)**: GPUI native modal for "Invite Friends" and a settings pane showing current credit balance.
3. **Mobile App (`apps/mobile`)**: React Native share sheet integration (`Share.share()`) for the referral link, deep linking to attribute installs.
4. **Browser Extension (`apps/browser-extension`)**: Chrome MV3 background script to detect if a user lands on checkout without a promo code and notify them if they have credits.
5. **REST API Gateway (`rust/api-gateway`)**: Axum routes:
   - `POST /api/v1/promotions/apply`
   - `GET /api/v1/referrals/me`
6. **Headless CLI (`rust/cli`)**: 
   - Command: `lazynext account promos apply --code SAVE20`
   - Render Command addition: `lazynext render input.json --use-credits`
7. **MCP Server (`rust/mcp-server`)**: 
   - Tool: `generate_referral_link`
   - Tool: `apply_discount_code`
   - Allows the AI Copilot to say "I've applied a 10% discount to your account!" during chat.

## 5. Third-Party Integrations
- **Dodo Payments**: Webhooks will notify our backend when a referred user completes a subscription, triggering the `reward_granted` logic.
