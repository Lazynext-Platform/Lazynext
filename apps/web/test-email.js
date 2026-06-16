const { Resend } = require("resend");
require("dotenv").config({ path: ".env.local" });

const resend = new Resend(process.env.RESEND_API_KEY);

async function test() {
  const from = process.env.EMAIL_FROM || "no-reply@lazynext.com";
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
