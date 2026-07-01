/**
 * Error boundary for the editor — catches render errors and displays
 * a fallback UI with a retry button.
 *
 * @module components/editor/EditorErrorBoundary
 */

"use client";

import React, { Component } from "react";
import { Button } from "@/components/ui/button";

interface EditorErrorBoundaryProps {
	/** Label shown in the error message to identify which section crashed. */
	section: string;
	children: React.ReactNode;
	/** Optional fallback render — overrides the default error card. */
	fallback?: React.ReactNode;
}

interface EditorErrorBoundaryState {
	hasError: boolean;
	error: Error | null;
}

export class EditorErrorBoundary extends Component<
	EditorErrorBoundaryProps,
	EditorErrorBoundaryState
> {
	constructor(props: EditorErrorBoundaryProps) {
		super(props);
		this.state = { hasError: false, error: null };
	}

	static getDerivedStateFromError(error: Error): EditorErrorBoundaryState {
		return { hasError: true, error };
	}

	override componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
		console.error(
			`[EditorErrorBoundary] "${this.props.section}" crashed:`,
			error,
			errorInfo,
		);
	}

	handleReset = () => {
		this.setState({ hasError: false, error: null });
	};

	override render() {
		if (this.state.hasError) {
			if (this.props.fallback) return this.props.fallback;

			return (
				<div className="flex h-full w-full items-center justify-center bg-background p-6">
					<div className="flex flex-col items-center gap-4 rounded-xl border border-red-500/20 bg-red-500/5 p-6 text-center max-w-md">
						<div className="rounded-full bg-red-500/10 p-2">
							<svg
								className="h-6 w-6 text-red-400"
								fill="none"
								viewBox="0 0 24 24"
								stroke="currentColor"
							>
								<path
									strokeLinecap="round"
									strokeLinejoin="round"
									strokeWidth={2}
									d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"
								/>
							</svg>
						</div>
						<div>
							<h3 className="text-sm font-semibold text-foreground">
								{this.props.section} section crashed
							</h3>
							<p className="mt-1 text-xs text-muted">
								{this.state.error?.message ?? "An unexpected error occurred."}
							</p>
						</div>
						<Button
							variant="outline"
							size="sm"
							onClick={this.handleReset}
							className="text-xs"
						>
							Retry
						</Button>
					</div>
				</div>
			);
		}

		return this.props.children;
	}
}

/** Convenience wrapper — a thin card that catches errors within it. */
export function EditorPane({
	section,
	children,
	className = "",
}: {
	section: string;
	children: React.ReactNode;
	className?: string;
}) {
	return (
		<EditorErrorBoundary section={section}>
			<div className={className}>{children}</div>
		</EditorErrorBoundary>
	);
}
