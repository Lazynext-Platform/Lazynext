"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function GlobalError({
	error,
	reset,
}: {
	error: Error & { digest?: string };
	reset: () => void;
}) {
	useEffect(() => {
		console.error("Global error:", error);
	}, [error]);

	return (
		<html>
			<body className="bg-background">
				<div className="flex min-h-screen items-center justify-center px-4">
					<div className="text-center">
						<div className="text-7xl font-bold text-zinc-800">500</div>
						<h1 className="mt-4 text-2xl font-bold text-white">Something went wrong</h1>
						<p className="mt-2 text-sm text-zinc-400">
							{error.message ?? "An unexpected error occurred. Please try again."}
						</p>
						<div className="mt-8 flex items-center justify-center gap-4">
							<button
								type="button"
								onClick={reset}
								className="rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-blue-500 transition-colors"
							>
								Try Again
							</button>
							<Link
								href="/"
								className="rounded-lg border border-zinc-700 bg-zinc-800 px-6 py-2.5 text-sm font-medium text-zinc-300 hover:bg-zinc-700 transition-colors"
							>
								Go Home
							</Link>
						</div>
					</div>
				</div>
			</body>
		</html>
	);
}
