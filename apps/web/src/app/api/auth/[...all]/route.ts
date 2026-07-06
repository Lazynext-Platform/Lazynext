/**
 * @module Better Auth route handler — delegates all auth requests (GET, POST)
 * to the Better Auth library via the Next.js handler adapter.
 */

import { auth } from "@/auth/server";
import { toNextJsHandler } from "better-auth/next-js";

export const { GET, POST } = toNextJsHandler(auth);
