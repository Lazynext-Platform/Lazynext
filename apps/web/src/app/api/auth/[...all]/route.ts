import { auth } from "@/auth/server";

async function safeAuth(req: Request): Promise<Response> {
  try {
    return await auth.handler(req);
  } catch (e) {
    return new Response(JSON.stringify({ 
      error: "Handler exception", 
      detail: String(e),
      stack: (e as Error).stack?.substring(0, 500)
    }), { status: 500, headers: { "Content-Type": "application/json" } });
  }
}

export const POST = safeAuth;
export const GET = safeAuth;
