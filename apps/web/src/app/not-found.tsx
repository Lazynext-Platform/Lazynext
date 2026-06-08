import Link from "next/link";

export default function NotFound() {
	return (
		<div className="flex min-h-screen items-center justify-center bg-zinc-950 px-4">
			<div className="text-center">
				<div className="text-8xl font-bold text-zinc-800">404</div>
				<h1 className="mt-4 text-2xl font-bold text-white">Page not found</h1>
				<p className="mt-2 text-sm text-zinc-400">
					The page you&apos;re looking for doesn&apos;t exist or has been moved.
				</p>
				<div className="mt-8 flex items-center justify-center gap-4">
					<Link
						href="/"
						className="rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-blue-500 transition-colors"
					>
						Go Home
					</Link>
					<Link
						href="/projects"
						className="rounded-lg border border-zinc-700 bg-zinc-800 px-6 py-2.5 text-sm font-medium text-zinc-300 hover:bg-zinc-700 transition-colors"
					>
						My Projects
					</Link>
				</div>
			</div>
		</div>
	);
}
