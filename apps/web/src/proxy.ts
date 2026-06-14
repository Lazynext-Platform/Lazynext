import { NextResponse, type NextRequest } from "next/server";

export async function proxy(request: NextRequest) {
	// Check for better-auth session cookies
	// better-auth uses "better-auth.session_token" or "__Secure-better-auth.session_token"
	const sessionToken =
		request.cookies.get("better-auth.session_token")?.value ||
		request.cookies.get("__Secure-better-auth.session_token")?.value;

	if (!sessionToken) {
		// If there is no session token, redirect to the sign-in page
		const signInUrl = new URL("/sign-in", request.url);
		// Optionally preserve the original URL to redirect back after sign-in
		signInUrl.searchParams.set("callbackUrl", request.url);
		return NextResponse.redirect(signInUrl);
	}

	return NextResponse.next();
}

// Protect all private routes
export const config = {
	matcher: [
		"/dashboard/:path*",
		"/editor/:path*",
		"/projects/:path*",
		"/settings/:path*",
		"/billing/:path*",
	],
};
