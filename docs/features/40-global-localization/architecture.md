# Architecture: Global Localization (Feature 40)

## Overview

Lazynext is a global platform. This feature implements complete internationalization (i18n) and localization (l10n) infrastructure across all 7 platform formats: Web, Desktop, Mobile, Browser Extension, CLI, API Gateway, and MCP Server. Every language, country, and currency is supported through ISO standards rather than hardcoded lists.

## Architecture Decisions

### 1. Standards-Based Approach
- **Languages**: ISO 639-1 (2-letter codes) + BCP 47 locale tags (e.g. `en-US`, `fr-FR`)
- **Countries**: ISO 3166-1 alpha-2 codes stored in Rust registry crate
- **Currencies**: ISO 4217 codes with locale-aware formatting via `Intl.NumberFormat` (JS) and custom formatting (Rust)

### 2. Single Source of Truth
- Rust owns all business logic including the ISO data registry (`rust/crates/international/`)
- JS clients use the browser's built-in `Intl` API — no data duplication needed
- The `user` table in PostgreSQL stores per-user `locale`, `country`, and `currency` preferences

### 3. Layer Separation

```
┌─────────────────────────────────────────────────┐
│  UI Layer (7 apps)                              │
│  Web: next-intl    Mobile: react-i18next        │
│  Desktop: rust-i18n  Extension: chrome.i18n     │
│  CLI: sys-locale    MCP: inline i18n module     │
├─────────────────────────────────────────────────┤
│  API Gateway (Axum)                             │
│  Accept-Language middleware                     │
│  /api/v1/international/* endpoints              │
│  PUT /api/v1/user/locale                        │
├─────────────────────────────────────────────────┤
│  Rust Core                                      │
│  lazynext_international crate                   │
│  - 190 countries (ISO 3166-1)                   │
│  - 100+ currencies (ISO 4217)                   │
│  - format_currency(), validate_locale()          │
├─────────────────────────────────────────────────┤
│  Database (PostgreSQL)                          │
│  user.locale, user.country, user.currency       │
└─────────────────────────────────────────────────┘
```

## Component Details

### Rust: `lazynext_international` Crate
- `countries.rs` — 190 Country structs with code, name, native_name, continent, locale, currency, calling_code, is_eu
- `currencies.rs` — 100+ Currency structs with code, numeric, name, symbol, decimals, symbol_before
- `format.rs` — `format_currency()`, `country_to_currency()`, `country_to_locale()`, `validate_locale()`
- 6 unit tests covering USD/EUR/JPY/INR formatting, country-to-currency lookup, and locale validation

### API Gateway Endpoints
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/international/countries` | All ISO 3166-1 countries |
| GET | `/api/v1/international/currencies` | All ISO 4217 currencies |
| POST | `/api/v1/international/format-currency` | Locale-aware currency formatting |
| PUT | `/api/v1/user/locale` | Update user's locale/country/currency |
| GET | `/api/v1/user/profile` | Returns profile with locale/country/currency |
| Middleware | `extract_locale_middleware` | Parses Accept-Language header per request |

### Web App Architecture
- **next-intl** provides Server and Client Component translation support
- **18 message catalogs** in `apps/web/messages/{lang}.json` with 120+ keys across 8 namespaces
- **Proxy middleware** (Next.js 16) handles i18n routing + auth guard
- **i18n.ts** determines locale from: cookie → Accept-Language header → default `en`
- **RTL support**: `<html dir="rtl">` set for Arabic locale
- **LocaleSelector**: Dropdown with 18 languages (flags + names)
- **CountrySelector**: Searchable dropdown with all 190 countries
- **CurrencySelector**: Dropdown with 45 common currencies (Intl-backed)

### Dodo Payments Integration
- Checkout route accepts `currency` parameter
- Dodo API receives the user's preferred ISO 4217 currency code
- All supported currencies passthrough to Dodo's native multi-currency support

## Translation Pipeline

| Language | Code | API Gateway | CLI | Desktop | Web | Mobile | Extension | MCP |
|----------|------|:--:|:--:|:--:|:--:|:--:|:--:|:--:|
| English | en | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| French | fr | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Spanish | es | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| German | de | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Japanese | ja | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Korean | ko | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Chinese | zh | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Hindi | hi | E | E | E | ✓ | E | E | E |
| Arabic | ar | E | E | E | ✓ | E | E | E |
| Portuguese | pt | E | E | E | ✓ | E | E | E |
| Russian | ru | E | E | E | ✓ | E | E | E |
| Italian | it | E | E | E | ✓ | E | E | E |
| Dutch | nl | E | E | E | ✓ | E | E | E |
| Polish | pl | E | E | E | ✓ | E | E | E |
| Turkish | tr | E | E | E | ✓ | E | E | E |
| Thai | th | E | E | E | ✓ | E | E | E |
| Vietnamese | vi | E | E | E | ✓ | E | E | E |
| Indonesian | id | E | E | E | ✓ | E | E | E |

> ✓ = Translated | E = English placeholder (infrastructure exists, needs translator)

## Currency Support
All 100+ ISO 4217 currencies are supported. The registry includes:
- Code, numeric identifier, full name, symbol
- Minor unit exponent (decimals): 2 for USD/EUR, 0 for JPY/KRW, 3 for BHD/KWD
- Symbol positioning: before ($100) or after (100 €)
- Locale-aware thousands/decimal separators

## File Structure
```
lazynext/
├── rust/crates/international/     # ISO data registry (single source of truth)
│   └── src/{lib, countries, currencies, format}.rs
├── rust/api-gateway/
│   ├── locales/{18 lang}.yml      # API Gateway translations
│   └── src/international.rs       # i18n API endpoints
├── rust/cli/locales/{18 lang}.yml # CLI translations
├── apps/desktop/locales/{18 lang}.yml # Desktop translations
├── apps/web/
│   ├── messages/{18 lang}.json    # Web message catalogs (120+ keys)
│   ├── src/i18n.ts                # next-intl config
│   └── src/components/
│       ├── locale-selector.tsx    # LocaleSelector + CurrencySelector
│       └── country-selector.tsx   # CountrySelector (190 countries)
├── apps/mobile/locales/{18 lang}.json # Mobile translations
├── apps/browser-extension/public/_locales/{18 lang}/  # Extension translations
├── services/mcp-server/src/i18n.ts  # MCP inline translations
└── docs/
    ├── i18n.md                    # Translation pipeline documentation
    └── features/40-global-localization/  # Feature docs
```
