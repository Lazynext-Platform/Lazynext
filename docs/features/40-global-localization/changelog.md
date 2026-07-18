# Changelog: Global Localization

## Session Note — 2026-07-19

- **Who**: AI Agent (opencode)
- **Worked On**: Complete global localization infrastructure across all 7 platform formats.
- **Key Results**:
  - **Database**: Added `locale`, `country`, and `currency` columns to the `user` table. Generated Drizzle migration `0006`.
  - **API Gateway (Rust)**: Added `rust-i18n` with `Accept-Language` middleware. Created en/fr/es locale files. Health endpoint returns localized welcome messages.
  - **CLI (Rust)**: Wired `sys-locale` and `rust-i18n` at startup. CLI output now respects OS terminal language.
  - **Web App (Next.js)**: Integrated `next-intl` with `[locale]` routing. Merged i18n proxy with existing auth guard. Converted landing page and dashboard to use `useTranslations()`. Added en/fr/es message catalogs.
  - **Mobile App (React Native)**: Integrated `react-i18next` and `expo-localization`. Added `@formatjs/intl-*` polyfills for Hermes engine. Created locale-aware dashboard.
  - **Desktop App (GPUI)**: Added `rust-i18n` and created `tr!()` GPUI-compatible macro. Localized all UI strings in dashboard.rs and editor.rs. Created en/fr/es Fluent-style locale files.
  - **Browser Extension (Chrome MV3)**: Setup `chrome.i18n` with `_locales/` structure. Added manifest `__MSG_*__` references. Created `t()` helper for content script popup strings.
  - **MCP Server (Node.js)**: Added inline i18n module with en/fr/es support. Error messages and prompt responses now locale-aware via `MCP_LOCALE` env var.
- **Verification**: All 3 Rust crates (api-gateway, cli, desktop) compile cleanly. Web app builds and generates static pages. MCP server TypeScript passes type check. Mobile app dependencies installed.
- **Locale Coverage**: English (en), French (fr), Spanish (es) — infrastructure supports adding any ISO 639-1 locale.
- **Currency Support**: Intl.NumberFormat (web/mobile) and future ICU4X (Rust) handle all ISO 4217 currencies. DB stores user's preferred currency.
