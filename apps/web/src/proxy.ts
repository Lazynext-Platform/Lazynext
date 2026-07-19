/**
 * @module proxy
 * @description Next.js 16 proxy — i18n routing + auth guard.
 */

import { NextResponse, type NextRequest } from "next/server";

const LOCALES = ["en","fr","es","de","ja","ko","zh","hi","ar","pt","ru","it","nl","pl","tr","th","vi","id"];
const PROTECTED = ["/dashboard", "/editor", "/billing", "/settings", "/profile", "/projects", "/admin", "/super-admin", "/superadmin"];
const AUTH = ["/sign-in", "/sign-up", "/forgot-password", "/reset-password"];

function stripLocale(pathname: string): string {
	for (const l of LOCALES) {
		if (pathname === `/${l}`) return "/";
		if (pathname.startsWith(`/${l}/`)) return pathname.slice(l.length + 1);
	}
	return pathname;
}

export async function proxy(request: NextRequest) {
	const pathname = request.nextUrl.pathname;

	// Detect locale from URL and store in cookie for subsequent requests
	const m = pathname.match(/^\/([a-z]{2})(\/|$)/);
	const detectedLocale = (m && LOCALES.includes(m[1])) ? m[1] : null;

	const clean = stripLocale(pathname);
	const token = request.cookies.get("better-auth.session_token")?.value
		|| request.cookies.get("__Secure-better-auth.session_token")?.value;

	const isProtected = PROTECTED.some(p => clean === p || clean.startsWith(`${p}/`));
	const isAuth = AUTH.some(p => clean === p || clean.startsWith(`${p}/`));

	if (isProtected && !token) {
		const prefix = detectedLocale ? `/${detectedLocale}` : "/en";
		const url = new URL(`${prefix}/sign-in`, request.url);
		url.searchParams.set("redirect", pathname);
		return NextResponse.redirect(url);
	}
	if (isAuth && token) {
		const prefix = detectedLocale ? `/${detectedLocale}` : "/en";
		return NextResponse.redirect(new URL(`${prefix}/dashboard`, request.url));
	}

	// Redirect root to /en
	if (pathname === "/") {
		const cookie = request.cookies.get("NEXT_LOCALE")?.value;
		const locale = cookie || "en";
		return NextResponse.redirect(new URL(`/${locale}`, request.url));
	}

	const resp = NextResponse.next();
	if (detectedLocale) {
		resp.cookies.set("NEXT_LOCALE", detectedLocale, { path: "/", maxAge: 31536000 });
	}
	return resp;
}

export const config = {
	matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"],
};
