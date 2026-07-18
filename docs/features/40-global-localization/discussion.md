# Global Platform Support (Languages, Countries, Currencies)

## Objective
Lazynext is a global platform and must natively support:
1. **Every Language** (via standard i18n workflows, Accept-Language headers, and UI translations).
2. **Every Country** (via localized formatting for dates, times, layout directions RTL/LTR, and ISO 3166-1 alpha-2 flags).
3. **Every Currency** (via localized price displays, formatting using Intl, and ISO 4217, integrating globally with Dodo Payments).
This must be supported consistently across all 7 platform formats:
1. **Web App Shell** (Next.js)
2. **Desktop App** (GPUI / Rust Native)
3. **Mobile App** (React Native)
4. **Browser Extension** (Chrome MV3)
5. **CLI Tool** (Rust Headless)
6. **API Gateway** (Axum / Rust)
7. **MCP Server** (Node.js)

## Core Decisions
- **User Preferences**: The `user` table in PostgreSQL will be updated to store `locale` (e.g., `en-US`), `country` (e.g., `US`), and preferred `currency` (e.g., `USD`). 
- **Standard**: We will rely exclusively on the `Intl` API in JS environments and `icu` / `fluent` in Rust environments. We will not maintain hardcoded country/currency lists—we map to standard ISO registries.
- **UI Architecture**:
  - *Web*: `next-intl` (Server & Client component support).
  - *Mobile*: `react-i18next` with `expo-localization`.
  - *Desktop*: `rust-i18n` with Fluent syntax mapped natively into GPUI.
  - *Extension*: `chrome.i18n`.
- **API & MCP**: 
  - API Gateway parses `Accept-Language` middleware and formats error messages/responses.
  - MCP Server receives locale context to ensure AI Agents return descriptions and tasks in the user's localized language.

## Format Overviews
1. **Web**: Next.js middleware detects locale, routes to `/[locale]/page`, translations live in `messages/`.
2. **API Gateway**: Axum middleware extracts `Accept-Language`.
3. **Desktop**: GPUI context loads `.ftl` (Fluent) files for UI elements.
4. **Mobile**: React Native uses native OS locale by default unless overridden in DB.
5. **CLI**: Clap outputs map to terminal locale via `sys-locale` crate.
6. **Extension**: Standard `_locales/en/messages.json` format.
7. **MCP**: Client sends `config.locale` during initialization.

## Next Steps
We will proceed step-by-step starting with Database Schema extensions, then API Gateway, then UI Clients.