/**
 * @module proxy
 * @description Next.js proxy — auth guard + route protection.
 * Replaces middleware.ts (deprecated in Next.js 16).
 */

import { NextResponse, type NextRequest } from "next/server";

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

export async function proxy(request: NextRequest) {
	const { pathname } = request.nextUrl;

	const sessionToken =
		request.cookies.get("better-auth.session_token")?.value ||
		request.cookies.get("__Secure-better-auth.session_token")?.value;

	const isProtected = PROTECTED_PATHS.some(
		(p) => pathname === p || pathname.startsWith(`${p}/`),
	);

	const isAuth = AUTH_PATHS.some(
		(p) => pathname === p || pathname.startsWith(`${p}/`),
	);

	if (isProtected && !sessionToken) {
		const signInUrl = new URL("/sign-in", request.url);
		signInUrl.searchParams.set("redirect", pathname);
		return NextResponse.redirect(signInUrl);
	}

	if (isAuth && sessionToken) {
		return NextResponse.redirect(new URL("/dashboard", request.url));
	}

	return NextResponse.next();
}

/** Utility representing config. */
export const config = {
	matcher: [
		"/dashboard/:path*",
		"/editor/:path*",
		"/billing/:path*",
		"/settings/:path*",
		"/profile/:path*",
		"/projects/:path*",
		"/admin/:path*",
		"/super-admin/:path*",
		"/superadmin/:path*",
		"/sign-in",
		"/sign-up",
		"/forgot-password",
		"/reset-password",
	],
};
