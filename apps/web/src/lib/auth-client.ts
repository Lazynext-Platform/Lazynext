/**
 * Better Auth client instance for the Next.js app.
 *
 * Initializes the authentication client pointing to the site URL
 * configured via `NEXT_PUBLIC_SITE_URL` (falls back to localhost:3000).
 *
 * @module lib/auth-client
 */

import { createAuthClient } from "better-auth/react";

const baseURL =
	typeof window !== "undefined"
		? window.location.origin
		: process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

export const authClient = createAuthClient({ baseURL });
