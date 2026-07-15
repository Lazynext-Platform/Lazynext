/**
 * Security settings client — enables/disables two-factor auth
 * and manages connected accounts.
 *
 * @module settings/security/client
 */

"use client";

import { useState } from "react";
import Link from "next/link";
import { authClient } from "@/auth/client";
import { toast } from "sonner";
import { friendlyAuthError } from "@/components/auth/auth-errors";
import { Shield, Smartphone, Key, Plus, Check, X } from "lucide-react";

export function SecuritySettingsClient({ user }: { user: any }) {
	const [mfaEnabled, setMfaEnabled] = useState(false);
	const [mfaLoading, setMfaLoading] = useState(false);
	const [showSetup, setShowSetup] = useState(false);
	const [totpURI, setTotpURI] = useState<string | null>(null);
	const [totpCode, setTotpCode] = useState("");
	const [backupCodes, setBackupCodes] = useState<string[]>([]);

	const handleEnableMFA = async () => {
		setMfaLoading(true);
		try {
			const result = await authClient.twoFactor.enable({});
			const data = result.data as {
				totpURI?: string;
				backupCodes?: string[];
			} | undefined;
			if (data?.totpURI) {
				setTotpURI(data.totpURI);
			}
			if (data?.backupCodes) {
				setBackupCodes(data.backupCodes);
			}
			setShowSetup(true);
			toast.success("Scan the QR code with your authenticator app.");
		} catch (err) {
			toast.error(friendlyAuthError(err, "Could not set up two-factor auth"));
		} finally {
			setMfaLoading(false);
		}
	};

	const handleVerifyMFA = async () => {
		if (totpCode.length !== 6) {
			toast.error("Enter a valid 6-digit code");
			return;
		}
		setMfaLoading(true);
		try {
			await authClient.twoFactor.verifyTotp({
				code: totpCode,
			});
			setShowSetup(false);
			setTotpURI(null);
			setTotpCode("");
			setMfaEnabled(true);
			toast.success("Two-factor authentication is now active!");
		} catch (err) {
			toast.error(friendlyAuthError(err, "Invalid code"));
		} finally {
			setMfaLoading(false);
		}
	};

	const handleDisableMFA = async () => {
		setMfaLoading(true);
		try {
			await authClient.twoFactor.disable({});
			setMfaEnabled(false);
			setBackupCodes([]);
			toast.success("Two-factor authentication disabled.");
		} catch (err) {
			toast.error(friendlyAuthError(err, "Could not disable two-factor auth"));
		} finally {
			setMfaLoading(false);
		}
	};

	const handleRegenBackupCodes = async () => {
		setMfaLoading(true);
		try {
			const result = await authClient.twoFactor.generateBackupCodes({});
			const codes = (result.data as { backupCodes?: string[] })?.backupCodes || [];
			setBackupCodes(codes);
			toast.success("New backup codes generated!");
		} catch (err) {
			toast.error(friendlyAuthError(err, "Could not regenerate backup codes"));
		} finally {
			setMfaLoading(false);
		}
	};

	return (
		<div className="mx-auto max-w-2xl space-y-8 p-6">
			<div className="flex items-center gap-3">
				<Shield className="h-6 w-6 text-[var(--accent-secondary)]" />
				<h1 className="text-2xl font-bold text-foreground">Security</h1>
			</div>

			{/* ── Two-Factor Authentication ──────────────────── */}
			<section className="rounded-xl border border-border bg-panel/50 p-6">
				<div className="flex items-center justify-between mb-4">
					<div className="flex items-center gap-2">
						<Smartphone className="h-5 w-5 text-muted" />
						<h2 className="text-lg font-semibold text-foreground">
							Two-Factor Authentication
						</h2>
					</div>
					{mfaEnabled ? (
						<span className="flex items-center gap-1 rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-400">
							<Check className="h-3 w-3" /> Enabled
						</span>
					) : (
						<span className="flex items-center gap-1 rounded-full bg-muted/10 px-3 py-1 text-xs font-medium text-muted">
							<X className="h-3 w-3" /> Disabled
						</span>
					)}
				</div>
				<p className="text-sm text-muted mb-4">
					Add an extra layer of security to your account by requiring a
					verification code from your authenticator app when signing in.
				</p>

				{showSetup ? (
					<div className="space-y-4">
						{totpURI && (
							<div className="rounded-lg border border-border p-4 text-center">
								<p className="text-sm text-muted mb-3">
									Scan this QR code with your authenticator app (Google
									Authenticator, Authy, 1Password, etc.)
								</p>
								<div className="mx-auto flex h-48 w-48 items-center justify-center rounded-lg bg-white p-2">
								{/* eslint-disable-next-line @next/next/no-img-element */}
									<img
										src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(totpURI)}`}
										alt="TOTP QR code"
										className="h-full w-full"
									/>
								</div>
								<p className="mt-2 text-xs text-muted break-all font-mono">
									{new URL(totpURI).searchParams.get("secret") || totpURI}
								</p>
							</div>
						)}
						{backupCodes.length > 0 && (
							<div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-4">
								<p className="text-xs font-medium text-amber-400 mb-2">
									Save these backup codes in a safe place. Each code can only be
									used once.
								</p>
								<div className="grid grid-cols-2 gap-1">
									{backupCodes.map((code, i) => (
										<code
											key={i}
											className="rounded bg-border/30 px-2 py-1 text-xs font-mono text-foreground"
										>
											{code}
										</code>
									))}
								</div>
							</div>
						)}
						<div>
							<label htmlFor="totp-code" className="mb-1 block text-xs font-medium text-muted">
								Enter 6-digit code from your authenticator app
							</label>
							<input
								id="totp-code"
								type="text"
								inputMode="numeric"
								autoComplete="one-time-code"
								maxLength={6}
								value={totpCode}
								onChange={(e) =>
									setTotpCode(e.target.value.replace(/\D/g, "").slice(0, 6))
								}
								className="w-full rounded-lg border border-border bg-panel px-3 py-2 text-center text-lg tracking-widest"
								placeholder="000000"
							/>
						</div>
						<button
							onClick={handleVerifyMFA}
							disabled={mfaLoading || totpCode.length !== 6}
							className="w-full rounded-lg bg-[var(--accent-secondary)] py-2 text-sm font-semibold disabled:opacity-50"
						>
							{mfaLoading ? "Verifying..." : "Verify & Activate"}
						</button>
					</div>
				) : mfaEnabled ? (
					<div className="space-y-3">
						{backupCodes.length > 0 && (
							<div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-4">
								<p className="text-xs font-medium text-amber-400 mb-2">
									Save these backup codes in a safe place. Each code can only be
									used once.
								</p>
								<div className="grid grid-cols-2 gap-1">
									{backupCodes.map((code, i) => (
										<code
											key={i}
											className="rounded bg-border/30 px-2 py-1 text-xs font-mono text-foreground"
										>
											{code}
										</code>
									))}
								</div>
							</div>
						)}
						<div className="flex gap-2">
							<button
								onClick={handleDisableMFA}
								disabled={mfaLoading}
								className="rounded-lg border border-red-500/30 px-4 py-2 text-sm font-medium text-red-400 hover:bg-red-500/10 disabled:opacity-50"
							>
								Disable 2FA
							</button>
							<button
								onClick={handleRegenBackupCodes}
								disabled={mfaLoading}
								className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-muted hover:bg-panel disabled:opacity-50"
							>
								Regenerate Codes
							</button>
						</div>
					</div>
				) : (
					<button
						onClick={handleEnableMFA}
						disabled={mfaLoading}
						className="rounded-lg bg-[var(--accent-secondary)] px-4 py-2 text-sm font-semibold text-foreground hover:bg-[var(--accent-secondary)]/80 disabled:opacity-50"
					>
						{mfaLoading ? "Setting up..." : "Enable Two-Factor Auth"}
					</button>
				)}
			</section>

			<section className="rounded-xl border border-border bg-panel/50 p-6">
				<div className="flex items-center gap-2 mb-4">
					<Key className="h-5 w-5 text-muted" />
					<h2 className="text-lg font-semibold text-foreground">
						Passkeys
					</h2>
				</div>
				<p className="text-sm text-muted mb-4">
					Sign in using your fingerprint, face, or device PIN. Passkeys
					are more secure than passwords and can&apos;t be phished.
				</p>
				<div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-4 mb-4">
					<p className="text-xs text-amber-400">
						Passkey registration requires a browser that supports WebAuthn
						(Chrome, Safari, Firefox, Edge). Open the web app on a
						supported device to register a passkey.
					</p>
				</div>
				<button
					onClick={async () => {
						try {
							// Trigger WebAuthn credential creation
							const res = await fetch("/api/auth/passkey/register-options", {
								method: "POST",
								headers: { "Content-Type": "application/json" },
								body: JSON.stringify({ name: "Primary Passkey" }),
							});
							if (!res.ok) {
								toast.error("Cannot register passkey on this device");
								return;
							}
							const options = await res.json();
							const credential =
								(await navigator.credentials.create({
									publicKey: options as any,
								})) as any;
							if (credential) {
								const verifyRes = await fetch(
									"/api/auth/passkey/verify-registration",
									{
										method: "PUT",
										headers: { "Content-Type": "application/json" },
										body: JSON.stringify({
											credentialId: credential.id,
											publicKey: JSON.stringify(credential.response),
											deviceType: "platform",
											backedUp: true,
											transports: "internal",
											name: "Primary Passkey",
										}),
									},
								);
								if (verifyRes.ok) {
									toast.success("Passkey registered successfully!");
								} else {
									toast.error("Failed to save passkey");
								}
							}
						} catch {
							toast.info("Passkeys are not supported on this device or browser.");
						}
					}}
					className="flex items-center gap-2 rounded-lg border border-dashed border-border px-4 py-2 text-sm font-medium text-muted hover:border-[var(--accent-secondary)] hover:text-[var(--accent-secondary)]"
				>
					<Plus className="h-4 w-4" />
					Register a Passkey
				</button>
			</section>

			{/* ── Active Sessions ─────────────────────────────── */}
			<section className="rounded-xl border border-border bg-panel/50 p-6">
				<div className="flex items-center gap-2 mb-4">
					<Smartphone className="h-5 w-5 text-muted" />
					<h2 className="text-lg font-semibold text-foreground">
						Active Sessions
					</h2>
				</div>
				<p className="text-sm text-muted mb-4">
					This is your current session. Sign out of other devices
					from the respective app or by changing your password.
				</p>
				<div className="rounded-lg border border-border bg-background/50 p-4">
					<div className="flex items-center justify-between">
						<div>
							<p className="text-sm font-medium text-foreground">
								Current Browser
							</p>
							<p className="text-xs text-muted">
								Signed in as {user?.email || "user"} · Active now
							</p>
						</div>
						<span className="flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-1 text-xs font-medium text-emerald-400">
							<Check className="h-3 w-3" /> Active
						</span>
					</div>
				</div>
			</section>

			{/* ── Connected Accounts ───────────────────────────── */}
			<section className="rounded-xl border border-border bg-panel/50 p-6">
				<h2 className="text-lg font-semibold text-foreground mb-4">
					Connected Accounts
				</h2>
				<p className="text-sm text-muted mb-4">
					Link your Google, Apple, or Microsoft account to sign in with
					any of them.
				</p>
				<div className="space-y-2">
					<Link
						href="/api/auth/sign-in/social?provider=google&callbackURL=/settings/security"
						className="flex items-center gap-2 rounded-lg border border-border px-4 py-3 text-sm text-[var(--accent-secondary)] hover:bg-panel"
					>
						<Plus className="h-4 w-4" />
						Connect a social account
					</Link>
				</div>
			</section>
		</div>
	);
}
