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
	console.log(`[Auth Debug] sendEmail called! to: ${to}, subject: ${subject}`);
	console.log(
		`[Auth Debug] RESEND_API_KEY length: ${process.env["RESEND_API_KEY"]?.length}, SMTP_HOST: ${process.env["SMTP_HOST"]}`,
	);

	// Configure Nodemailer for permanent robust email delivery
	// Users can provide SMTP credentials in .env.local
	const transporter = process.env["SMTP_HOST"]
		? nodemailer.createTransport({
				host: process.env["SMTP_HOST"],
				port: Number(process.env["SMTP_PORT"]) || 587,
				secure: process.env["SMTP_SECURE"] === "true", // true for 465, false for other ports
				auth: {
					user: process.env["SMTP_USER"],
					pass: process.env["SMTP_PASSWORD"],
				},
			})
		: null;

	if (transporter) {
		console.log(`[Auth] Sending email via SMTP to ${to}`);
		await transporter.sendMail({ from, to, subject, html });
		return;
	}

	if (process.env["RESEND_API_KEY"]) {
		console.log(`[Auth] Sending email via Resend to ${to} from ${from}`);
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
		console.log("[Auth] Successfully sent email via Resend. ID:", data?.id);
		return;
	}

	console.warn(
		`[Auth] NO EMAIL TRANSPORT CONFIGURED. Would have sent to ${to}: ${subject}`,
	);
}

export const auth = betterAuth({
	database: drizzleAdapter(db, { provider: "pg", usePlural: false, schema }),
	secret:
		process.env.BETTER_AUTH_SECRET ||
		"lazynext-secret-key-for-auth-minimum-32-long",
	emailAndPassword: {
		enabled: true,
		requireEmailVerification: false,
		sendResetPassword: async ({ user, url }: { user: any; url: string }) => {
			try {
				await sendEmail({
					to: user.email,
					subject: "Reset your password",
					html: `<p>Click the link below to reset your password:</p><p><a href="${url}">${url}</a></p>`,
				});
			} catch (error) {
				console.error("Failed to send reset password email:", error);
			}
		},
	},
	emailVerification: {
		sendOnSignUp: false,
		autoSignInAfterVerification: true,
		sendVerificationEmail: async ({
			user,
			url,
		}: {
			user: any;
			url: string;
		}) => {
			try {
				await sendEmail({
					to: user.email,
					subject: "Verify your email address",
					html: `<p>Click the link below to verify your email address:</p><p><a href="${url}">${url}</a></p>`,
				});
			} catch (error) {
				console.error("Failed to send verification email:", error);
			}
		},
	},
	trustedOrigins: [
		"https://lazynext.com",
		"http://localhost:3000",
		"http://localhost:3001",
		"http://localhost:3002",
	],
	baseURL: process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000",
});

export type Auth = typeof auth;
