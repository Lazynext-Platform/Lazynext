import Link from "next/link";
import { Film, Globe, Code, MessageCircle } from "lucide-react";
import Image from "next/image";

export function MarketingFooter() {
	return (
		<footer className="border-t border-neutral-800 bg-neutral-950 py-12 mt-24">
			<div className="max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-4 gap-8">
				<div className="col-span-1 md:col-span-2">
					<Link href="/" className="flex items-center gap-2 mb-4 text-white">
						<Image
							src="/logo.png"
							width={20}
							height={20}
							alt="Lazynext Logo"
							className="w-5 h-5 object-contain"
						/>
						<span className="font-bold tracking-tight">Lazynext</span>
					</Link>
					<p className="text-neutral-400 text-sm max-w-sm mb-6">
						The autonomous non-linear editor built for the next generation of
						creators. Powered by Rust, WebAssembly, and AI.
					</p>
					<div className="flex items-center gap-4 text-neutral-400">
						<Link href="#" className="hover:text-white transition-colors">
							<Globe className="w-5 h-5" />
						</Link>
						<Link href="#" className="hover:text-white transition-colors">
							<Code className="w-5 h-5" />
						</Link>
						<Link href="#" className="hover:text-white transition-colors">
							<MessageCircle className="w-5 h-5" />
						</Link>
					</div>
				</div>

				<div>
					<h3 className="font-semibold text-white mb-4">Product</h3>
					<ul className="space-y-3 text-sm text-neutral-400">
						<li>
							<Link
								href="#features"
								className="hover:text-cyan-400 transition-colors"
							>
								Features
							</Link>
						</li>
						<li>
							<Link
								href="/billing"
								className="hover:text-cyan-400 transition-colors"
							>
								Pricing
							</Link>
						</li>
						<li>
							<Link
								href="/changelog"
								className="hover:text-cyan-400 transition-colors"
							>
								Changelog
							</Link>
						</li>
					</ul>
				</div>

				<div>
					<h3 className="font-semibold text-white mb-4">Legal</h3>
					<ul className="space-y-3 text-sm text-neutral-400">
						<li>
							<Link
								href="/privacy"
								className="hover:text-cyan-400 transition-colors"
							>
								Privacy Policy
							</Link>
						</li>
						<li>
							<Link
								href="/terms"
								className="hover:text-cyan-400 transition-colors"
							>
								Terms of Service
							</Link>
						</li>
					</ul>
				</div>
			</div>
			<div className="max-w-7xl mx-auto px-6 mt-12 pt-8 border-t border-neutral-800 text-sm text-neutral-500 text-center">
				© {new Date().getFullYear()} Lazynext Corporation. All rights reserved.
			</div>
		</footer>
	);
}
