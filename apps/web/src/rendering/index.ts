import type { ParamValues } from "@/params";
import type { Transform } from "@/primitives/transform";
import { type BlendMode, isBlendMode } from "@/primitives/blend-mode";
export type { BlendMode };

export function buildTransformFromParams({
	params,
}: {
	params: ParamValues;
}): Transform {
	return {
		scaleX: readNumberParam({ params, key: "transform.scaleX", fallback: 1 }),
		scaleY: readNumberParam({ params, key: "transform.scaleY", fallback: 1 }),
		position: {
			x: readNumberParam({ params, key: "transform.positionX", fallback: 0 }),
			y: readNumberParam({ params, key: "transform.positionY", fallback: 0 }),
		},
		rotate: readNumberParam({ params, key: "transform.rotate", fallback: 0 }),
	};
}

export function readOpacityFromParams({
	params,
}: {
	params: ParamValues;
}): number {
	return readNumberParam({ params, key: "opacity", fallback: 1 });
}

export function readBlendModeFromParams({
	params,
}: {
	params: ParamValues;
}): BlendMode {
	const value = params.blendMode;
	return typeof value === "string" && isBlendMode(value) ? value : "normal";
}

function readNumberParam({
	params,
	key,
	fallback,
}: {
	params: ParamValues;
	key: string;
	fallback: number;
}): number {
	const value = params[key];
	return typeof value === "number" ? value : fallback;
}
