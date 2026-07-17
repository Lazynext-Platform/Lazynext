/** @module Actions type definitions for action handlers, shortcuts, and refs */
import type { MutableRefObject } from "react";
import type { TAction } from "./definitions";

/** Documentation for this export. */
export type { TAction };

/** Type definition for TActionArgsMap. */
export type TActionArgsMap = {
	"seek-forward": { seconds: number } | undefined;
	"seek-backward": { seconds: number } | undefined;
	"jump-forward": { seconds: number } | undefined;
	"jump-backward": { seconds: number } | undefined;
	"remove-media-assets": { projectId: string; assetIds: string[] };
};

type TKeysWithValueUndefined<T> = {
	[K in keyof T]: undefined extends T[K] ? K : never;
}[keyof T];

/** Type definition for TActionWithArgs. */
export type TActionWithArgs = keyof TActionArgsMap;

/** Type definition for TActionWithOptionalArgs. */
export type TActionWithOptionalArgs =
	| TActionWithNoArgs
	| TKeysWithValueUndefined<TActionArgsMap>;

/** Type definition for TActionWithNoArgs. */
export type TActionWithNoArgs = Exclude<TAction, TActionWithArgs>;

/** Type definition for TArgOfAction. */
export type TArgOfAction<A extends TAction> = A extends TActionWithArgs
	? TActionArgsMap[A]
	: undefined;

/** Type definition for TActionFunc. */
export type TActionFunc<A extends TAction> = A extends TActionWithArgs
	? (arg: TArgOfAction<A>, trigger?: TInvocationTrigger) => void
	: (_?: undefined, trigger?: TInvocationTrigger) => void;

/** Type definition for TInvocationTrigger. */
export type TInvocationTrigger = "keypress" | "mouseclick";

/** Type definition for TBoundActionList. */
export type TBoundActionList = {
	[A in TAction]?: Array<TActionFunc<A>>;
};

/** Type definition for TActionHandlerOptions. */
export type TActionHandlerOptions =
	| MutableRefObject<boolean>
	| boolean
	| undefined;
