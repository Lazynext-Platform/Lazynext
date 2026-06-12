import { createAuthClient } from "better-auth/react";

// Use process.env directly — Next.js inlines NEXT_PUBLIC_* at build time.
// Importing webEnv from @/env/web fails client-side because zod validation
// accesses process.env vars that are undefined in the browser.
const baseURL = typeof window !== "undefined" 
  ? window.location.origin 
  : process.env.NEXT_PUBLIC_SITE_URL || "https://lazynext.com";

export const { signIn, signUp, useSession } = createAuthClient({ baseURL });
