import { auth } from "@/auth/server";

// Better Auth has a built-in handler — use it directly instead of toNextJsHandler
export const POST = async (req: Request) => auth.handler(req);
export const GET = async (req: Request) => auth.handler(req);
