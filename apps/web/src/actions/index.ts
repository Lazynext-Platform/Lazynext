export * from "./definitions";
export * from "./types";
export * from "./registry";
import { ACTIONS } from "./definitions";
import type { TActionWithOptionalArgs } from "./types";

export function isActionWithOptionalArgs(
	value: string,
): value is TActionWithOptionalArgs {
	return value in ACTIONS;
}
