/**
 * @module auth/server
 * @description Server-side Better Auth configuration with Drizzle
 *   adapter, email/password, Google/Apple/Microsoft OAuth,
 *   Magic Link, and MFA/TOTP (two-factor).
 */

import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { Resend } from "resend";
import nodemailer from "nodemailer";
import { twoFactor, magicLink } from "better-auth/plugins";

async function sendEmail({
	to,
	subject,
	html,
}: {
	to: string;
	subject: string;
	html: string;
}) {
	const from = process.env["EMAIL_FROM"] || "no-reply@lazynext.com";

	const transporter = process.env["SMTP_HOST"]
		? nodemailer.createTransport({
				host: process.env["SMTP_HOST"],
				port: Number(process.env["SMTP_PORT"]) || 587,
				secure: process.env["SMTP_SECURE"] === "true",
				auth: {
					user: process.env["SMTP_USER"],
					pass: process.env["SMTP_PASSWORD"],
				},
			})
		: null;

	if (transporter) {
		await transporter.sendMail({ from, to, subject, html });
		return;
	}

	if (process.env["RESEND_API_KEY"]) {
		const resendClient = new Resend(process.env["RESEND_API_KEY"]);
		const { data: _data, error } = await resendClient.emails.send({
			from,
			to,
			subject,
			html,
		});
		if (error) {
			console.error("[Auth] Resend API Error:", error);
			throw new Error(`Resend Error: ${error.message}`);
		}
		return;
	}

	console.warn(
		`[Auth] NO EMAIL TRANSPORT CONFIGURED. Would have sent to ${to}: ${subject}`,
	);
}

const devSecret = "lazynext-dev-secret-key-for-auth-minimum-32-chars-better-auth";

const baseURL = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

/** The configured Better Auth instance. */
export const auth = betterAuth({
	database: drizzleAdapter(db, { provider: "pg", schema }),
	secret:
		process.env.BETTER_AUTH_SECRET ||
		(process.env.NODE_ENV === "production"
			? (() => { throw new Error("BETTER_AUTH_SECRET must be set in production"); })()
			: devSecret),
	baseURL,

	socialProviders: {
		google: {
			clientId: process.env.GOOGLE_CLIENT_ID || "",
			clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
		},
		apple: {
			clientId: process.env.APPLE_CLIENT_ID || "",
			clientSecret: process.env.APPLE_CLIENT_SECRET || "",
		},
		microsoft: {
			clientId: process.env.MICROSOFT_CLIENT_ID || "",
			clientSecret: process.env.MICROSOFT_CLIENT_SECRET || "",
			tenantId: process.env.MICROSOFT_TENANT_ID || "common",
		},
		// Azure AD / Entra ID enterprise SSO via genericOAuth
		...(process.env.AZURE_AD_CLIENT_ID
			? {
					azureAd: {
						clientId: process.env.AZURE_AD_CLIENT_ID,
						clientSecret: process.env.AZURE_AD_CLIENT_SECRET || "",
						tenantId: process.env.AZURE_AD_TENANT_ID || "common",
					},
				}
			: {}),
	},

	emailAndPassword: {
		enabled: true,
		requireEmailVerification: false,
		minPasswordLength: 8,
		sendResetPassword: async ({ user, url }) => {
			try {
				await sendEmail({
					to: user.email,
					subject: "Reset your Lazynext password",
					html: `<p>Hi ${user.name || "there"},</p><p>Click the link below to reset your password:</p><p><a href="${url}">${url}</a></p><p>This link will expire soon. If you didn't request this, you can safely ignore this email.</p>`,
				});
			} catch (error) {
				console.error("Failed to send reset password email:", error);
			}
		},
		onPasswordReset: async ({ user }) => {
			console.log(`Password reset completed for user ${user.email}`);
		},
	},

	emailVerification: {
		sendOnSignUp: false,
		autoSignInAfterVerification: true,
		sendVerificationEmail: async ({ user, url }) => {
			try {
				await sendEmail({
					to: user.email,
					subject: "Verify your Lazynext email address",
					html: `<p>Hi ${user.name || "there"},</p><p>Click the link below to verify your email address:</p><p><a href="${url}">${url}</a></p>`,
				});
			} catch (error) {
				console.error("Failed to send verification email:", error);
			}
		},
	},

	trustedOrigins: [
		"https://lazynext.com",
		"https://www.lazynext.com",
		"http://localhost:3000",
		"http://localhost:3001",
		"http://localhost:3002",
		process.env.NEXT_PUBLIC_SITE_URL,
		process.env.NEXT_PUBLIC_DESKTOP_URL,
		process.env.NEXT_PUBLIC_MOBILE_URL,
	].filter(Boolean) as string[],

	plugins: [
		twoFactor({
			issuer: "Lazynext",
			otpLength: 6,
		}),
		magicLink({
			sendMagicLink: async ({ url, email }) => {
				try {
					await sendEmail({
						to: email,
						subject: "Sign in to Lazynext",
						html: `<p>Hi,</p><p>Click the link below to sign in to Lazynext:</p><p><a href="${url}">${url}</a></p><p>This magic link will expire in 10 minutes. If you didn't request this, you can safely ignore this email.</p>`,
					});
				} catch (error) {
					console.error("Failed to send magic link:", error);
				}
			},
		}),
	],
});

/** Inferred type of the Better Auth instance. */
export type Auth = typeof auth;
