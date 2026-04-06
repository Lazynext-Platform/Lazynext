# 💬 Feature Discussion — Auth Pages

> **Feature**: 03 — Auth Pages
> **Status**: 🟢 COMPLETE
> **Date**: 2026-04-06

---

## What Are We Building?

Split-panel auth layout wrapping Clerk's `<SignIn />` and `<SignUp />` components. Left panel shows brand messaging (blue gradient, logo, tagline, 3 feature cards). Right panel centers the Clerk form. Left panel hidden on mobile with a compact logo shown instead.

## Why?

Auth pages are the trust-building moment. The branded left panel reinforces value while the user creates their account. Using Clerk handles auth logic while we control the visual experience.

## Decisions

| Decision | Choice | Rationale |
| --- | --- | --- |
| Form approach | Clerk components with customized appearance | Clerk handles OAuth, email/password, validation, and security. Customized with brand colors via `appearance` prop. |
| Layout | Server component layout + Clerk client components | Layout is static (server), Clerk handles interactivity |
| Left panel content | 3 feature highlights | Mirrors landing page selling points without overwhelming |

## Discussion Complete ✅
