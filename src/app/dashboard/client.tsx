"use client";

import React, { useEffect, useState } from "react";
import { useSession } from "@/auth/client";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Header } from "@/components/header";
import { Video, Sparkles, Wand2, Settings, FileText, CreditCard, PlayCircle, Zap, Box, Loader2 } from "lucide-react";

const QUICK_ACTIONS = [
  { label: "AI Copilot Editor", href: "/editor", icon: <Wand2 className="w-5 h-5 text-[var(--accent-primary)]" /> },
  { label: "My Projects", href: "/projects", icon: <Video className="w-5 h-5" /> },
  { label: "Billing & Usage", href: "/billing", icon: <CreditCard className="w-5 h-5" /> },
  { label: "Settings", href: "/settings", icon: <Settings className="w-5 h-5" /> },
];

export function DashboardClient() {
  const { data: session, isPending } = useSession();
  const router = useRouter();

  const [projects, setProjects] = useState<any[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetch('/api/projects')
      .then(res => res.json())
      .then(data => {
        if (data.projects) {
          setProjects(data.projects);
        }
      })
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, []);

  const handleCreateProject = async () => {
    setIsCreating(true);
    try {
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: `Project ${projects.length + 1}` })
      });
      const data = await res.json();
      if (data.success) {
        router.push(`/editor/${data.projectId}`);
      }
    } catch (err) {
      console.error(err);
      setIsCreating(false);
    }
  };

  if (isPending || isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--bg-main)]">
        <Loader2 className="w-10 h-10 text-[var(--accent-primary)] animate-spin" />
      </div>
    );
  }

  if (!session) { 
    router.push("/sign-in"); 
    return null; 
  }

  return (
    <div className="min-h-screen bg-[var(--bg-main)] text-[var(--text-primary)]">
      <Header />
      
      {/* Dynamic Background Glow */}
      <div className="fixed top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
        <div className="absolute -top-[20%] -left-[10%] w-[50%] h-[50%] rounded-full bg-[var(--accent-primary)] opacity-10 blur-[120px]" />
        <div className="absolute top-[60%] -right-[10%] w-[40%] h-[40%] rounded-full bg-[var(--accent-secondary)] opacity-10 blur-[100px]" />
      </div>

      <main className="relative z-10 mx-auto max-w-6xl px-6 py-16">
        {/* Header Section */}
        <div className="mb-14 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <h1 className="text-5xl font-black tracking-tight mb-2">
              Mission <span className="bg-gradient-to-r from-[var(--accent-primary)] to-[var(--accent-secondary)] bg-clip-text text-transparent">Control</span>
            </h1>
            <p className="text-[var(--text-muted)] text-lg">
              Welcome back, <span className="font-semibold text-[var(--text-primary)]">{session.user?.name || "Creator"}</span>. Your render nodes are standing by.
            </p>
          </div>
          <button 
            onClick={handleCreateProject} 
            disabled={isCreating} 
            className="group relative inline-flex items-center justify-center px-8 py-4 font-bold text-[#050505] bg-[var(--accent-primary)] rounded-2xl overflow-hidden transition-all hover:scale-[1.02] active:scale-[0.98] shadow-[0_4px_24px_rgba(1,243,254,0.3)] disabled:opacity-50 disabled:hover:scale-100"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
            {isCreating ? <Loader2 className="w-5 h-5 mr-3 animate-spin" /> : <Sparkles className="w-5 h-5 mr-3" />}
            <span className="text-lg">Start AI Project</span>
          </button>
        </div>

        {/* Telemetry Stats (Glassmorphism) */}
        <div className="mb-16 grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="glass-panel p-6 flex flex-col relative overflow-hidden group hover:border-[var(--accent-primary)]/50">
            <div className="absolute inset-0 bg-gradient-to-br from-[var(--accent-primary)]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            <div className="flex items-center justify-between mb-4 relative z-10">
              <span className="text-[var(--text-muted)] text-xs font-bold uppercase tracking-widest">AI Credits</span>
              <div className="p-2 rounded-lg bg-[var(--accent-primary)]/10 text-[var(--accent-primary)]">
                <Zap className="w-4 h-4" />
              </div>
            </div>
            <div className="text-4xl font-black text-[var(--text-primary)] relative z-10">15,000</div>
            <div className="mt-2 text-sm text-[var(--text-secondary)] relative z-10">Available this month</div>
          </div>
          
          <div className="glass-panel p-6 flex flex-col relative overflow-hidden group hover:border-[var(--accent-primary)]/50">
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            <div className="flex items-center justify-between mb-4 relative z-10">
              <span className="text-[var(--text-muted)] text-xs font-bold uppercase tracking-widest">Render Node</span>
              <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400">
                <Box className="w-4 h-4" />
              </div>
            </div>
            <div className="text-4xl font-black text-[var(--text-primary)] relative z-10">0h</div>
            <div className="mt-2 text-sm text-[var(--text-secondary)] relative z-10">Active runtime hours</div>
          </div>

          <div className="glass-panel p-6 flex flex-col relative overflow-hidden group hover:border-[var(--accent-primary)]/50">
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            <div className="flex items-center justify-between mb-4 relative z-10">
              <span className="text-[var(--text-muted)] text-xs font-bold uppercase tracking-widest">Projects</span>
              <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
                <Video className="w-4 h-4" />
              </div>
            </div>
            <div className="text-4xl font-black text-[var(--text-primary)] relative z-10">{projects.length}</div>
            <div className="mt-2 text-sm text-[var(--text-secondary)] relative z-10">Saved in cloud</div>
          </div>

          <div className="glass-panel p-6 flex flex-col relative overflow-hidden group hover:border-[var(--accent-primary)]/50">
            <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            <div className="flex items-center justify-between mb-4 relative z-10">
              <span className="text-[var(--text-muted)] text-xs font-bold uppercase tracking-widest">Storage</span>
              <div className="p-2 rounded-lg bg-purple-500/10 text-purple-400">
                <FileText className="w-4 h-4" />
              </div>
            </div>
            <div className="text-4xl font-black text-[var(--text-primary)] relative z-10">0 GB</div>
            <div className="mt-2 text-sm text-[var(--text-secondary)] relative z-10">Cloud bin utilized</div>
          </div>
        </div>

        {/* Quick Actions */}
        <h2 className="mb-6 text-2xl font-bold text-[var(--text-primary)] font-display">Quick Connect</h2>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4 mb-16">
          {QUICK_ACTIONS.map((a) => (
            <Link 
              key={a.label} 
              href={a.href}
              className="glass-panel flex items-center justify-center gap-3 px-5 py-5 text-sm font-bold transition-all hover:scale-[1.02] hover:border-[var(--accent-primary)]/40 hover:bg-[var(--bg-hover)]"
            >
              {a.icon} 
              <span>{a.label}</span>
            </Link>
          ))}
        </div>

        <section>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-[var(--text-primary)] font-display">Recent Renders</h2>
            {projects.length > 0 && (
              <Link href="/projects" className="text-sm font-semibold text-[var(--accent-primary)] hover:underline">
                View all
              </Link>
            )}
          </div>
          
          {projects.length === 0 ? (
            <div className="glass-panel p-16 text-center flex flex-col items-center justify-center border-dashed border-2">
              <div className="w-20 h-20 rounded-full bg-[var(--bg-hover)] flex items-center justify-center mb-6 shadow-inner">
                <PlayCircle className="w-10 h-10 text-[var(--text-muted)]" />
              </div>
              <p className="text-2xl font-bold text-[var(--text-primary)] mb-2 font-display">No projects yet</p>
              <p className="text-[var(--text-muted)] max-w-md mb-8">Your workspace is completely empty. Launch the Agentic AI Copilot to generate your first cinematic sequence.</p>
              <button 
                onClick={handleCreateProject} 
                disabled={isCreating}
                className="btn-premium inline-flex items-center px-8 py-3 text-[var(--accent-primary)] border-[var(--accent-primary)]/30 hover:border-[var(--accent-primary)] hover:bg-[var(--accent-primary)]/10"
              >
                {isCreating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Wand2 className="w-4 h-4 mr-2" />}
                Launch Editor
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {projects.map(p => (
                <Link key={p.id} href={`/editor/${p.id}`} className="glass-panel group p-4 hover:border-[var(--accent-primary)]/50 hover:shadow-[0_8px_30px_rgba(1,243,254,0.1)] transition-all duration-300">
                  <div className="aspect-video w-full rounded-xl bg-zinc-900 mb-4 flex items-center justify-center relative overflow-hidden">
                    <Video className="w-8 h-8 text-zinc-700 transition-transform duration-500 group-hover:scale-110" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-80" />
                    <div className="absolute bottom-3 left-3 flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
                      <span className="text-xs font-semibold text-white">Rendered</span>
                    </div>
                  </div>
                  <h3 className="font-bold text-lg text-[var(--text-primary)] truncate">{p.name}</h3>
                  <p className="text-sm text-[var(--text-muted)] mt-1">Edited {new Date(p.updatedAt).toLocaleDateString()}</p>
                </Link>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
