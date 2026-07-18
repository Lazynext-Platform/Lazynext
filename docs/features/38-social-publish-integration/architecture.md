# Architecture: Social Publish Integration

## 1. System Context
The core publishing engine already exists in `packages/social-publish-core`. The `social-publish` Node.js service (port 8007) exposes the `POST /publish` endpoint. This feature bridges the gap between the 7 frontend/client formats and this backend service.

## 2. Component Architecture

### A. API Gateway (`rust/api-gateway/`)
- **Role:** Orchestrator and secure token vault.
- **Changes:**
  - Add `GET /auth/social/:platform` (initiate OAuth).
  - Add `GET /auth/social/callback` (handle OAuth callback).
  - Add PostgreSQL tables (`user_social_tokens`) to store encrypted refresh/access tokens.
  - Proxy `POST /publish` requests to `http://localhost:8007/publish`, injecting the necessary OAuth tokens from the DB.

### B. Web App (`apps/web/`)
- **Role:** Primary OAuth management surface and metadata input.
- **Changes:**
  - `SocialConnections` settings page.
  - `PublishModal` component triggered after successful render.

### C. Desktop App (`apps/desktop/`)
- **Role:** Native trigger for cloud publishing.
- **Changes:**
  - Deep-link URI handler (`lazynext://oauth/callback`) to receive auth success events.
  - Rust native UI (GPUI) element to trigger the API Gateway `/publish` endpoint.

### D. Mobile App (`apps/mobile/`)
- **Role:** On-the-go sharing.
- **Changes:**
  - In-app browser (e.g., `react-native-inappbrowser-reborn`) to handle OAuth securely without leaving the app.
  - Native Share Sheet integration for pushing locally rendered outputs to installed apps.

### E. CLI (`rust/cli/`)
- **Role:** Headless automation.
- **Changes:**
  - Add `--publish-to <platform>`, `--title <title>`, `--privacy <status>` flags to `clap`.
  - CLI authenticates using a pre-configured service account or API key to bypass interactive OAuth.

### F. MCP Server (`rust/mcp-server/`)
- **Role:** AI execution.
- **Changes:**
  - Add `publish_video` tool to the registry.
  - Inputs: `render_job_id`, `platforms`, `metadata`.
  - Condition: Agent checks if platforms are connected via a new `get_connected_socials` tool.

### G. Browser Extension (`apps/extension/`)
- **Role:** Frictionless sharing.
- **Changes:**
  - "Publish to Social" button in the post-capture overlay.
  - Uses the user's existing Web App session to authorize the API Gateway call.

## 3. Data Flow (Cloud Publish)
1. User authenticates via API Gateway (OAuth). Token stored in DB.
2. Format (Web/Desktop/Mobile/Extension/CLI/MCP) calls `POST /api/publish` on API Gateway with `render_job_id` and metadata.
3. API Gateway retrieves OAuth token for user.
4. API Gateway proxies request + token to `http://social-publish:8007/publish`.
5. Node.js service validates path, uploads video, returns status.