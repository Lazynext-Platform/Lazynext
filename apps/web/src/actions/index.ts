/** @module Actions module barrel export for action definitions, types, and registry */
export * from "./definitions";
export * from "./types";
export * from "./registry";
import { ACTIONS } from "./definitions";
import type { TActionWithOptionalArgs } from "./types";

/** Utility representing isActionWithOptionalArgs. */
export function isActionWithOptionalArgs(
	value: string,
): value is TActionWithOptionalArgs {
	return value in ACTIONS;
}
