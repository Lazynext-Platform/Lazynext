/**
 * Project-specific editor page — loads a project by ID, wraps the
 * modern editor client with state provider, error boundary, command
 * palette, keyboard hints, and quick actions FAB.
 *
 * @page /editor/[id]
 */

import ModernEditorClient from "@/components/editor/ModernEditorClient";
import { EditorErrorBoundary } from "@/components/editor/EditorErrorBoundary";
import { EditorStateProvider } from "@/components/editor/useEditorState";
import { EditorUIClient } from "./editor-ui-client";
import { getProject } from "@/actions/project";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function EditorPage({
	params,
}: {
	params: Promise<{ id: string }>;
}) {
	const resolvedParams = await params;
	const project = await getProject(resolvedParams.id);

	if (!project) {
		notFound();
	}

	const tracks = project.timeline?.tracks || [];
	const maxClipEnd = tracks.reduce(
		(
			max: number,
			track: {
				clips?: Array<{ start_frame?: number; duration_frames?: number }>;
			},
		) => {
			for (const clip of track.clips || []) {
				const end = (clip.start_frame || 0) + (clip.duration_frames || 0);
				if (end > max) max = end;
			}
			return max;
		},
		0,
	);

	const projectJson = {
		...project,
		width: project.timeline?.width || 1920,
		height: project.timeline?.height || 1080,
		fps: project.timeline?.framerate || 60,
		duration_frames: maxClipEnd || 120,
		bg_color: [0.09, 0.09, 0.11, 1.0] as [number, number, number, number],
		tracks,
	};

	return (
		<div className="flex h-screen w-screen flex-col overflow-hidden bg-background text-foreground selection:bg-blue-500/30">
			<EditorStateProvider initialProject={projectJson}>
				<EditorErrorBoundary section="Editor">
					<EditorUIClient project={projectJson} projectId={project.id} projectName={project.name} />
				</EditorErrorBoundary>
			</EditorStateProvider>
		</div>
	);
}
