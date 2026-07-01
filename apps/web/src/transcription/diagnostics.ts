/**
 * @module transcription/diagnostics
 * @description Registers transcription-related diagnostics checks
 *   (e.g. warning when the timeline has no audio).
 */

import type { DiagnosticsManager } from "@/core/managers/diagnostics-manager";
import { timelineHasAudio } from "@/media/audio";

/** Scope key for transcription diagnostics. */
export const TRANSCRIPTION_DIAGNOSTICS_SCOPE = "transcription";

/**
 * Registers all transcription diagnostics on the provided diagnostics
 * manager.
 */
export function registerTranscriptionDiagnostics({
	diagnostics,
}: {
	diagnostics: DiagnosticsManager;
}): void {
	diagnostics.register({
		id: "transcription.no_audio",
		scope: TRANSCRIPTION_DIAGNOSTICS_SCOPE,
		severity: "caution",
		message: "No audio detected. Add a clip with audio to the timeline first.",
		check: (editor) => {
			const scene = editor.scenes.getActiveSceneOrNull();
			if (!scene) return false;
			return !timelineHasAudio({
				tracks: scene.tracks,
				mediaAssets: editor.media.getAssets(),
			});
		},
	});
}
