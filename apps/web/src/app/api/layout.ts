/**
 * @module API layout — configures all API routes as dynamic to skip
 * static generation at build time. Routes requiring live database
 * connections must not be pre-rendered.
 */

export const dynamic = "force-dynamic";

export default function ApiLayout({ children }: { children: React.ReactNode }) {
	return children;
}
