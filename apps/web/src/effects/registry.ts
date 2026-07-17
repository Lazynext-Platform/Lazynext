/** @module Effects registry for registering and looking up GPU effect definitions */
import { DefinitionRegistry } from "@/params/registry";
import type { EffectDefinition } from "@/effects/types";

/** Class representing EffectsRegistry. */
export class EffectsRegistry extends DefinitionRegistry<
	string,
	EffectDefinition
> {
	constructor() {
		super("effect");
	}
}

/** Utility representing effectsRegistry. */
export const effectsRegistry = new EffectsRegistry();
