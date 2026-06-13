"use client";

import React, { useEffect, useState } from "react";
import { useSession } from "@/auth/client";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Header } from "@/components/header";
import { Video, Sparkles, Wand2, Settings, FileText, CreditCard, PlayCircle, Zap, Box, Loader2 } from "lucide-react";

const QUICK_ACTIONS = [
  { label: "AI Copilot Editor", href: "/editor", icon: <Wand2 className="w-5 h-5 text-cyan-400" /> },
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
      <div className="flex min-h-screen items-center justify-center bg-transparent">
        <Loader2 className="w-10 h-10 text-cyan-400 animate-spin" />
      </div>
    );
  }

  if (!session) { 
    router.push("/sign-in"); 
    return null; 
  }

  return (
    <div className="min-h-screen bg-transparent text-white font-sans relative">
      <Header />

      <main className="relative z-10 mx-auto max-w-6xl px-6 py-16">
        {/* Header Section */}
        <div className="mb-14 flex flex-col md:flex-row md:items-end justify-between gap-6 glass-panel p-8">
          <div>
            <h1 className="text-5xl font-display font-black tracking-tight mb-2">
              Mission <span className="bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">Control</span>
            </h1>
            <p className="text-white/60 text-lg">
              Welcome back, <span className="font-semibold text-white">{session.user?.name || "Creator"}</span>. Your render nodes are standing by.
            </p>
          </div>
          <button 
            onClick={handleCreateProject} 
            disabled={isCreating} 
            className="btn-primary px-8 py-4 flex items-center justify-center shadow-[0_0_30px_rgba(0,212,223,0.3)] hover:shadow-[0_0_40px_rgba(0,212,223,0.5)]"
          >
            {isCreating ? <Loader2 className="w-5 h-5 mr-3 animate-spin text-black" /> : <Sparkles className="w-5 h-5 mr-3 text-black" />}
            <span className="text-lg font-bold text-black">Start AI Project</span>
          </button>
        </div>

        {/* Telemetry Stats (Glassmorphism) */}
        <div className="mb-16 grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="glass-panel p-6 flex flex-col relative overflow-hidden group hover:border-[#00e5ff]/50 hover:bg-white/5 transition-all">
            <div className="flex items-center justify-between mb-4 relative z-10">
              <span className="text-white/50 text-xs font-bold uppercase tracking-widest font-display">AI Credits</span>
              <div className="p-2 rounded-lg bg-[#00e5ff]/10 text-[#00e5ff]">
                <Zap className="w-4 h-4" />
              </div>
            </div>
            <div className="text-4xl font-display font-black text-white relative z-10">15,000</div>
            <div className="mt-2 text-sm text-white/50 relative z-10">Available this month</div>
          </div>
          
          <div className="glass-panel p-6 flex flex-col relative overflow-hidden group hover:border-indigo-500/50 hover:bg-white/5 transition-all">
            <div className="flex items-center justify-between mb-4 relative z-10">
              <span className="text-white/50 text-xs font-bold uppercase tracking-widest font-display">Render Node</span>
              <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400">
                <Box className="w-4 h-4" />
              </div>
            </div>
            <div className="text-4xl font-display font-black text-white relative z-10">0h</div>
            <div className="mt-2 text-sm text-white/50 relative z-10">Active runtime hours</div>
          </div>

          <div className="glass-panel p-6 flex flex-col relative overflow-hidden group hover:border-emerald-500/50 hover:bg-white/5 transition-all">
            <div className="flex items-center justify-between mb-4 relative z-10">
              <span className="text-white/50 text-xs font-bold uppercase tracking-widest font-display">Projects</span>
              <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
                <Video className="w-4 h-4" />
              </div>
            </div>
            <div className="text-4xl font-display font-black text-white relative z-10">{projects.length}</div>
            <div className="mt-2 text-sm text-white/50 relative z-10">Saved in cloud</div>
          </div>

          <div className="glass-panel p-6 flex flex-col relative overflow-hidden group hover:border-[#0033ff]/50 hover:bg-white/5 transition-all">
            <div className="flex items-center justify-between mb-4 relative z-10">
              <span className="text-white/50 text-xs font-bold uppercase tracking-widest font-display">Storage</span>
              <div className="p-2 rounded-lg bg-[#0033ff]/10 text-[#00e5ff]">
                <FileText className="w-4 h-4" />
              </div>
            </div>
            <div className="text-4xl font-display font-black text-white relative z-10">0 GB</div>
            <div className="mt-2 text-sm text-white/50 relative z-10">Cloud bin utilized</div>
          </div>
        </div>

        {/* Quick Actions */}
        <h2 className="mb-6 text-2xl font-bold text-white font-display">Quick Connect</h2>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4 mb-16">
          {QUICK_ACTIONS.map((a) => (
            <Link 
              key={a.label} 
              href={a.href}
              className="glass-panel flex items-center justify-center gap-3 px-5 py-5 text-sm font-bold transition-all hover:scale-105 hover:border-[#00e5ff]/40 hover:bg-white/10"
            >
              {a.icon} 
              <span>{a.label}</span>
            </Link>
          ))}
        </div>

        <section>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-white font-display">Recent Renders</h2>
            {projects.length > 0 && (
              <Link href="/projects" className="text-sm font-semibold text-cyan-400 hover:text-cyan-300 hover:underline">
                View all
              </Link>
            )}
          </div>
          
          {projects.length === 0 ? (
            <div className="glass-panel p-16 text-center flex flex-col items-center justify-center">
              <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center mb-6 shadow-inner border border-white/10">
                <PlayCircle className="w-10 h-10 text-white/30" />
              </div>
              <p className="text-2xl font-bold text-white mb-2 font-display">No projects yet</p>
              <p className="text-white/50 max-w-md mb-8">Your workspace is completely empty. Launch the Agentic AI Copilot to generate your first cinematic sequence.</p>
              <button 
                onClick={handleCreateProject} 
                disabled={isCreating}
                className="btn-premium inline-flex items-center px-8 py-3 text-cyan-400 hover:text-cyan-300"
              >
                {isCreating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Wand2 className="w-4 h-4 mr-2" />}
                Launch Editor
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {projects.map(p => (
                <Link key={p.id} href={`/editor/${p.id}`} className="glass-panel group p-4 hover:border-[#00e5ff]/50 hover:shadow-[0_8px_30px_rgba(0,229,255,0.15)] transition-all duration-300">
                  <div className="aspect-video w-full rounded-xl bg-black/50 mb-4 flex items-center justify-center relative overflow-hidden border border-white/5">
                    <Video className="w-8 h-8 text-white/20 transition-transform duration-500 group-hover:scale-110" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-80" />
                    <div className="absolute bottom-3 left-3 flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(0,212,223,0.8)]" />
                      <span className="text-xs font-semibold text-white">Rendered</span>
                    </div>
                  </div>
                  <h3 className="font-bold text-lg text-white truncate">{p.name}</h3>
                  <p className="text-sm text-white/50 mt-1">Edited {new Date(p.updatedAt).toLocaleDateString()}</p>
                </Link>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
