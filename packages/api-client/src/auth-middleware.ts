/**
 * JWT Auth Middleware — Express/Typescript middleware that validates
 * Better Auth HS256 JWTs against BETTER_AUTH_SECRET.
 *
 * Also reads BETTER_AUTH_SECRET_FILE for Docker secret mounting.
 * Falls back to a dev key ONLY when NODE_ENV is not "production".
 * In production, refuses to start if no secret is configured.
 *
 * Supports tokens from: email/password, Google, Apple, Microsoft OAuth,
 * Magic Link, Passkeys, SSO/OIDC, and MFA-verified sessions.
 *
 * Exports:
 *   authMiddleware — Express middleware (applies to all routes)
 *   requireAuth — Express middleware (applies to specific routes)
 *   requireMfa — Express middleware (requires MFA-verified session)
 *   optionalAuth — attaches user if token present, never rejects
 */

import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { readFileSync } from "fs";

/** Parsed JWT claims extracted by the auth middleware. */
export interface AuthClaims {
	/** Subject user ID. */
	sub: string;
	/** User email address. */
	email: string;
	/** User display name. */
	name: string;
	/** User role. */
	role: string;
	/** Whether the email has been verified. */
	emailVerified?: boolean;
	/** Auth provider used for this session. */
	provider?: string;
	/** Whether this session passed MFA/2FA verification. */
	mfaVerified?: boolean;
	/** Whether the user has MFA enabled on their account. */
	mfaEnabled?: boolean;
	/** Issued-at timestamp. */
	iat: number;
	/** Expiration timestamp. */
	exp: number;
}

declare global {
	namespace Express {
		interface Request {
			user?: AuthClaims;
		}
	}
}

let _secret: string | null = null;

function getSecret(): string {
	if (_secret) return _secret;

	const envSecret = process.env.BETTER_AUTH_SECRET;
	if (envSecret && envSecret.length >= 32) {
		_secret = envSecret;
		return _secret;
	}

	const filePath = process.env.BETTER_AUTH_SECRET_FILE;
	if (filePath) {
		try {
			const content = readFileSync(filePath, "utf-8").trim();
			if (content && content.length >= 32) {
				_secret = content;
				return _secret;
			}
		} catch { /* fall through */ }
		throw new Error(
			`FATAL: BETTER_AUTH_SECRET_FILE is set to '${filePath}' but the file is empty or unreadable.`,
		);
	}

	if (process.env.NODE_ENV === "production") {
		throw new Error(
			"FATAL: BETTER_AUTH_SECRET must be set in production. " +
			"Set it to a 64-char random hex string.",
		);
	}

	_secret = "lazynext-dev-secret-key-for-auth-minimum-32-chars-better-auth";
	return _secret;
}

function extractToken(req: Request): string | null {
	const authHeader = req.headers.authorization;
	if (authHeader?.startsWith("Bearer ")) {
		return authHeader.slice(7);
	}
	const queryToken = req.query.token as string | undefined;
	if (queryToken) {
		return queryToken;
	}
	return null;
}

function verifyToken(token: string): AuthClaims | null {
	try {
		const secret = getSecret();
		return jwt.verify(token, secret, { algorithms: ["HS256"] }) as AuthClaims;
	} catch {
		return null;
	}
}

/**
 * Express middleware that requires a valid JWT bearer token.
 * Responds 401 if the token is missing, invalid, or expired.
 * On success, attaches `req.user` with decoded AuthClaims.
 */
export function authMiddleware(
	req: Request,
	res: Response,
	next: NextFunction,
): void {
	const token = extractToken(req);
	if (!token) {
		res.status(401).json({ error: "Missing authorization token" });
		return;
	}
	const claims = verifyToken(token);
	if (!claims) {
		res.status(401).json({ error: "Invalid or expired token" });
		return;
	}
	req.user = claims;
	next();
}

/**
 * Express middleware that attaches user claims if a valid token is present,
 * but never rejects the request. Use for endpoints that support both
 * authenticated and anonymous access.
 */
export function optionalAuth(
	req: Request,
	_res: Response,
	next: NextFunction,
): void {
	const token = extractToken(req);
	if (token) {
		const claims = verifyToken(token);
		if (claims) {
			req.user = claims;
		}
	}
	next();
}

/**
 * Express middleware that requires the user's session to be MFA-verified.
 * Must be used AFTER authMiddleware in the middleware chain.
 * Responds 403 if the user has MFA enabled but the session is not verified.
 */
export function requireMfa(
	req: Request,
	res: Response,
	next: NextFunction,
): void {
	const user = req.user;
	if (!user) {
		res.status(401).json({ error: "Missing authorization token" });
		return;
	}
	if (user.mfaEnabled && !user.mfaVerified) {
		res.status(403).json({
			error: "MFA verification required for this endpoint",
			code: "MFA_REQUIRED",
		});
		return;
	}
	next();
}

/** Alias for `authMiddleware` — semantically clearer when used on specific routes. */
export const requireAuth = authMiddleware;
