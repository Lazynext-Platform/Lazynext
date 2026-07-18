/**
 * @module proxy
 * @description Next.js proxy — auth guard + route protection + i18n routing.
 * Replaces middleware.ts (deprecated in Next.js 16).
 */

import { NextResponse, type NextRequest } from "next/server";
import createMiddleware from 'next-intl/middleware';

const PROTECTED_PATHS = [
	"/dashboard",
	"/editor",
	"/billing",
	"/settings",
	"/profile",
	"/projects",
	"/admin",
	"/super-admin",
	"/superadmin",
];

const AUTH_PATHS = [
	"/sign-in",
	"/sign-up",
	"/forgot-password",
	"/reset-password",
];

const intlMiddleware = createMiddleware({
  locales: ['en', 'fr', 'es'],
  defaultLocale: 'en'
});

export async function proxy(request: NextRequest) {
	const { pathname } = request.nextUrl;

    // Remove locale prefix for auth path checking
    const pathnameWithoutLocale = pathname.replace(/^\/(en|fr|es)/, '') || '/';

	const sessionToken =
		request.cookies.get("better-auth.session_token")?.value ||
		request.cookies.get("__Secure-better-auth.session_token")?.value;

	const isProtected = PROTECTED_PATHS.some(
		(p) => pathnameWithoutLocale === p || pathnameWithoutLocale.startsWith(`${p}/`),
	);

	const isAuth = AUTH_PATHS.some(
		(p) => pathnameWithoutLocale === p || pathnameWithoutLocale.startsWith(`${p}/`),
	);

	if (isProtected && !sessionToken) {
		const signInUrl = new URL("/sign-in", request.url);
		signInUrl.searchParams.set("redirect", pathname);
		return NextResponse.redirect(signInUrl);
	}

	if (isAuth && sessionToken) {
		return NextResponse.redirect(new URL("/dashboard", request.url));
	}

	return intlMiddleware(request);
}

/** Utility representing config. */
export const config = {
	matcher: [
        "/((?!api|_next|_vercel|.*\\..*).*)",
	],
};
