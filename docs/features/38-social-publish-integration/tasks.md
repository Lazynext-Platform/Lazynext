# Tasks: Social Publish Integration

> **Status:** 🔴 NOT STARTED

## 1. API Gateway & Database (The Foundation)
- [ ] **1.1** Create DB migration for `user_social_tokens` table.
- [ ] **1.2** Implement OAuth routes (`/auth/social/init`, `/auth/social/callback`) in Axum.
- [ ] **1.3** Implement `/api/publish` proxy route injecting stored tokens.

## 2. Web App Shell
- [ ] **2.1** Build Social Integrations settings page.
- [ ] **2.2** Build Publish Modal UI for metadata input.
- [ ] **2.3** Wire Web App to Gateway API.

## 3. Desktop App (GPUI)
- [ ] **3.1** Add custom URI scheme handler (`lazynext://`).
- [ ] **3.2** Build native GPUI modal for publish metadata.

## 4. Mobile App (React Native)
- [ ] **4.1** Implement Native OS Share Sheet integration for local renders.
- [ ] **4.2** Integrate In-App Browser for OAuth flow.

## 5. CLI (Headless)
- [ ] **5.1** Add `--publish-to` and metadata flags to CLI `clap` parser.
- [ ] **5.2** Wire CLI render pipeline to trigger Gateway API post-render.

## 6. MCP Server
- [ ] **6.1** Define `publish_video` tool schema.
- [ ] **6.2** Define `get_social_connections` tool schema.
- [ ] **6.3** Implement tool handlers in Rust MCP server.

## 7. Browser Extension
- [ ] **7.1** Add publish UI to extension capture success state.
- [ ] **7.2** Wire extension API calls to Gateway.