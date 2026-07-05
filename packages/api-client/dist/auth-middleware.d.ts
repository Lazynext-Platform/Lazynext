/**
 * JWT Auth Middleware — Express/Typescript middleware that validates
 * Better Auth HS256 JWTs against BETTER_AUTH_SECRET.
 *
 * Also reads BETTER_AUTH_SECRET_FILE for Docker secret mounting.
 * Falls back to a dev key ONLY when NODE_ENV is not "production".
 * In production, refuses to start if no secret is configured.
 *
 * Exports:
 *   authMiddleware — Express middleware (applies to all routes)
 *   requireAuth — Express middleware (applies to specific routes)
 *   optionalAuth — attaches user if token present, never rejects
 */
import type { Request, Response, NextFunction } from "express";
export interface AuthClaims {
    sub: string;
    email: string;
    name: string;
    role: string;
    iat: number;
    exp: number;
}
declare global {
    namespace Express {
        interface Request {
            user?: AuthClaims;
        }
    }
}
export declare function authMiddleware(req: Request, res: Response, next: NextFunction): void;
export declare function optionalAuth(req: Request, _res: Response, next: NextFunction): void;
export declare const requireAuth: typeof authMiddleware;
//# sourceMappingURL=auth-middleware.d.ts.map