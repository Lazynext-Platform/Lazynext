import { auth } from "@/auth/server";

export async function POST(req: Request) {
  const res = await auth.handler(req);
  if (res.status >= 400) {
    const body = await res.clone().text();
    return new Response(JSON.stringify({ status: res.status, body }), { 
      status: res.status, headers: { "Content-Type": "application/json" } 
    });
  }
  return res;
}

export async function GET(req: Request) {
  const res = await auth.handler(req);
  if (res.status >= 400) {
    const body = await res.clone().text();
    return new Response(JSON.stringify({ status: res.status, body }), { 
      status: res.status, headers: { "Content-Type": "application/json" } 
    });
  }
  return res;
}
