import { auth } from "@/auth/server";

export async function POST(req: Request) {
  const res = await auth.handler(req);
  // If error, return the body so we can debug
  if (res.status >= 400) {
    const body = await res.text();
    return new Response(JSON.stringify({ 
      status: res.status, 
      body: body.substring(0, 1000),
      headers: Object.fromEntries(res.headers.entries())
    }), { status: res.status, headers: { "Content-Type": "application/json" } });
  }
  return res;
}

export async function GET(req: Request) {
  const res = await auth.handler(req);
  if (res.status >= 400) {
    const body = await res.text();
    return new Response(JSON.stringify({ status: res.status, body: body.substring(0, 500) }), { status: res.status, headers: { "Content-Type": "application/json" } });
  }
  return res;
}
