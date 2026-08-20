# Lazynext Launch Checklist

This document tracks items that require external action (purchases, account setup,
manual configuration) and cannot be completed from the codebase alone.

## Completed (No action needed)

- [x] MIT LICENSE file
- [x] SECURITY.md (vulnerability reporting policy)
- [x] CONTRIBUTING.md (contribution guidelines)
- [x] CODE_OF_CONDUCT.md (Contributor Covenant)
- [x] GitHub repository topics (ai-video-editor, electron, vertex-ai, gemini, mcp, etc.)
- [x] GitHub homepage URL set to https://lazynext.com
- [x] GitHub description set
- [x] OpenGraph/social preview image created (assets/og-image.png)
- [x] Landing page SEO (meta tags, OpenGraph, Twitter Card, JSON-LD structured data)
- [x] Landing page deployed via GitHub Pages to lazynext.com
- [x] Fresh v0.4.2 screenshots captured and deployed
- [x] Error tracking scaffold (opt-in via VITE_ERROR_REPORTING_DSN)
- [x] Auto-update channel fixed (owner: Lazynext-Platform)
- [x] CI/CD passing (lint, tests, build)
- [x] Desktop installers published (macOS arm64/x64, Windows x64, Linux x64)
- [x] Vertex AI integration with ADC
- [x] AI Studio key deleted
- [x] GCP account cleanup (8 projects deleted from avaspatel99@gmail.com)

## Requires External Action

### 1. GitHub Social Preview Image (Manual upload)

The OG image has been created at `assets/og-image.png` (1280x640).
Upload it manually:

1. Go to https://github.com/Lazynext-Platform/Lazynext/settings
2. Scroll to "Social preview" section
3. Click "Edit" and upload `assets/og-image.png`
4. Save

This makes links to the repo look professional on Twitter, LinkedIn, Slack, etc.

### 2. Code Signing Certificates (Paid, required for production distribution)

#### macOS — Apple Developer ID Certificate
- **Cost**: $99/year (Apple Developer Program)
- **Where**: https://developer.apple.com/programs/
- **What to do after purchase**:
  1. Export your Developer ID Application certificate as a .p12 file
  2. Base64-encode it: `base64 -i certificate.p12`
  3. Add GitHub secrets to `Lazynext-Platform/Lazynext`:
     - `MACOS_CERTIFICATE` = base64-encoded .p12
     - `MACOS_CERTIFICATE_PWD` = password for the .p12
     - `APPLE_ID` = your Apple ID email
     - `APPLE_APP_SPECIFIC_PASSWORD` = app-specific password from appleid.apple.com
     - `APPLE_TEAM_ID` = your Apple Developer Team ID
  4. The desktop workflow already supports signing — it will automatically
     use these secrets when present and produce signed + notarized builds

#### Windows — Code Signing Certificate
- **Cost**: ~$200/year (varies by provider)
- **Providers**: DigiCert, Sectigo, or via Azure Key Vault
- **What to do after purchase**:
  1. Export the certificate as a .pfx file
  2. Add GitHub secrets:
     - `WINDOWS_CERTIFICATE` = base64-encoded .pfx
     - `WINDOWS_CERTIFICATE_PWD` = password
  3. Update `.github/workflows/desktop.yml` Windows job to import and use the cert
     (the macOS signing logic is already there as a template)

### 3. support@lazynext.com Email Setup

The email `support@lazynext.com` is referenced in:
- SECURITY.md
- CONTRIBUTING.md
- CODE_OF_CONDUCT.md
- Landing page footer
- Git commit identity

**What to do**:
1. Set up email forwarding or a mailbox for `support@lazynext.com`
2. Options: Google Workspace ($6/mo), Cloudflare Email Routing (free),
   or a helpdesk tool like Linear/Zendesk

### 4. GCP Account Migration (When ready)

Currently using `support@devinedesk.com` for GCP/Vertex AI.
The migration guide is at `docs/gcp-migration-guide.md`.

**When you have `support@lazynext.com` as a Google account**:
1. Create a new GCP project (e.g., `lazynext-ai-prod`)
2. Enable Vertex AI API
3. Set up billing
4. Run: `gcloud auth application-default login` with the new account
5. Update `.env`: `GCP_PROJECT_ID=new-project-id`
6. Restart the dev server

### 5. concrete-drake-spwwt Project (avaspatel99@gmail.com)

This project is owned by another organization ("AIDA") and cannot be deleted
by `avaspatel99@gmail.com` (insufficient permissions).

**Options**:
- Contact whoever owns the AIDA organization and ask them to remove
  `avaspatel99@gmail.com` from the project IAM
- Or leave it — it costs nothing and has no connection to Lazynext

### 6. Social Media & Marketing

- [ ] Create `@lazynext` accounts on Twitter/X, LinkedIn, YouTube
- [ ] Record a demo video showing AI chat → video editing workflow
- [ ] Write a launch blog post
- [ ] Submit to product directories (Product Hunt, etc.)

### 7. Optional: Analytics

To track usage adoption, add an analytics provider:
- **PostHog** (open-source, self-host or cloud) — recommended
- **Google Analytics** — free but Google-centric
- **Plausible** — privacy-focused, lightweight

Add the tracking snippet to `landing/index.html` or integrate into the
desktop app's error reporter (see `src/telemetry/errorReporter.ts`).

### 8. Optional: Community

- [ ] Enable GitHub Discussions (repo settings)
- [ ] Create a Discord server for community support
- [ ] Set up a support email workflow (Linear, Zendesk, or Freshdesk)
