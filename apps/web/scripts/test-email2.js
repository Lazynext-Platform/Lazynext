/**
 * Resend Email Test — v2
 *
 * Sends a verification email via the Resend API.
 * Same as test-email.js but uses a hardcoded sender domain.
 */

const { Resend } = require("resend");
require("dotenv").config({ path: ".env.local" });

const resend = new Resend(process.env.RESEND_API_KEY);

async function test() {
  const from = "no-reply@sociosky.com";
  console.log("Testing with EMAIL_FROM:", from);
  const { data, error } = await resend.emails.send({
    from: from,
    to: "avaspatel7@gmail.com",
    subject: "Test Lazynext Email",
    html: "<p>This is a test</p>"
  });

  if (error) {
    console.error("Resend Error:", error);
  } else {
    console.log("Success! Data:", data);
  }
}
test();
