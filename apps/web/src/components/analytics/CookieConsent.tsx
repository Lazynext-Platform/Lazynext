/**
 * Cookie consent banner — GDPR-compliant cookie consent with
 * accept/deny stored in localStorage.
 *
 * @module components/analytics/CookieConsent
 */

"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

export function CookieConsent() {
	const [visible, setVisible] = useState(false);

	useEffect(() => {
		/* eslint-disable react-hooks/set-state-in-effect */
		const consented = localStorage.getItem("lazynext-cookie-consent");
		if (!consented) setVisible(true);
	}, []);

	const acceptAll = () => {
		localStorage.setItem("lazynext-cookie-consent", "all");
		setVisible(false);
	};

	const acceptEssential = () => {
		localStorage.setItem("lazynext-cookie-consent", "essential");
		setVisible(false);
	};

	if (!visible) return null;

	return (
		<div className="fixed bottom-0 left-0 right-0 z-[9999] border-t border-border bg-background/95 backdrop-blur-md p-4 shadow-2xl">
			<div className="mx-auto flex max-w-5xl flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
				<div className="flex-1">
					<p className="text-sm text-foreground">
						We use cookies to enhance your experience, analyze site usage, and
						improve our services.{" "}
						<Link
							href="/privacy"
							className="text-blue-400 underline hover:text-blue-300"
						>
							Privacy Policy
						</Link>
					</p>
				</div>
				<div className="flex gap-2">
					<button
						type="button"
						onClick={acceptEssential}
						className="rounded-lg border border-zinc-600 px-4 py-2 text-xs font-medium text-foreground hover:bg-panel transition-colors"
					>
						Essential Only
					</button>
					<button
						type="button"
						onClick={acceptAll}
						className="rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-foreground hover:bg-blue-500 transition-colors"
					>
						Accept All
					</button>
				</div>
			</div>
		</div>
	);
}
