/** @module Guides module barrel export for canvas guide definitions and lookup */
import { GUIDE_REGISTRY } from "./registry";
import type { GuideDefinition } from "@/guides/types";

export { GUIDE_REGISTRY, isGuideId } from "./registry";
/** Documentation for this export. */
export type { GuideDefinition, GuideId, GuideRenderProps } from "./registry";
export { getGuidePreviewOverlaySource } from "./preview-overlay";

/** Utility representing getGuideById. */
export function getGuideById(guideId: string | null): GuideDefinition | null {
	if (!guideId) {
		return null;
	}

	return GUIDE_REGISTRY.find((guide) => guide.id === guideId) ?? null;
}
