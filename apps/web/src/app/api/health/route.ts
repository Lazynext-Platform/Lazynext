/**
 * GET /api/health
 *
 * Health check endpoint — always returns 200 OK.
 */
export async function GET() {
	return new Response("OK", { status: 200 });
}
