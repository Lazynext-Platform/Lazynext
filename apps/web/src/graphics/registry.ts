/** @module Graphics registry for registering and looking up graphic shape definitions */
import { DefinitionRegistry } from "@/params/registry";
import type { GraphicDefinition } from "./types";

export class GraphicsRegistry extends DefinitionRegistry<
	string,
	GraphicDefinition
> {
	constructor() {
		super("graphic");
	}
}

export const graphicsRegistry = new GraphicsRegistry();
