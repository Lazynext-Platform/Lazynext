/**
 * @module Panel layout configuration — fixed percentage splits for the
 * editor's workspace panels (tools, preview, properties, timeline).
 */

export const PANEL_CONFIG = {
	panels: {
		tools: 25,
		preview: 50,
		properties: 25,
		mainContent: 50,
		timeline: 50,
	},
} as const;
