/** @module Graphics registry for registering and looking up graphic shape definitions */
import { DefinitionRegistry } from "@/params/registry";
import type { GraphicDefinition } from "./types";

/** Class representing GraphicsRegistry. */
export class GraphicsRegistry extends DefinitionRegistry<
	string,
	GraphicDefinition
> {
	constructor() {
		super("graphic");
	}
}

/** Utility representing graphicsRegistry. */
export const graphicsRegistry = new GraphicsRegistry();
