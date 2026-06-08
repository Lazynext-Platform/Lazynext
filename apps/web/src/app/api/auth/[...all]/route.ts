import { toNextJsHandler } from "better-auth/next-js";

let authHandler: ReturnType<typeof toNextJsHandler> | null = null;

function getHandler() {
  if (authHandler) return authHandler;
  try {
    const { auth } = require("@/auth/server");
    authHandler = toNextJsHandler(auth);
    console.log("[Auth] Handler initialized successfully");
    return authHandler;
  } catch (e) {
    console.error("[Auth] Failed to initialize:", e);
    throw e;
  }
}

export async function POST(req: Request) {
  try {
    const handler = getHandler();
    return await handler.POST(req);
  } catch (e) {
    console.error("[Auth POST Error]", e);
    return new Response(JSON.stringify({ error: "Auth handler error", detail: (e as Error).message }), { status: 500, headers: { "Content-Type": "application/json" } });
  }
}

export async function GET(req: Request) {
  try {
    const handler = getHandler();
    return await handler.GET(req);
  } catch (e) {
    console.error("[Auth GET Error]", e);
    return new Response(JSON.stringify({ error: "Auth handler error", detail: (e as Error).message }), { status: 500, headers: { "Content-Type": "application/json" } });
  }
}
