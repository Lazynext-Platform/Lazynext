const { Resend } = require("resend");
require("dotenv").config({ path: ".env.local" });

const resend = new Resend(process.env.RESEND_API_KEY);

async function testEmail() {
	console.log(
		"Using API Key:",
		process.env.RESEND_API_KEY ? "Loaded" : "Missing",
	);
	const { data, error } = await resend.emails.send({
		from: "Lazynext Auth <noreply@lazynext.com>",
		to: "avaspatel7@gmail.com",
		subject: "Test Email from Lazynext",
		html: "<p>This is a test email.</p>",
	});

	if (error) {
		console.error("Resend API Error:", error);
	} else {
		console.log("Success! Email sent with ID:", data?.id);
	}
}

testEmail();
