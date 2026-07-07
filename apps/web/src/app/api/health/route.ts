/**
 * GET /api/health
 *
 * Health check endpoint — always returns 200 OK.
 *
 * @module app/api/health/route
 */
export async function GET() {
	return new Response("OK", { status: 200 });
}
