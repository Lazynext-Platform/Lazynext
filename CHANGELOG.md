# Changelog

All notable changes to Lazynext will be documented in this file.

## [0.1.0.0] - 2026-04-16

### Added
- Marketing pages: Privacy Policy, Terms of Service, Contact, Careers, and Documentation
- Official Lazynext logo across all app layouts, sidebar, top bar, error pages, and marketing site
- Development mode auth bypass when Supabase is not configured, so you can explore the UI without a database
- New public routes in middleware for all marketing pages
- Business model canvas documentation

### Changed
- Replaced placeholder logo references with official brand assets (logo-dark.png, logo-transparent.png)
- Relaxed Content Security Policy in development mode to support HMR websocket connections
- Currency formatting now uses narrow currency symbols for cleaner display
