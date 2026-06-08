import { auth } from "@/auth/server";
import { toNextJsHandler } from "better-auth/next-js";

// Error-wrapped handler to surface Better Auth errors
const handler = (() => {
  try {
    const h = toNextJsHandler(auth);
    console.log("[Auth] Handler initialized OK");
    return h;
  } catch (e) {
    console.error("[Auth] Init failed:", e);
    throw e;
  }
})();

export async function POST(req: Request) {
  try {
    return await handler.POST(req);
  } catch (e) {
    console.error("[Auth POST]", e);
    return new Response(JSON.stringify({ error: "Auth error", detail: String(e) }), { status: 500, headers: { "Content-Type": "application/json" } });
  }
}

export async function GET(req: Request) {
  try {
    return await handler.GET(req);
  } catch (e) {
    console.error("[Auth GET]", e);
    return new Response(JSON.stringify({ error: "Auth error", detail: String(e) }), { status: 500, headers: { "Content-Type": "application/json" } });
  }
}
