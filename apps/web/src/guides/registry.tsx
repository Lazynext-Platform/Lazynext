/** @module Guide registry aggregating all canvas guide definitions */
import type { GuideDefinition } from "@/guides/types";
import { gridGuide } from "./definitions/grid";
import { customGuide } from "./definitions/custom";
import {
	tiktokGuide,
	igReelsGuide,
	ytShortsGuide,
	spotlightGuide,
} from "./definitions/platforms";

/** Documentation for this export. */
export type { GuideDefinition, GuideRenderProps } from "@/guides/types";

/** React component rendering GUIDE_REGISTRY. */
export const GUIDE_REGISTRY = [
	gridGuide,
	tiktokGuide,
	igReelsGuide,
	ytShortsGuide,
	spotlightGuide,
	customGuide,
] as const satisfies readonly GuideDefinition[];

/** Type definition for GuideId. */
export type GuideId = (typeof GUIDE_REGISTRY)[number]["id"];

/** Utility representing isGuideId. */
export function isGuideId(value: string): value is GuideId {
	return GUIDE_REGISTRY.some((guide) => guide.id === value);
}
