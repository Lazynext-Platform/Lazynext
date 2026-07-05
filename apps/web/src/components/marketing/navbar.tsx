/** @module Marketing navigation bar with logo, links, and theme toggle */
"use client";

import { useState } from "react";
import Link from "next/link";
import { Film, Menu, X } from "lucide-react";
import Image from "next/image";
import { ThemeToggle } from "../theme-toggle";

export function MarketingNavbar() {
	const [mobileOpen, setMobileOpen] = useState(false);

	const links = [
		{ href: "#features", label: "Features" },
		{ href: "#agents", label: "AI Agents" },
		{ href: "/feed", label: "Discover Feed" },
		{ href: "/billing", label: "Pricing" },
	];

	return (
		<nav className="fixed top-0 left-0 right-0 z-50 px-4 sm:px-6 py-3 sm:py-4">
			<div className="max-w-7xl mx-auto flex items-center justify-between bg-panel/80 backdrop-blur-xl border border-border/50 rounded-2xl px-4 sm:px-6 py-3 shadow-2xl">
				<Link href="/" className="flex items-center gap-2 group shrink-0">
					<div className="p-1 bg-[var(--accent-primary)]/10 rounded-lg group-hover:bg-[var(--accent-primary)]/20 transition-colors">
						<Image
							src="/logo.png"
							width={24}
							height={24}
							alt="Lazynext Logo"
							className="w-6 h-6 object-contain"
						/>
					</div>
					<span className="text-lg sm:text-xl font-bold tracking-tight text-foreground">
						Lazynext
					</span>
				</Link>

				<div className="hidden md:flex items-center gap-6 lg:gap-8 text-sm font-medium text-muted">
					{links.map((l) => (
						<Link
							key={l.href}
							href={l.href}
							className="hover:text-[var(--accent-primary)] transition-colors"
						>
							{l.label}
						</Link>
					))}
				</div>

				<div className="flex items-center gap-2 sm:gap-4">
					<ThemeToggle className="size-9 sm:size-10 [&>svg]:size-4 sm:[&>svg]:size-5" />
					<Link
						href="/sign-in"
						className="hidden sm:inline-flex px-4 sm:px-6 py-2 bg-hover hover:bg-glass text-foreground font-medium rounded-xl border border-border transition-colors text-sm"
					>
						Login
					</Link>
					<Link
						href="/sign-up"
						className="px-4 sm:px-6 py-2 bg-[var(--accent-primary)] hover:bg-[var(--accent-primary)]/80 text-[var(--text-on-accent)] font-semibold rounded-xl shadow-[var(--accent-glow)] transition-all text-sm"
					>
						Get Started
					</Link>
					<button
						onClick={() => setMobileOpen(true)}
						className="md:hidden p-2 -mr-1 rounded-lg hover:bg-hover text-foreground transition-colors"
						aria-label="Open menu"
					>
						<Menu className="size-5" />
					</button>
				</div>
			</div>

			{/* Mobile menu overlay */}
			{mobileOpen && (
				<div className="fixed inset-0 z-50 md:hidden">
					<div
						className="absolute inset-0 bg-black/60 backdrop-blur-sm"
						onClick={() => setMobileOpen(false)}
					/>
					<div className="absolute top-0 right-0 w-72 h-full bg-background border-l border-border shadow-2xl p-6 flex flex-col gap-6 animate-in slide-in-from-right duration-200">
						<div className="flex items-center justify-between">
							<span className="font-bold text-foreground text-lg">Menu</span>
							<button
								onClick={() => setMobileOpen(false)}
								className="p-2 rounded-lg hover:bg-hover text-foreground transition-colors"
								aria-label="Close menu"
							>
								<X className="size-5" />
							</button>
						</div>
						<nav className="flex flex-col gap-1">
							{links.map((l) => (
								<Link
									key={l.href}
									href={l.href}
									onClick={() => setMobileOpen(false)}
									className="px-4 py-3 text-foreground font-medium rounded-xl hover:bg-hover hover:text-[var(--accent-primary)] transition-colors"
								>
									{l.label}
								</Link>
							))}
						</nav>
						<div className="mt-auto pt-4 border-t border-border">
							<Link
								href="/sign-in"
								onClick={() => setMobileOpen(false)}
								className="block w-full text-center px-4 py-3 bg-hover hover:bg-glass text-foreground font-medium rounded-xl border border-border transition-colors mb-3"
							>
								Login
							</Link>
						</div>
					</div>
				</div>
			)}
		</nav>
	);
}
