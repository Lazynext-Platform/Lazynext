/**
 * NotFound — Next.js 404 page rendered when no route matches.
 * Displays a large "404" decorative number, descriptive message,
 * and links to Home and My Projects.
 *
 * @module app/not-found
 */

import Link from "next/link";

/** React component rendering NotFound. */
export default function NotFound() {
	return (
		<div className="flex min-h-screen items-center justify-center bg-background px-4">
			<div className="text-center">
				<div className="text-8xl font-bold text-zinc-800">404</div>
				<h1 className="mt-4 text-2xl font-bold text-foreground">
					Page not found
				</h1>
				<p className="mt-2 text-sm text-muted">
					The page you&apos;re looking for doesn&apos;t exist or has been moved.
				</p>
				<div className="mt-8 flex items-center justify-center gap-4">
					<Link
						href="/"
						className="rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-semibold text-foreground hover:bg-blue-500 transition-colors"
					>
						Go Home
					</Link>
					<Link
						href="/projects"
						className="rounded-lg border border-border bg-panel px-6 py-2.5 text-sm font-medium text-foreground hover:bg-glass transition-colors"
					>
						My Projects
					</Link>
				</div>
			</div>
		</div>
	);
}
