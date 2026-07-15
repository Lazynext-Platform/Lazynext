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
/**
 * Express middleware that requires a valid JWT bearer token.
 * Responds 401 if the token is missing, invalid, or expired.
 * On success, attaches `req.user` with decoded AuthClaims.
 */
export declare function authMiddleware(req: Request, res: Response, next: NextFunction): void;
/**
 * Express middleware that attaches user claims if a valid token is present,
 * but never rejects the request. Use for endpoints that support both
 * authenticated and anonymous access.
 */
export declare function optionalAuth(req: Request, _res: Response, next: NextFunction): void;
/**
 * Express middleware that requires the user's session to be MFA-verified.
 * Must be used AFTER authMiddleware in the middleware chain.
 * Responds 403 if the user has MFA enabled but the session is not verified.
 */
export declare function requireMfa(req: Request, res: Response, next: NextFunction): void;
/** Alias for `authMiddleware` — semantically clearer when used on specific routes. */
export declare const requireAuth: typeof authMiddleware;
//# sourceMappingURL=auth-middleware.d.ts.map