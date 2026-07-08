/** @module Actions registry for registering and dispatching editor commands with keyboard shortcuts */
import type {
	TAction,
	TActionFunc,
	TActionWithArgs,
	TActionWithOptionalArgs,
	TActionArgsMap,
	TArgOfAction,
	TInvocationTrigger,
} from "./types";

/** Internal action handler signature receiving optional args and invocation trigger. */
type ActionHandler = (arg: unknown, trigger?: TInvocationTrigger) => void;
const boundActions: Partial<Record<TAction, ActionHandler[]>> = {};

// eslint-disable-next-line lazynext/prefer-object-params -- action registries read best as (action, handler).
export function bindAction<A extends TAction>(
	action: A,
	handler: TActionFunc<A>,
) {
	const handlers = boundActions[action];
	// eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion
	const typedHandler = handler as ActionHandler;
	if (handlers) {
		handlers.push(typedHandler);
	} else {
		boundActions[action] = [typedHandler];
	}
}

// eslint-disable-next-line lazynext/prefer-object-params -- action registries read best as (action, handler).
/**
 * Unregister a handler from an action so it no longer receives invocations.
 */
export function unbindAction<A extends TAction>(
	action: A,
	handler: TActionFunc<A>,
) {
	const handlers = boundActions[action];
	if (!handlers) return;

	// eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion
	const typedHandler = handler as ActionHandler;
	boundActions[action] = handlers.filter((h) => h !== typedHandler);

	if (boundActions[action]?.length === 0) {
		delete boundActions[action];
	}
}

/** Overloaded invoke function type dispatching actions with or without required args. */
type InvokeActionFunc = {
	/** Invoke an action that takes no required arguments. */
	(
		/** Action to invoke (optional-args variant). */
		action: TActionWithOptionalArgs,
		/** No arguments required. */
		args?: undefined,
		/** Source that triggered the invocation. */
		trigger?: TInvocationTrigger,
	): void;
	/** Invoke an action that requires typed arguments. */
	<A extends TActionWithArgs>(
		/** Action to invoke (required-args variant). */
		action: A,
		/** Typed arguments for the action. */
		args: TActionArgsMap[A],
		/** Source that triggered the invocation. */
		trigger?: TInvocationTrigger,
	): void;
};

// eslint-disable-next-line lazynext/prefer-object-params -- dispatchers conventionally separate action, payload, and trigger.
export const invokeAction: InvokeActionFunc = <A extends TAction>(
	action: A,
	args?: TArgOfAction<A>,
	trigger?: TInvocationTrigger,
) => {
	boundActions[action]?.forEach((handler) => {
		handler(args, trigger);
	});
};
