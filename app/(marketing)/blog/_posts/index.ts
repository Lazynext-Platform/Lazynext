// ─────────────────────────────────────────────────────────────
// Single source of truth for blog posts.
//
// Each post is its own file under `_posts/`. The list below is
// the publication order (newest first, by `dateTime`). Adding a
// post is a TWO-LINE change here:
//   1. import the new module
//   2. push it onto `posts`
//
// Consumers (listing page, slug page, sitemap) all read from this
// module. Featured selection is a property on the post itself.
// ─────────────────────────────────────────────────────────────

import type { Post } from './types'
import launching from './launching-lazynext'
import scoring from './how-decision-dna-scoring-works'
import wms from './workspace-maturity-score'
import instrumenting from './instrumenting-the-api'

/** Newest first. Keep manually sorted; the array is short. */
export const posts: readonly Post[] = [
  instrumenting,
  wms,
  scoring,
  launching,
]

/** Lookup table built once at module load. */
const bySlug: Readonly<Record<string, Post>> = Object.fromEntries(
  posts.map((p) => [p.slug, p]),
)

export function getPostBySlug(slug: string): Post | undefined {
  return bySlug[slug]
}

export function getAllSlugs(): string[] {
  return posts.map((p) => p.slug)
}

export type { Post, Tag, ContentBlock } from './types'
export { TAG_COLORS } from './types'
