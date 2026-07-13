/**
 * @module auth/server
 * @description Server-side Better Auth configuration with Drizzle
 *   adapter, email/password, email verification, and multi-transport
 *   email delivery (Brevo primary, SMTP preferred, Resend fallback).
 */

import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { Resend } from "resend";
import nodemailer from "nodemailer";

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

	// Brevo — 300 emails/day free, no credit card
	if (process.env["BREVO_API_KEY"]) {
		const resp = await fetch("https://api.brevo.com/v3/smtp/email", {
			method: "POST",
			headers: {
				"api-key": process.env["BREVO_API_KEY"],
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				sender: { email: from.split("<")[1]?.replace(">", "") || from, name: "Lazynext" },
				to: [{ email: to }],
				subject,
				htmlContent: html,
			}),
		});
		if (resp.ok) return;
		console.error("[Auth] Brevo API Error:", await resp.text());
	}

	if (process.env["RESEND_API_KEY"]) {
		const resendClient = new Resend(process.env["RESEND_API_KEY"]);
		const { data, error } = await resendClient.emails.send({
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

/** The configured Better Auth instance. */
export const auth = betterAuth({
	database: drizzleAdapter(db, { provider: "pg", usePlural: false, schema }),
	secret:
		process.env.BETTER_AUTH_SECRET ||
		(process.env.NODE_ENV === "production"
			? (() => { throw new Error("BETTER_AUTH_SECRET must be set in production"); })()
			: devSecret),
	emailAndPassword: {
		enabled: true,
		requireEmailVerification: false,
		minPasswordLength: 8,
		sendResetPassword: async ({ user, url }, request) => {
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
		onPasswordReset: async ({ user }, request) => {
			console.log(`Password reset completed for user ${user.email}`);
		},
	},
	emailVerification: {
		sendOnSignUp: false,
		autoSignInAfterVerification: true,
		sendVerificationEmail: async ({ user, url }, request) => {
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
	].filter(Boolean) as string[],
	baseURL: process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000",
});

/** Inferred type of the Better Auth instance. */
export type Auth = typeof auth;
