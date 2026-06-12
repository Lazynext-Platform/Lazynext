import Link from 'next/link';
import { Film } from 'lucide-react';

export function MarketingNavbar() {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 px-6 py-4">
      <div className="max-w-7xl mx-auto flex items-center justify-between bg-neutral-900/40 backdrop-blur-xl border border-neutral-800/50 rounded-2xl px-6 py-3 shadow-2xl">
        <Link href="/" className="flex items-center gap-2 group">
          <div className="p-2 bg-cyan-500/10 text-cyan-400 rounded-lg group-hover:bg-cyan-500/20 transition-colors">
            <Film className="w-6 h-6" />
          </div>
          <span className="text-xl font-bold tracking-tight text-white">Lazynext 2025</span>
        </Link>
        
        <div className="hidden md:flex items-center gap-8 text-sm font-medium text-neutral-300">
          <Link href="#features" className="hover:text-cyan-400 transition-colors">Features</Link>
          <Link href="#agents" className="hover:text-cyan-400 transition-colors">AI Agents</Link>
          <Link href="/feed" className="hover:text-cyan-400 transition-colors">Discover Feed</Link>
          <Link href="/billing" className="hover:text-cyan-400 transition-colors">Pricing</Link>
        </div>

        <div className="flex items-center gap-4">
          <Link href="/login" className="text-sm font-medium text-neutral-300 hover:text-white transition-colors">
            Log In
          </Link>
          <Link 
            href="/editor" 
            className="text-sm font-medium bg-white text-black px-4 py-2 rounded-xl hover:bg-neutral-200 transition-colors shadow-[0_0_15px_rgba(255,255,255,0.1)] hover:shadow-[0_0_20px_rgba(255,255,255,0.2)]"
          >
            Launch Editor
          </Link>
        </div>
      </div>
    </nav>
  );
}
