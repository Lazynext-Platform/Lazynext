/**
 * SettingsPageClient — user account settings page with profile editing,
 * autosave / snap-to-grid preference toggles, and a danger-zone section
 * for account deletion.
 *
 * Requires an active session; redirects to /sign-in otherwise.
 *
 * @module settings/client
 */

"use client";

import React, { useState } from "react";
import { useSession } from "@/auth/client";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import Link from "next/link";

/** React component rendering SettingsPageClient. */
export function SettingsPageClient() {
	const { data: session, isPending } = useSession();
	const router = useRouter();

	const [name, setName] = useState(session?.user?.name ?? "");
	const [saving, setSaving] = useState(false);

	React.useEffect(() => {
		if (!isPending && !session) {
			router.replace("/sign-in");
		}
	}, [session, isPending, router]);

	if (isPending) {
		return (
			<div className="flex min-h-screen items-center justify-center bg-background">
				<div className="text-muted">Loading...</div>
			</div>
		);
	}

	if (!session) {
		return null;
	}

	const handleSave = async (e: React.FormEvent) => {
		e.preventDefault();
		const trimmed = name.trim();
		if (!trimmed) {
			toast.error("Name must not be empty");
			return;
		}
		if (trimmed.length > 200) {
			toast.error("Name must be under 200 characters");
			return;
		}
		setSaving(true);
		try {
			const res = await fetch("/api/user/profile", {
				method: "PATCH",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ name: trimmed }),
			});
			if (res.ok) {
				toast.success("Settings saved!");
			} else {
				toast.error("Failed to save settings");
			}
		} catch {
			toast.error("An error occurred");
		} finally {
			setSaving(false);
		}
	};

	return (
		<div className="min-h-screen bg-[var(--bg-main)] text-[var(--text-primary)] relative">
			{/* Ambient Background */}
			<div className="fixed inset-0 z-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-[var(--accent-primary)]/10 via-[var(--bg-main)] to-[var(--bg-main)] pointer-events-none" />
			<div className="mx-auto max-w-2xl px-4 py-16 relative z-10">
				<Link
					href="/projects"
					className="mb-8 inline-flex items-center gap-2 text-sm text-muted hover:text-foreground transition-colors"
				>
					← Back to Projects
				</Link>

				<h1 className="text-3xl font-bold text-foreground">Settings</h1>
				<p className="mt-2 text-sm text-muted">
					Manage your account and preferences.
				</p>

				<div className="mt-8 space-y-8">
					{/* Profile Section */}
					<section className="rounded-xl border border-[var(--border-glass)] bg-[var(--bg-panel)] p-6 shadow-[var(--accent-glow)]">
						<h2 className="text-lg font-bold text-[var(--text-primary)]">
							Profile
						</h2>
						<p className="mt-1 text-sm text-muted">
							Update your display name and email.
						</p>
						<form onSubmit={handleSave} className="mt-4 space-y-4">
							<div>
							<label htmlFor="settings-name" className="mb-1 block text-xs font-medium text-muted">
								Name
							</label>
							<input
								id="settings-name"
								type="text"
								value={name}
								maxLength={200}
								onChange={(e) => setName(e.target.value)}
								className="w-full rounded-lg border border-[var(--border-glass)] bg-[var(--bg-main)] px-3 py-2 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent-primary)] transition-colors"
								placeholder="Your display name"
							/>
							</div>
							<div>
							<label htmlFor="settings-email" className="mb-1 block text-xs font-medium text-muted">
								Email
							</label>
							<input
								id="settings-email"
								type="email"
								value={session.user?.email ?? ""}
								disabled
								className="w-full rounded-lg border border-[var(--border-glass)] bg-[var(--bg-main)]/50 px-3 py-2 text-sm text-muted outline-none"
							/>
								<p className="mt-1 text-xs text-muted">
									Email cannot be changed
								</p>
							</div>
							<button
								type="submit"
								disabled={saving}
								className="rounded-lg bg-[var(--accent-primary)] px-4 py-2 text-sm font-bold text-[var(--text-on-accent)] hover:opacity-90 disabled:opacity-50 transition-all shadow-[var(--accent-glow)]"
							>
								{saving ? "Saving..." : "Save Changes"}
							</button>
						</form>
					</section>

					{/* Preferences Section */}
					<section className="rounded-xl border border-[var(--border-glass)] bg-[var(--bg-panel)] p-6 shadow-[var(--accent-glow)]">
						<h2 className="text-lg font-bold text-[var(--text-primary)]">
							Preferences
						</h2>
						<p className="mt-1 text-sm text-muted">
							Customize your editing experience.
						</p>
						<div className="mt-4 space-y-3">
							<label aria-label="Autosave" className="flex items-center justify-between rounded-lg border border-[var(--border-glass)] bg-[var(--bg-main)]/50 px-4 py-3">
								<div>
									<span className="text-sm font-bold text-[var(--text-primary)]">
										Autosave
									</span>
									<p className="text-xs text-muted">
										Save projects automatically every 30 seconds
									</p>
								</div>
								<input
									id="settings-autosave"
									type="checkbox"
									defaultChecked
									className="h-4 w-4 rounded accent-[var(--accent-primary)]"
								/>
							</label>
							<label aria-label="Snap to Grid" className="flex items-center justify-between rounded-lg border border-[var(--border-glass)] bg-[var(--bg-main)]/50 px-4 py-3">
								<div>
									<span className="text-sm font-bold text-[var(--text-primary)]">
										Snap to Grid
									</span>
									<p className="text-xs text-muted">
										Snap timeline elements to the nearest frame
									</p>
								</div>
								<input
									id="settings-snap-to-grid"
									type="checkbox"
									defaultChecked
									className="h-4 w-4 rounded accent-[var(--accent-primary)]"
								/>
							</label>
						</div>
					</section>

					{/* Danger Zone */}
					<section className="rounded-xl border border-red-500/20 bg-red-500/5 p-6">
						<h2 className="text-lg font-semibold text-red-400">Danger Zone</h2>
						<p className="mt-1 text-sm text-muted">
							Permanently delete your account and all data.
						</p>
						<button
							type="button"
							onClick={() =>
								toast.error("Account deletion is not yet implemented")
							}
							className="mt-4 rounded-lg border border-red-500/50 bg-red-500/10 px-4 py-2 text-sm font-medium text-red-400 hover:bg-red-500/20 transition-colors"
						>
							Delete Account
						</button>
					</section>
				</div>
			</div>
		</div>
	);
}
