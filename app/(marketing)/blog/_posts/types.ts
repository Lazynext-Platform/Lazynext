// ─────────────────────────────────────────────────────────────
// Blog post type contract.
//
// Each post lives in its own file under `_posts/` and exports a
// default `Post` object. The leading underscore on `_posts/`
// keeps Next.js from treating the folder as a route segment.
//
// Adding a post is a SINGLE file edit:
//   1. Create `app/(marketing)/blog/_posts/<slug>.ts`.
//   2. Add the import + entry in `_posts/index.ts`.
//
// `app/sitemap.ts`, `app/(marketing)/blog/page.tsx`, and
// `app/(marketing)/blog/[slug]/page.tsx` all derive their data
// from the aggregated `posts` array \u2014 no second place to update.
// ─────────────────────────────────────────────────────────────

export type Tag = 'Product' | 'Engineering' | 'Company' | 'Launch'

export type ContentBlock =
  | { type: 'p'; text: string }
  | { type: 'h2'; text: string }
  | { type: 'h3'; text: string }
  | { type: 'ul'; items: string[] }
  | { type: 'blockquote'; text: string }
  | { type: 'code'; text: string; lang?: string }

export interface Post {
  slug: string
  title: string
  excerpt: string
  /** ISO-format date string, e.g. '2026-04-18'. Used for sitemap + sort key. */
  dateTime: string
  /** Pre-formatted display date, e.g. 'April 18, 2026'. */
  date: string
  tag: Tag
  /** Marks the hero post on the listing page. At most one should have this true. */
  featured?: boolean
  content: ContentBlock[]
}

export const TAG_COLORS: Record<Tag, string> = {
  Product: 'bg-indigo-100 text-indigo-700',
  Engineering: 'bg-emerald-100 text-emerald-700',
  Company: 'bg-amber-100 text-amber-700',
  Launch: 'bg-pink-100 text-pink-700',
}
