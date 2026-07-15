/**
 * Top toolbar — minimalist top navigation bar for the editor.
 *
 * @module components/editor/TopToolbar
 */

// Phase 52: Extracting Top Navigation
export function TopToolbar() {
	return (
		<div className="h-12 bg-background border-b border-border flex items-center justify-between px-4 shrink-0 relative z-40 select-none shadow-md">
			{/* Extracted content will go here */}
			<div className="flex items-center gap-4">
				<span className="text-foreground font-bold tracking-widest">
					SYNAPSE RESOLVE
				</span>
			</div>
		</div>
	);
}
