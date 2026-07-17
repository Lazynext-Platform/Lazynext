/** @module Chapter export utility for extracting chapter markers to various formats */
import type { ChapterMarker, ProjectJSON } from "../types";

const formatSeconds = (value: number): string => {
	const sec = Math.max(0, Math.floor(value));
	const h = Math.floor(sec / 3600);
	const m = Math.floor((sec % 3600) / 60);
	const s = sec % 60;
	if (h > 0) {
		return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
	}
	return `${m}:${String(s).padStart(2, "0")}`;
};

/** Utility representing getChapterMarkers. */
export const getChapterMarkers = (project: ProjectJSON): ChapterMarker[] => {
	const chapters = project.metadata?.chapters ?? [];
	return [...chapters].sort((a, b) => a.time - b.time);
};

/** Utility representing exportChaptersAsYouTube. */
export const exportChaptersAsYouTube = (project: ProjectJSON): string => {
	const chapters = getChapterMarkers(project);
	return chapters
		.map((chapter) => `${formatSeconds(chapter.time)} ${chapter.title}`)
		.join("\n");
};

/** Utility representing exportChaptersAsJSON. */
export const exportChaptersAsJSON = (project: ProjectJSON): string => {
	return JSON.stringify(getChapterMarkers(project), null, 2);
};
