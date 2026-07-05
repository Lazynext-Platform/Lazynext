/**
 * @module auth/client
 * @description Client-side auth utilities — creates a Better Auth
 *   client and re-exports the sign-in, sign-up, sign-out, session,
 *   and password-reset hooks.
 */

import { createAuthClient } from "better-auth/react";

const baseURL =
	typeof window !== "undefined"
		? window.location.origin
		: process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

const authClient = createAuthClient({ baseURL });

export const { signIn, signUp, signOut, useSession } = authClient;

export const requestPasswordReset = authClient.requestPasswordReset;

export const resetPassword = authClient.resetPassword;
