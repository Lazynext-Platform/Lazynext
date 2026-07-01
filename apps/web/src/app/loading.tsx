/**
 * Loading — Next.js Suspense fallback rendered while route segments
 * stream in. Displays a centered spinner with subtle loading text.
 *
 * @module app/loading
 */

export default function Loading() {
	return (
		<div className="flex min-h-screen items-center justify-center bg-background">
			<div className="flex flex-col items-center gap-4">
				<div className="h-8 w-8 animate-spin rounded-full border-2 border-border border-t-blue-500" />
				<p className="text-sm text-muted">Loading...</p>
			</div>
		</div>
	);
}
