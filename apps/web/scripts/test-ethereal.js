/**
 * Ethereal Email Test Script
 *
 * Creates a disposable Ethereal test account and sends a verification
 * email through it. Open the preview URL to inspect the rendered email
 * without delivering to a real inbox.
 */

import nodemailer from "nodemailer";
async function main() {
	const account = await nodemailer.createTestAccount();
	const transporter = nodemailer.createTransport({
		host: account.smtp.host,
		port: account.smtp.port,
		secure: account.smtp.secure,
		auth: { user: account.user, pass: account.pass },
	});
	const info = await transporter.sendMail({
		from: '"Lazynext" <onboarding@lazynext.com>',
		to: "avaspatel7@gmail.com",
		subject: "Test",
		html: "<p>Test Ethereal</p>",
	});
	console.log("Preview URL: " + nodemailer.getTestMessageUrl(info));
}
main();
