# 💬 Feature Discussion — Auth Pages

> **Feature**: 03 — Auth Pages
> **Status**: 🟢 COMPLETE
> **Date**: 2026-04-06

---

## What Are We Building?

Split-panel auth layout with custom Supabase Auth forms. Left panel shows brand messaging (blue gradient, logo, tagline, 3 feature cards). Right panel centers the auth form with email/password + OAuth buttons. Left panel hidden on mobile with a compact logo shown instead.

## Why?

Auth pages are the trust-building moment. The branded left panel reinforces value while the user creates their account. Using Supabase Auth handles auth logic while we control the visual experience.

## Decisions

| Decision | Choice | Rationale |
| --- | --- | --- |
| Form approach | Custom forms with Supabase Auth | Supabase handles OAuth, email/password, and session management. Custom forms give us full control over the UI. |
| Layout | Server component layout + client auth forms | Layout is static (server), auth forms handle interactivity |
| Left panel content | 3 feature highlights | Mirrors landing page selling points without overwhelming |

## Discussion Complete ✅
