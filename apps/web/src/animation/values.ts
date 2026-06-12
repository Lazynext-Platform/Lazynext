import type {
	AnimationColorPropertyPath,
	AnimationNumericPropertyPath,
	ElementAnimations,
} from "./types";
import { resolveAnimationPathValueAtTime } from "./resolve";
import type { Transform } from "@/primitives/transform";

export function resolveOpacityAtTime({
	baseOpacity,
	animations,
	localTime,
}: {
	baseOpacity: number;
	animations: ElementAnimations | undefined;
	localTime: number;
}): number {
	return resolveAnimationPathValueAtTime({
		animations,
		propertyPath: "opacity",
		localTime: Math.max(0, localTime),
		fallbackValue: baseOpacity,
	});
}

export function resolveNumberAtTime({
	baseValue,
	animations,
	propertyPath,
	localTime,
}: {
	baseValue: number;
	animations: ElementAnimations | undefined;
	propertyPath: AnimationNumericPropertyPath;
	localTime: number;
}): number {
	return resolveAnimationPathValueAtTime({
		animations,
		propertyPath,
		localTime: Math.max(0, localTime),
		fallbackValue: baseValue,
	});
}

export function resolveColorAtTime({
	baseColor,
	animations,
	propertyPath,
	localTime,
}: {
	baseColor: string;
	animations: ElementAnimations | undefined;
	propertyPath: AnimationColorPropertyPath;
	localTime: number;
}): string {
	return resolveAnimationPathValueAtTime({
		animations,
		propertyPath,
		localTime: Math.max(0, localTime),
		fallbackValue: baseColor,
	});
}

export function resolveTransformAtTime({
	baseTransform,
	animations,
	localTime,
}: {
	baseTransform: Transform;
	animations: ElementAnimations | undefined;
	localTime: number;
}): Transform {
	const safeLocalTime = Math.max(0, localTime);
	return {
		position: {
			x: resolveAnimationPathValueAtTime({
				animations,
				propertyPath: "transform.positionX",
				localTime: safeLocalTime,
				fallbackValue: baseTransform.position.x,
			}),
			y: resolveAnimationPathValueAtTime({
				animations,
				propertyPath: "transform.positionY",
				localTime: safeLocalTime,
				fallbackValue: baseTransform.position.y,
			}),
		},
		scaleX: resolveAnimationPathValueAtTime({
			animations,
			propertyPath: "transform.scaleX",
			localTime: safeLocalTime,
			fallbackValue: baseTransform.scaleX,
		}),
		scaleY: resolveAnimationPathValueAtTime({
			animations,
			propertyPath: "transform.scaleY",
			localTime: safeLocalTime,
			fallbackValue: baseTransform.scaleY,
		}),
		rotate: resolveAnimationPathValueAtTime({
			animations,
			propertyPath: "transform.rotate",
			localTime: safeLocalTime,
			fallbackValue: baseTransform.rotate,
		}),
	};
}
