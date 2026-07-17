/**
 * CLI Token page client — displays copyable JWT token for CLI auth.
 *
 * @module settings/token/client
 */

"use client";

import { useState, useCallback } from "react";
import { Copy, Check, Key, Shield, Terminal } from "lucide-react";
import { toast } from "sonner";

interface TokenPageClientProps {
	token: string;
	user: { name?: string; email?: string };
}

/** React component rendering TokenPageClient. */
export function TokenPageClient({ token, user: _user }: TokenPageClientProps) {
	const [copied, setCopied] = useState(false);
	const [revealed, setRevealed] = useState(false);

	const handleCopy = useCallback(async () => {
		if (!token) return;
		try {
			await navigator.clipboard.writeText(token);
			setCopied(true);
			toast.success("Token copied to clipboard!");
			setTimeout(() => setCopied(false), 3000);
		} catch {
			toast.error("Could not copy token. Select and copy manually.");
		}
	}, [token]);

	const handleReveal = () => {
		if (!revealed) {
			setRevealed(true);
			// Auto-hide after 30 seconds for security
			setTimeout(() => setRevealed(false), 30000);
		} else {
			setRevealed(false);
		}
	};

	return (
		<div className="mx-auto max-w-2xl space-y-8 p-6">
			<div className="flex items-center gap-3">
				<Terminal className="h-6 w-6 text-[var(--accent-secondary)]" />
				<h1 className="text-2xl font-bold text-foreground">CLI Token</h1>
			</div>

			<section className="rounded-xl border border-border bg-panel/50 p-6">
				<div className="flex items-center gap-2 mb-4">
					<Key className="h-5 w-5 text-muted" />
					<h2 className="text-lg font-semibold text-foreground">
						Your Authentication Token
					</h2>
				</div>

				<p className="text-sm text-muted mb-4">
					Use this token to authenticate the Lazynext CLI. Run the
					following command to sign in:
				</p>

				<div className="mb-4 rounded-lg bg-background border border-border p-4">
					<code className="text-sm text-foreground font-mono">
						lazynext login-token --token{" "}
						{revealed ? token : "••••••••••••••••••••••••••••••••••••••••••••••••••"}
					</code>
				</div>

				<div className="flex gap-2">
					<button
						onClick={handleReveal}
						className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-muted hover:bg-panel"
					>
						{revealed ? "Hide Token" : "Reveal Token"}
					</button>
					<button
						onClick={handleCopy}
						disabled={!token}
						className="flex items-center gap-2 rounded-lg bg-[var(--accent-secondary)] px-4 py-2 text-sm font-semibold text-foreground hover:bg-[var(--accent-secondary)]/80 disabled:opacity-50"
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
				</div>
			</section>

			<section className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-6">
				<div className="flex items-center gap-2 mb-4">
					<Shield className="h-5 w-5 text-amber-400" />
					<h2 className="text-lg font-semibold text-foreground">
						Security Notice
					</h2>
				</div>
				<ul className="space-y-2 text-sm text-muted">
					<li>This token grants full access to your Lazynext account.</li>
					<li>Never share this token with anyone.</li>
					<li>Regenerate this token by signing out and back in.</li>
					<li>Tokens are automatically revoked after 24 hours of inactivity.</li>
				</ul>
			</section>
		</div>
	);
}
