import Link from "next/link";
import { Film } from "lucide-react";
import Image from "next/image";

export function MarketingNavbar() {
	return (
		<nav className="fixed top-0 left-0 right-0 z-50 px-6 py-4">
			<div className="max-w-7xl mx-auto flex items-center justify-between bg-neutral-900/40 backdrop-blur-xl border border-neutral-800/50 rounded-2xl px-6 py-3 shadow-2xl">
				<Link href="/" className="flex items-center gap-2 group">
					<div className="p-1 bg-[#00e5ff]/10 rounded-lg group-hover:bg-[#00e5ff]/20 transition-colors">
						<Image
							src="/logo.png"
							width={24}
							height={24}
							alt="Lazynext Logo"
							className="w-6 h-6 object-contain"
						/>
					</div>
					<span className="text-xl font-bold tracking-tight text-white">
						Lazynext
					</span>
				</Link>

				<div className="hidden md:flex items-center gap-8 text-sm font-medium text-neutral-300">
					<Link
						href="#features"
						className="hover:text-cyan-400 transition-colors"
					>
						Features
					</Link>
					<Link
						href="#agents"
						className="hover:text-cyan-400 transition-colors"
					>
						AI Agents
					</Link>
					<Link href="/feed" className="hover:text-cyan-400 transition-colors">
						Discover Feed
					</Link>
					<Link
						href="/billing"
						className="hover:text-cyan-400 transition-colors"
					>
						Pricing
					</Link>
				</div>

				<div className="flex items-center gap-4">
					<Link
						href="/sign-in"
						className="px-6 py-2 bg-white/5 hover:bg-white/10 text-white font-medium rounded-xl border border-white/10 transition-colors"
					>
						Login
					</Link>
					<Link
						href="/sign-up"
						className="px-6 py-2 bg-[#00e5ff] hover:bg-[#00b3cc] text-black font-semibold rounded-xl shadow-[0_0_15px_rgba(0,229,255,0.4)] transition-all"
					>
						Get Started
					</Link>
				</div>
			</div>
		</nav>
	);
}
