/** @module Effects definitions registration that populates the effects registry at import time */
import { effectsRegistry } from "../registry";
import { blurEffectDefinition } from "./blur";

const defaultEffects = [blurEffectDefinition];

/** Utility representing registerDefaultEffects. */
export function registerDefaultEffects(): void {
	for (const definition of defaultEffects) {
		if (effectsRegistry.has(definition.type)) {
			continue;
		}
		effectsRegistry.register({
			key: definition.type,
			definition,
		});
	}
}
