/**
 * @module auth/client
 * @description Client-side auth utilities — creates a Better Auth
 *   client and re-exports sign-in, sign-up, sign-out, session,
 *   password-reset, social OAuth, magic link, and MFA/TOTP hooks.
 */

import { createAuthClient } from "better-auth/react";
import {
	twoFactorClient,
	magicLinkClient,
} from "better-auth/client/plugins";

const baseURL =
	typeof window !== "undefined"
		? window.location.origin
		: process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

export const authClient = createAuthClient({
	baseURL,
	plugins: [
		twoFactorClient(),
		magicLinkClient(),
	],
});

export const {
	signIn,
	signUp,
	signOut,
	useSession,
} = authClient;

export const requestPasswordReset = authClient.requestPasswordReset;

export const resetPassword = authClient.resetPassword;
