/**
 * Group move barrel — build move groups, resolve placements, and snap
 * group edges.
 *
 * @module timeline/group-move
 */

export { buildMoveGroup } from "./build-group";
export { resolveGroupMove } from "./resolve-move";
export { snapGroupEdges } from "./snap";

export type {
	GroupMember,
	GroupMoveResult,
	GroupTrackSection,
	MoveGroup,
	PlannedElementMove,
	PlannedTrackCreation,
} from "./types";
