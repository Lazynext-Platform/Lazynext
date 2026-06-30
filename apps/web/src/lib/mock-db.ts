// Re-export from real admin-data service.
// Kept for backward compatibility with any remaining imports.
// Prefer importing from @/lib/admin-data directly.
export { adminData as mockDb } from "./admin-data";
