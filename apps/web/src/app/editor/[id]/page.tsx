import EditorClient from "@/components/editor/EditorClient";
import ExportButton from "@/components/editor/export-button";
import { getProject } from "@/actions/project";
import { notFound } from "next/navigation";

export default async function EditorPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  const project = await getProject(resolvedParams.id);

  if (!project) {
    notFound();
  }

  // Ensure JSON payload has correct defaults
  const projectJson = {
    ...project,
    width: project.timeline?.width || 1920,
    height: project.timeline?.height || 1080,
    fps: project.timeline?.framerate || 60,
    duration_frames: 120, // TODO: derive from clips
    bg_color: [0.09, 0.09, 0.11, 1.0],
    tracks: project.timeline?.tracks || []
  };

  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-zinc-950 text-white">
      {/* Header */}
      <header className="flex h-12 w-full items-center justify-between border-b border-zinc-800 bg-zinc-900 px-4">
        <div className="flex items-center gap-4">
          <span className="font-bold">Lazynext</span>
          <span className="text-sm text-zinc-400">{project.name}</span>
        </div>
        <ExportButton projectId={project.id} />
      </header>

      {/* Main Body */}
      <div className="flex flex-1 overflow-hidden relative">
        <EditorClient project={projectJson} />
      </div>
    </div>
  );
}

