# Tasks: Social Publish Integration

> **Status:** 🔴 NOT STARTED

## 1. API Gateway & Database (The Foundation)
- [x] **1.1** Create DB migration for `user_social_tokens` table.
- [x] **1.2** Implement OAuth routes (`/auth/social/init`, `/auth/social/callback`) in Axum.
- [x] **1.3** Implement `/api/publish` proxy route injecting stored tokens.

## 2. Web App Shell
- [x] **2.1** Build Social Integrations settings page.
- [x] **2.2** Build Publish Modal UI for metadata input.
- [x] **2.3** Wire Web App to Gateway API.

## 3. Desktop App (GPUI)
- [x] **3.1** Add custom URI scheme handler (`lazynext://`).
- [x] **3.2** Build native GPUI modal for publish metadata.

## 4. Mobile App (React Native)
- [x] **4.1** Implement Native OS Share Sheet integration for local renders.
- [x] **4.2** Integrate In-App Browser for OAuth flow.

## 5. CLI (Headless)
- [x] **5.1** Add `--publish-to` and metadata flags to CLI `clap` parser.
- [x] **5.2** Wire CLI render pipeline to trigger Gateway API post-render.

## 6. MCP Server
- [x] **6.1** Define `publish_video` tool schema.
- [x] **6.2** Define `get_social_connections` tool schema.
- [x] **6.3** Implement tool handlers in Rust MCP server.

## 7. Browser Extension
- [x] **7.1** Add publish UI to extension capture success state.
- [x] **7.2** Wire extension API calls to Gateway.