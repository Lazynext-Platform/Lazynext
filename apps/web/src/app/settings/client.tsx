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

	React.useEffect(() => {
		if (typeof window !== "undefined") {
			const searchParams = new URLSearchParams(window.location.search);
			if (searchParams.get("social_auth") === "success") {
				toast.success("Social account connected successfully!");
				router.replace("/settings");
			}
		}
	}, [router]);

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
		<div className="min-h-screen bg-background text-foreground relative">
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
					<section className="rounded-xl border border-border bg-panel p-6 shadow-[var(--accent-glow)]">
						<h2 className="text-lg font-bold text-foreground">
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
								className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-[var(--accent-primary)] transition-colors"
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
								className="w-full rounded-lg border border-border bg-background/50 px-3 py-2 text-sm text-muted outline-none"
							/>
								<p className="mt-1 text-xs text-muted">
									Email cannot be changed
								</p>
							</div>
							<button
								type="submit"
								disabled={saving}
								className="rounded-lg bg-[var(--accent-primary)] px-4 py-2 text-sm font-bold text-background hover:opacity-90 disabled:opacity-50 transition-all shadow-[var(--accent-glow)]"
							>
								{saving ? "Saving..." : "Save Changes"}
							</button>
						</form>
					</section>

					{/* Preferences Section */}
					<section className="rounded-xl border border-border bg-panel p-6 shadow-[var(--accent-glow)]">
						<h2 className="text-lg font-bold text-foreground">
							Preferences
						</h2>
						<p className="mt-1 text-sm text-muted">
							Customize your editing experience.
						</p>
						<div className="mt-4 space-y-3">
							<label aria-label="Autosave" className="flex items-center justify-between rounded-lg border border-border bg-background/50 px-4 py-3">
								<div>
									<span className="text-sm font-bold text-foreground">
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
							<label aria-label="Snap to Grid" className="flex items-center justify-between rounded-lg border border-border bg-background/50 px-4 py-3">
								<div>
									<span className="text-sm font-bold text-foreground">
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

					{/* Social Integrations Section */}
					<section className="rounded-xl border border-border bg-panel p-6 shadow-[var(--accent-glow)]">
						<h2 className="text-lg font-bold text-foreground">
							Social Integrations
						</h2>
						<p className="mt-1 text-sm text-muted">
							Connect your social media accounts for direct publishing.
						</p>
						<div className="mt-6 space-y-4">
							{/* TikTok */}
							<div className="flex items-center justify-between rounded-lg border border-border bg-background/50 px-4 py-3">
								<div className="flex items-center gap-3">
									<div className="flex h-10 w-10 items-center justify-center rounded-full bg-zinc-900 text-white">
										<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-5.2 1.74 2.89 2.89 0 012.31-4.64 2.93 2.93 0 01.88.13V9.4a6.84 6.84 0 00-1-.05A6.33 6.33 0 005 15.68l.01.2a6.33 6.33 0 009.68 4.09 6.47 6.47 0 003.07-5.52V8.9a8.36 8.36 0 004.83 1.54V7.05a5.38 5.38 0 01-3-1l.01.64z"/></svg>
									</div>
									<div>
										<span className="text-sm font-bold text-foreground">TikTok</span>
										<p className="text-xs text-muted">Publish directly to TikTok</p>
									</div>
								</div>
								<button
									onClick={() => { window.location.href = "/api/social/tiktok"; }}
									className="rounded-lg bg-[var(--accent-primary)] px-4 py-2 text-sm font-bold text-background hover:opacity-90 transition-all shadow-[var(--accent-glow)]"
								>
									Connect
								</button>
							</div>

							{/* YouTube */}
							<div className="flex items-center justify-between rounded-lg border border-border bg-background/50 px-4 py-3">
								<div className="flex items-center gap-3">
									<div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-600 text-white">
										<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>
									</div>
									<div>
										<span className="text-sm font-bold text-foreground">YouTube</span>
										<p className="text-xs text-muted">Publish directly to YouTube Shorts</p>
									</div>
								</div>
								<button
									onClick={() => { window.location.href = "/api/social/youtube"; }}
									className="rounded-lg bg-[var(--accent-primary)] px-4 py-2 text-sm font-bold text-background hover:opacity-90 transition-all shadow-[var(--accent-glow)]"
								>
									Connect
								</button>
							</div>

							{/* Instagram */}
							<div className="flex items-center justify-between rounded-lg border border-border bg-background/50 px-4 py-3">
								<div className="flex items-center gap-3">
									<div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-tr from-yellow-400 to-fuchsia-600 text-white">
										<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line></svg>
									</div>
									<div>
										<span className="text-sm font-bold text-foreground">Instagram</span>
										<p className="text-xs text-muted">Publish directly to Instagram Reels</p>
									</div>
								</div>
								<button
									onClick={() => { window.location.href = "/api/social/instagram"; }}
									className="rounded-lg bg-[var(--accent-primary)] px-4 py-2 text-sm font-bold text-background hover:opacity-90 transition-all shadow-[var(--accent-glow)]"
								>
									Connect
								</button>
							</div>
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
