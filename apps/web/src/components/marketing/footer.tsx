/** @module Marketing footer with product and legal links */
import Link from "next/link";
import { Globe, Code, MessageCircle } from "lucide-react";
import Image from "next/image";

/** React component rendering MarketingFooter. */
export function MarketingFooter() {
	return (
		<footer className="border-t border-border bg-background py-12 mt-24">
			<div className="max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-4 gap-8">
				<div className="col-span-1 md:col-span-2">
					<Link
						href="/"
						className="flex items-center gap-2 mb-4 text-foreground"
					>
						<Image
							src="/logo.png"
							width={20}
							height={20}
							alt="Lazynext Logo"
							className="w-5 h-5 object-contain"
						/>
						<span className="font-bold tracking-tight">Lazynext</span>
					</Link>
					<p className="text-muted text-sm max-w-sm mb-6">
						The autonomous non-linear editor built for the next generation of
						creators. Powered by Rust, WebAssembly, and AI.
					</p>
					<div className="flex items-center gap-4 text-muted">
						<Link href="#" className="hover:text-foreground transition-colors">
							<Globe className="w-5 h-5" />
						</Link>
						<Link href="#" className="hover:text-foreground transition-colors">
							<Code className="w-5 h-5" />
						</Link>
						<Link href="#" className="hover:text-foreground transition-colors">
							<MessageCircle className="w-5 h-5" />
						</Link>
					</div>
				</div>

				<div>
					<h3 className="font-semibold text-foreground mb-4">Product</h3>
					<ul className="space-y-3 text-sm text-muted">
						<li>
							<Link
								href="#features"
								className="hover:text-[var(--accent-primary)] transition-colors"
							>
								Features
							</Link>
						</li>
						<li>
							<Link
								href="/billing"
								className="hover:text-[var(--accent-primary)] transition-colors"
							>
								Pricing
							</Link>
						</li>
						<li>
							<Link
								href="/changelog"
								className="hover:text-[var(--accent-primary)] transition-colors"
							>
								Changelog
							</Link>
						</li>
					</ul>
				</div>

				<div>
					<h3 className="font-semibold text-foreground mb-4">Legal</h3>
					<ul className="space-y-3 text-sm text-muted">
						<li>
							<Link
								href="/privacy"
								className="hover:text-[var(--accent-primary)] transition-colors"
							>
								Privacy Policy
							</Link>
						</li>
						<li>
							<Link
								href="/terms"
								className="hover:text-[var(--accent-primary)] transition-colors"
							>
								Terms of Service
							</Link>
						</li>
					</ul>
				</div>
			</div>
			<div className="max-w-7xl mx-auto px-6 mt-12 pt-8 border-t border-border text-sm text-muted/80 text-center">
				© {new Date().getFullYear()} Lazynext Corporation. All rights reserved.
			</div>
		</footer>
	);
}
