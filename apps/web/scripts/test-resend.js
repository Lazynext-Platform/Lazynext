/**
 * Resend Email Test — v4 (ES module variant)
 *
 * Sends a test email via the Resend API.  Uses a hardcoded API key
 * and fixed sender/receiver addresses for quick local testing.
 */

import { Resend } from "resend";
const resend = new Resend("re_SpMF8WCq_EY35199B8J5m61cs3oCJuPgD");
async function main() {
	const { data, error } = await resend.emails.send({
		from: "onboarding@resend.dev",
		to: "avaspatel7@gmail.com",
		subject: "Test",
		html: "<p>Test</p>",
	});
	console.log("Data:", data);
	console.log("Error:", error);
}
main();
