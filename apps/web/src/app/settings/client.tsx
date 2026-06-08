"use client";

import React, { useState } from "react";
import { useSession } from "@/auth/client";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import Link from "next/link";

export function SettingsPageClient() {
	const { data: session, isPending } = useSession();
	const router = useRouter();

	const [name, setName] = useState(session?.user?.name ?? "");
	const [saving, setSaving] = useState(false);

	if (isPending) {
		return (
			<div className="flex min-h-screen items-center justify-center bg-zinc-950">
				<div className="text-zinc-400">Loading...</div>
			</div>
		);
	}

	if (!session) {
		router.push("/sign-in");
		return null;
	}

	const handleSave = async (e: React.FormEvent) => {
		e.preventDefault();
		setSaving(true);
		try {
			const res = await fetch("/api/user/profile", {
				method: "PATCH",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ name }),
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
		<div className="min-h-screen bg-zinc-950 text-zinc-100">
			<div className="mx-auto max-w-2xl px-4 py-16">
				<Link
					href="/projects"
					className="mb-8 inline-flex items-center gap-2 text-sm text-zinc-400 hover:text-white transition-colors"
				>
					← Back to Projects
				</Link>

				<h1 className="text-3xl font-bold text-white">Settings</h1>
				<p className="mt-2 text-sm text-zinc-400">Manage your account and preferences.</p>

				<div className="mt-8 space-y-8">
					{/* Profile Section */}
					<section className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
						<h2 className="text-lg font-semibold text-white">Profile</h2>
						<p className="mt-1 text-sm text-zinc-400">Update your display name and email.</p>
						<form onSubmit={handleSave} className="mt-4 space-y-4">
							<div>
								<label className="mb-1 block text-xs font-medium text-zinc-400">Name</label>
								<input
									type="text"
									value={name}
									onChange={(e) => setName(e.target.value)}
									className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white outline-none focus:border-blue-500"
									placeholder="Your display name"
								/>
							</div>
							<div>
								<label className="mb-1 block text-xs font-medium text-zinc-400">Email</label>
								<input
									type="email"
									value={session.user?.email ?? ""}
									disabled
									className="w-full rounded-lg border border-zinc-700 bg-zinc-800/50 px-3 py-2 text-sm text-zinc-500 outline-none"
								/>
								<p className="mt-1 text-xs text-zinc-500">Email cannot be changed</p>
							</div>
							<button
								type="submit"
								disabled={saving}
								className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500 disabled:opacity-50 transition-colors"
							>
								{saving ? "Saving..." : "Save Changes"}
							</button>
						</form>
					</section>

					{/* Preferences Section */}
					<section className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
						<h2 className="text-lg font-semibold text-white">Preferences</h2>
						<p className="mt-1 text-sm text-zinc-400">Customize your editing experience.</p>
						<div className="mt-4 space-y-3">
							<label className="flex items-center justify-between rounded-lg border border-zinc-700 bg-zinc-800/50 px-4 py-3">
								<div>
									<span className="text-sm font-medium text-white">Autosave</span>
									<p className="text-xs text-zinc-400">Save projects automatically every 30 seconds</p>
								</div>
								<input type="checkbox" defaultChecked className="h-4 w-4 rounded accent-blue-500" />
							</label>
							<label className="flex items-center justify-between rounded-lg border border-zinc-700 bg-zinc-800/50 px-4 py-3">
								<div>
									<span className="text-sm font-medium text-white">Snap to Grid</span>
									<p className="text-xs text-zinc-400">Snap timeline elements to the nearest frame</p>
								</div>
								<input type="checkbox" defaultChecked className="h-4 w-4 rounded accent-blue-500" />
							</label>
						</div>
					</section>

					{/* Danger Zone */}
					<section className="rounded-xl border border-red-500/20 bg-red-500/5 p-6">
						<h2 className="text-lg font-semibold text-red-400">Danger Zone</h2>
						<p className="mt-1 text-sm text-zinc-400">Permanently delete your account and all data.</p>
						<button
							type="button"
							onClick={() => toast.error("Account deletion is not yet implemented")}
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
