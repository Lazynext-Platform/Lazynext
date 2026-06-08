import { auth } from "@/auth/server";

async function handle(method: string, req: Request) {
  try {
    const res = await auth.handler(req);
    // Log non-200 responses
    if (res.status >= 400) {
      const body = await res.clone().text();
      console.error(`[Auth ${method}] ${res.status}: ${body.substring(0, 500)}`);
    }
    return res;
  } catch (e) {
    console.error(`[Auth ${method}] Exception:`, e);
    return new Response(JSON.stringify({ 
      error: "Auth exception", 
      detail: e instanceof Error ? e.message : String(e),
      stack: e instanceof Error ? e.stack?.substring(0, 500) : undefined
    }), { status: 500, headers: { "Content-Type": "application/json" } });
  }
}

export async function POST(req: Request) { return handle("POST", req); }
export async function GET(req: Request) { return handle("GET", req); }
