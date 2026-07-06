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
import jwt from "jsonwebtoken";
import { readFileSync } from "fs";
let _secret = null;
function getSecret() {
    if (_secret)
        return _secret;
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
        }
        catch { /* fall through */ }
        throw new Error(`FATAL: BETTER_AUTH_SECRET_FILE is set to '${filePath}' but the file is empty or unreadable.`);
    }
    if (process.env.NODE_ENV === "production") {
        throw new Error("FATAL: BETTER_AUTH_SECRET must be set in production. " +
            "Set it to a 64-char random hex string.");
    }
    _secret = "lazynext-dev-secret-key-for-auth-minimum-32-chars-better-auth";
    return _secret;
}
function extractToken(req) {
    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith("Bearer ")) {
        return authHeader.slice(7);
    }
    const queryToken = req.query.token;
    if (queryToken) {
        return queryToken;
    }
    return null;
}
function verifyToken(token) {
    try {
        const secret = getSecret();
        return jwt.verify(token, secret, { algorithms: ["HS256"] });
    }
    catch {
        return null;
    }
}
export function authMiddleware(req, res, next) {
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
export function optionalAuth(req, _res, next) {
    const token = extractToken(req);
    if (token) {
        const claims = verifyToken(token);
        if (claims) {
            req.user = claims;
        }
    }
    next();
}
export const requireAuth = authMiddleware;
