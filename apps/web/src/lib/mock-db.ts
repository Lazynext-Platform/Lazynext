/**
 * Backward-compatible re-export of the real admin-data service.
 *
 * Previously this module contained mock data; it now re-exports live
 * PostgreSQL queries from `@/lib/admin-data`. Prefer importing from
 * `@/lib/admin-data` directly.
 *
 * @module lib/mock-db
 */

// Re-export from real admin-data service.
// Kept for backward compatibility with any remaining imports.
// Prefer importing from @/lib/admin-data directly.
export { adminData as mockDb } from "./admin-data";
