import { auth } from "@/auth/server";
import { toNextJsHandler } from "better-auth/next-js";

console.log("[Auth Route] auth type:", typeof auth);
console.log("[Auth Route] auth keys:", auth ? Object.keys(auth) : "null/undefined");

let handler: ReturnType<typeof toNextJsHandler>;
try {
  handler = toNextJsHandler(auth);
  console.log("[Auth Route] Handler created. POST:", typeof handler.POST, "GET:", typeof handler.GET);
} catch (e) {
  console.error("[Auth Route] toNextJsHandler failed:", e);
  // Return a basic handler that shows the error
  handler = {
    POST: async () => new Response(JSON.stringify({ error: "toNextJsHandler failed", detail: String(e) }), { status: 500, headers: { "Content-Type": "application/json" } }),
    GET: async () => new Response(JSON.stringify({ error: "toNextJsHandler failed", detail: String(e) }), { status: 500, headers: { "Content-Type": "application/json" } }),
  };
}

export const POST = handler.POST;
export const GET = handler.GET;
