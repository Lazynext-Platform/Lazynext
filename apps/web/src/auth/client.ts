/**
 * @module auth/client
 * @description Client-side auth utilities — creates a Better Auth
 *   client and re-exports the sign-in, sign-up, sign-out, and session
 *   hooks.
 */

import { createAuthClient } from "better-auth/react";

const baseURL =
	typeof window !== "undefined"
		? window.location.origin
		: process.env.NEXT_PUBLIC_SITE_URL || "https://lazynext.com";

const authClient = createAuthClient({ baseURL });
export const { signIn, signUp, signOut, useSession } = authClient;
export const forgetPassword =
	(authClient as any).requestPasswordReset ||
	(authClient as any).forgetPassword;
export const resetPassword = (authClient as any).resetPassword;
