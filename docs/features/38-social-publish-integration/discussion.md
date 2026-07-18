# Feature 38: Social Publish Integration

## 1. The Core Problem
Direct social media publishing was originally implemented at the core level (`@lazynext/social-publish-core`) and deployed as a microservice on port 8007 (`services/render-service/src/social-publish.ts` and `services/social-publish`). However, the feature was formally deferred in v1.0 because the UI, OAuth flows, and cross-platform integrations (across all 7 formats) were incomplete. 

Users need the ability to push rendered videos directly to TikTok, YouTube, and Instagram without manual downloading and re-uploading, and this capability must span the entire ecosystem.

## 2. Why Now?
The platform architecture is complete and stable (100% code-complete on core features 1-37). The user has explicitly authorized un-deferring this feature to achieve end-to-end cloud production capabilities.

## 3. The Goal
Wire the existing `social-publish` module into all 7 Lazynext delivery surfaces:
1. **Web App:** OAuth UI and publishing forms.
2. **Desktop App:** Deep-linking for local OAuth callbacks.
3. **Mobile App:** Native Share Sheets + In-app browser OAuth.
4. **API Gateway:** Secure token storage and proxy routing.
5. **MCP Server:** AI-agent tool for natural language publishing.
6. **CLI:** Headless flag support for CI/CD pipelines.
7. **Browser Extension:** Quick-share capability.

## 4. Key Constraints & Rules
- **No Client-side File Uploads:** Mobile/Web apps must delegate uploads to the cloud (or use OS-native share sheets for mobile local renders).
- **Security:** Strict separation between user intent and OAuth token handling. AI agents cannot authorize OAuth sessions.
- **Rust Owns Logic:** The API Gateway (Rust) will handle the OAuth orchestration and token storage, while the Node.js service (Port 8007) continues to handle the messy platform-specific upload APIs.