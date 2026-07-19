/**
 * @module proxy
 * @description Next.js 16 proxy — auth guard only.
 * i18n routing is handled by next-intl plugin in next.config.ts.
 */

import { NextResponse, type NextRequest } from "next/server";

const PROTECTED = ["/dashboard", "/editor", "/billing", "/settings", "/profile", "/projects", "/admin", "/super-admin", "/superadmin"];
const AUTH = ["/sign-in", "/sign-up", "/forgot-password", "/reset-password"];
const LOCALES = ["en","fr","es","de","ja","ko","zh","hi","ar","pt","ru","it","nl","pl","tr","th","vi","id"];

function stripLocale(pathname: string): string {
	for (const l of LOCALES) {
		if (pathname === `/${l}`) return "/";
		if (pathname.startsWith(`/${l}/`)) return pathname.slice(l.length + 1);
	}
	return pathname;
}

export async function proxy(request: NextRequest) {
	const pathname = request.nextUrl.pathname;

	// Set NEXT_LOCALE cookie from URL prefix so i18n.ts picks it up
	const m = pathname.match(/^\/([a-z]{2})(\/|$)/);
	if (m && LOCALES.includes(m[1])) {
		const resp = NextResponse.next();
		resp.cookies.set("NEXT_LOCALE", m[1], { path: "/", maxAge: 31536000 });
	}

	const clean = stripLocale(pathname);
	const token = request.cookies.get("better-auth.session_token")?.value
		|| request.cookies.get("__Secure-better-auth.session_token")?.value;

	const isProtected = PROTECTED.some(p => clean === p || clean.startsWith(`${p}/`));
	const isAuth = AUTH.some(p => clean === p || clean.startsWith(`${p}/`));

	if (isProtected && !token) {
		const url = new URL("/en/sign-in", request.url);
		url.searchParams.set("redirect", pathname);
		return NextResponse.redirect(url);
	}
	if (isAuth && token) {
		return NextResponse.redirect(new URL("/en/dashboard", request.url));
	}

	// SEO: redirect root to /en
	if (pathname === "/") {
		return NextResponse.redirect(new URL("/en", request.url));
	}

	return NextResponse.next();
}

export const config = {
	matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"],
};
