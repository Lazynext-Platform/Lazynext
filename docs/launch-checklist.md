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
- [x] Launch blog post written (docs/blog/launch-announcement.md)
- [x] Social media profile content prepared (docs/social-media-profiles.md)
- [x] Code signing setup guide (docs/code-signing-setup.md)
- [x] Demo video script (docs/demo-video-script.md)
- [x] Email DNS verified — lazynext.com MX record points to smtp.google.com (Gmail forwarding active)

## Requires External Action

### 1. GitHub Social Preview Image (Uploaded via Playwright automation)

The OG image at `assets/og-image.png` (1280x640) has been uploaded to GitHub
via Playwright browser automation.

**Status**: Uploaded successfully. GitHub GraphQL API confirms:
- `usesCustomOpenGraphImage: true`
- `openGraphImageUrl` is set to a `repository-images.githubusercontent.com` URL
- The `og:image` meta tag on the repo page points to the uploaded image

The image may take time to propagate through GitHub's CDN cache. If the
thumbnail doesn't appear immediately on the settings page, wait a few hours
and refresh. The API-level metadata is already set correctly.

### 2. Code Signing Certificates (Paid, required for production distribution)

**Playwright automation status**: Navigated to both purchase pages:
- Apple Developer enrollment: https://developer.apple.com/programs/enroll/
- DigiCert code signing: https://www.digicert.com/signing/code-signing-certificates

Both require account creation, identity verification, and payment —
cannot be completed via automation.

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

**DNS status (verified)**: `lazynext.com` MX record is `1 smtp.google.com` —
email is already routed through Gmail forwarding. Emails sent to
`@lazynext.com` addresses are forwarded to a configured Gmail account.

**What to verify**:
1. Confirm which Gmail account receives forwarded `@lazynext.com` emails
   (check Gmail forwarding settings or Spaceship/Namecheap DNS control panel)
2. If `support@lazynext.com` isn't already an alias, add it in the DNS control panel
3. For a professional mailbox (instead of forwarding), consider Google Workspace ($6/mo)

### 4. GCP Account Plan (Current: support@devinedesk.com → Future: support@lazynext.com)

**Current setup**: Using `support@devinedesk.com` for all GCP/Vertex AI models.
Project: `lazynext-ai` | Region: `us-central1` | Billing: `0109DF-FA3450-4B5459`

**Only two GCP accounts are used for this project**:
- `support@devinedesk.com` — current, active now
- `support@lazynext.com` — future, will migrate in 1-2 months

**No other GCP accounts are used.** The old `avaspatel99@gmail.com` account
has been cleaned up (8 projects deleted). Only `concrete-drake-spwwt` remains
but is owned by another organization (AIDA) and is not used by Lazynext.

**Migration plan (in 1-2 months)**:
1. Create `support@lazynext.com` as a Google account
2. Create a new GCP project (e.g., `lazynext-ai-prod`)
3. Enable Vertex AI API
4. Set up billing
5. Run: `gcloud auth application-default login` with the new account
6. Update `.env`: `GCP_PROJECT_ID=lazynext-ai-prod`
7. Restart the dev server
8. Full migration guide: `docs/gcp-migration-guide.md`

### 5. concrete-drake-spwwt Project (avaspatel99@gmail.com)

This project is owned by another organization ("AIDA") and cannot be deleted
by `avaspatel99@gmail.com` (insufficient permissions).

**Options**:
- Contact whoever owns the AIDA organization and ask them to remove
  `avaspatel99@gmail.com` from the project IAM
- Or leave it — it costs nothing and has no connection to Lazynext

### 6. Social Media & Marketing

**Account creation status (attempted via Playwright automation)**:

- [x] Navigated to Twitter/X signup page — blocked by anti-bot detection.
      Requires manual signup with email/phone verification.
      Bio and profile content ready in `docs/social-media-profiles.md`.
- [x] Navigated to LinkedIn company page creation — requires personal
      LinkedIn account with email verification first.
      Company page content ready in `docs/social-media-profiles.md`.
- [x] Navigated to YouTube channel creation — requires Google account
      sign-in first.
      Channel description ready in `docs/social-media-profiles.md`.

**All three platforms require email/phone verification that cannot be
automated. Use the ready-made bios in `docs/social-media-profiles.md`.**

- [ ] Record a demo video showing AI chat → video editing workflow
      (script ready in `docs/demo-video-script.md`)
- [x] Write a launch blog post (docs/blog/launch-announcement.md)
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
