/**
 * CLI Auth callback page client — shows the auth token and
 * instructions for the CLI.
 *
 * @module cli-auth/client
 */

"use client";

import { useState, useCallback } from "react";
import { Copy, Check, Terminal } from "lucide-react";

interface CliAuthClientProps {
	token: string;
	user?: { name?: string; email?: string };
}

/** React component rendering CliAuthClient. */
export function CliAuthClient({ token, user }: CliAuthClientProps) {
	const [copied, setCopied] = useState(false);

	const handleCopy = useCallback(async () => {
		if (!token) return;
		try {
			await navigator.clipboard.writeText(token);
			setCopied(true);
			setTimeout(() => setCopied(false), 3000);
		} catch {
			// ignore
		}
	}, [token]);

	return (
		<div className="flex min-h-screen flex-col items-center justify-center bg-background px-4">
			<div className="w-full max-w-md space-y-6 rounded-2xl border border-border bg-panel/50 p-8 text-center">
				<div className="flex justify-center">
					<div className="rounded-full bg-emerald-500/10 p-3">
						<Check className="h-8 w-8 text-emerald-400" />
					</div>
				</div>

				<div>
					<h1 className="text-2xl font-bold text-foreground">
						Signed in successfully!
					</h1>
					{user && (
						<p className="mt-2 text-sm text-muted">
							{user.name || user.email}
						</p>
					)}
				</div>

				{token ? (
					<>
						<div className="rounded-lg bg-background border border-border p-4">
							<code className="break-all text-xs text-foreground font-mono">
								{token}
							</code>
						</div>

						<button
							onClick={handleCopy}
							className="flex w-full items-center justify-center gap-2 rounded-lg bg-[var(--accent-secondary)] py-2.5 text-sm font-semibold text-foreground"
						>
							{copied ? (
								<>
									<Check className="h-4 w-4" /> Copied!
								</>
							) : (
								<>
									<Copy className="h-4 w-4" /> Copy Token
								</>
							)}
						</button>

						<div className="rounded-lg border border-border bg-background/50 p-4 text-left">
							<div className="flex items-center gap-2 mb-2">
								<Terminal className="h-4 w-4 text-muted" />
								<span className="text-xs font-medium text-muted">
									CLI Command
								</span>
							</div>
							<code className="block text-sm text-foreground font-mono">
								lazynext login-token --token {"<PASTE_TOKEN_HERE>"}
							</code>
						</div>
					</>
				) : (
					<div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-4">
						<p className="text-sm text-amber-400">
							No active session found. Please sign in first.
						</p>
					</div>
				)}
			</div>
		</div>
	);
}
