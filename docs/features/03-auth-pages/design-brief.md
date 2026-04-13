# Design Brief — Auth Pages

> **Feature**: 03 — Auth Pages
> **Date**: 2026-04-05
> **Target Fidelity**: Mockup

---

## Overview

**What**: Sign Up and Sign In pages with a split-panel layout, social login options (Google, GitHub), email/password forms, and view toggling between the two states.
**Why**: Provide a frictionless, trustworthy entry point for new users to create accounts and existing users to sign in, with social login reducing registration barriers.
**Where**: /signup and /signin routes (or single route with view toggle).

---

## Target Users

- **New users**: Need a fast sign-up path with minimal friction (social login or email). Need reassurance ("No credit card required").
- **Returning users**: Need quick sign-in with remembered credentials or social login. Need "Forgot password?" recovery path.

---

## Requirements

### Must Have
- [x] Split layout: Left brand panel (blue gradient, desktop only) + right form panel
- [x] Sign Up view: "Create your account" heading, Google and GitHub social login buttons, "OR" divider, email + password form, "Create Account" CTA, "Already have an account? Sign in" toggle
- [x] Sign In view: "Welcome back" heading, Google and GitHub social login buttons, "OR" divider, email + password form with "Forgot password?" link, "Sign In" CTA, "Don't have an account? Sign up" toggle
- [x] Password visibility toggle (eye icon) on both forms
- [x] Terms of Service and Privacy Policy links on sign-up view
- [x] Left panel brand content: Lazynext logo, tagline "The operating system for work", 3 feature highlights (Decision DNA, Unified Workflows, AI-Powered Insights)
- [x] Mobile logo centered above form (when left panel is hidden)

### Nice to Have
- [x] Smooth opacity transition between Sign Up and Sign In views (0.25s ease)
- [x] Password toggle switches between text/password input types with eye icon swap

### Out of Scope
- Forgot password flow/page
- Email verification step
- Two-factor authentication UI
- Account settings or profile creation
- Actual OAuth integration

---

## Layout

**Page type**: Full page (split layout)
**Primary layout**: Two-column split (50/50 on desktop), single column on mobile
**Key sections** (in order):
1. **Left Panel** (desktop only): Blue gradient background (#4F6EF7 to #3D5BD4), Lazynext logo, tagline, 3 feature cards with icons, copyright footer
2. **Right Panel**: Centered form container (max-w-md), mobile logo (lg:hidden), Sign Up or Sign In view

---

## States & Interactions

| State | Description |
|---|---|
| **Default** | Sign Up view visible. Sign In view hidden (opacity 0, pointer-events none, position absolute). |
| **Sign In view** | After clicking "Sign in" link, Sign Up fades out and Sign In fades in via CSS opacity transition. |
| **Password hidden** | Password field shows dots. Eye-off icon visible. |
| **Password visible** | Password field shows plain text. Eye-on icon visible. |
| **Empty** | N/A -- forms start empty with placeholder text |
| **Loading** | Not designed in mockup -- would show button loading state on submit |
| **Error** | Not designed in mockup -- would show inline error messages below fields |
| **Success** | Not designed in mockup -- would redirect to onboarding |

**Key interactions**:
- **View toggle**: Click "Sign in" / "Sign up" links to switch between views with opacity transition
- **Password toggle**: Click eye icon to show/hide password
- **Social login**: Click Google or GitHub buttons (no backend in mockup)
- **Form submit**: Prevented in mockup (onsubmit="return false")

---

## Responsive Behavior

- **Mobile**: Left brand panel hidden entirely. Mobile logo appears centered above form. Form takes full width with p-6 padding.
- **Tablet**: Same as mobile until lg breakpoint.
- **Desktop** (lg+): Split layout. Left panel visible (w-1/2) with blue gradient. Right panel (w-1/2) with centered form.

---

## Content

| Element | Content Type | Example/Notes |
|---|---|---|
| **Left panel tagline** | Static | "The operating system for work" |
| **Left panel subtitle** | Static | "Everything your team needs to move fast and stay aligned." |
| **Feature 1** | Static | "Decision DNA -- Capture every decision with context, rationale, and quality scoring." |
| **Feature 2** | Static | "Unified Workflows -- Projects, tasks, docs, and decisions in one connected workspace." |
| **Feature 3** | Static | "AI-Powered Insights -- Get smart suggestions and analytics to keep your team on track." |
| **Sign Up heading** | Static | "Create your account" |
| **Sign Up subtitle** | Static | "Get started for free. No credit card required." |
| **Sign In heading** | Static | "Welcome back" |
| **Sign In subtitle** | Static | "Sign in to your Lazynext workspace." |
| **Email placeholder** | Static | "you@company.com" |
| **Password placeholder** | Static | "Create a password" (signup) / "Enter your password" (signin) |
| **Legal text** | Static | "By creating an account, you agree to our Terms of Service and Privacy Policy." |

---

## Constraints

- White background on form panel (body bg-white) -- NOT dark theme despite being an app entry point
- Inter font family (400-700 weights) from Google Fonts
- Tailwind CSS via CDN
- Primary color: #4F6EF7
- Left panel gradient: 135deg from #4F6EF7 to #3D5BD4
- View switching uses CSS class toggling (view-visible/view-hidden) rather than routing
- Forms use onsubmit="return false" in mockup
- No form validation implemented

---

## References

- Auth patterns: Supabase, Auth0, Linear sign-in pages
- Split-panel layout: Vercel, Supabase auth pages
- Social login: Google and GitHub OAuth button styling
