/**
 * Timeline Component — Re-exports the full interactive timeline from the parent directory.
 *
 * The primary implementation lives in `components/editor/timeline.tsx` (1428 lines)
 * which includes drag-and-drop, trimming, snapping, razor/slip/ripple/slide/roll tools,
 * minimap navigator, audio waveforms, markers, cloud comments, and more.
 *
 * This file exists for import convenience when components import from
 * `@/components/editor/timeline/Timeline`.
 */

export { default as Timeline } from "../timeline";
/** Documentation for this export. */
export type { default as TimelineDefault } from "../timeline";
