import EditorClient from "@/components/editor/EditorClient";
import ExportButton from "@/components/editor/export-button";
import { EditorErrorBoundary } from "@/components/editor/EditorErrorBoundary";
import { EditorStateProvider } from "@/components/editor/useEditorState";
import { getProject } from "@/actions/project";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function EditorPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  const project = await getProject(resolvedParams.id);

  if (!project) {
    notFound();
  }

  // Ensure JSON payload has correct defaults
  const tracks = project.timeline?.tracks || [];
  const maxClipEnd = tracks.reduce((max: number, track: { clips?: Array<{ start_frame?: number; duration_frames?: number }> }) => {
    for (const clip of track.clips || []) {
      const end = (clip.start_frame || 0) + (clip.duration_frames || 0);
      if (end > max) max = end;
    }
    return max;
  }, 0);

  const projectJson = {
    ...project,
    width: project.timeline?.width || 1920,
    height: project.timeline?.height || 1080,
    fps: project.timeline?.framerate || 60,
    duration_frames: maxClipEnd || 120,
    bg_color: [0.09, 0.09, 0.11, 1.0],
    tracks,
  };

  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-zinc-950 text-white selection:bg-violet-500/30">
      {/* Header */}
      <header className="flex h-14 w-full items-center justify-between border-b border-white/5 bg-zinc-950/80 backdrop-blur-md px-6 shadow-sm z-50">
        <div className="flex items-center gap-6">
          <span className="font-extrabold tracking-tight bg-gradient-to-r from-violet-400 to-fuchsia-400 bg-clip-text text-transparent">
            Lazynext
          </span>
          <div className="h-4 w-px bg-white/10" />
          <span className="text-sm font-medium text-zinc-300">{project.name}</span>
        </div>
        <ExportButton projectId={project.id} />
      </header>

      {/* Main Body — wrapped in state provider + error boundary */}
      <EditorStateProvider initialProject={projectJson}>
        <EditorErrorBoundary section="Editor">
          <div className="flex flex-1 overflow-hidden relative">
            <div className="absolute inset-0 z-0 bg-[url('/noise.png')] opacity-5 pointer-events-none" />
            <div className="relative z-10 flex flex-1 w-full h-full">
              <EditorClient project={projectJson} />
            </div>
          </div>
        </EditorErrorBoundary>
      </EditorStateProvider>
    </div>
  );
}

