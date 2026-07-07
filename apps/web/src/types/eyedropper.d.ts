/**
 * TypeScript declarations for the EyeDropper API (W3C spec).
 * Provides color picking from the user's screen in supported browsers.
 *
 * @module types/eyedropper
 */
interface EyeDropperResult {
	sRGBHex: string;
}

interface EyeDropper {
	open(options?: { signal?: AbortSignal }): Promise<EyeDropperResult>;
}

declare const EyeDropper:
	| {
			new (): EyeDropper;
	  }
	| undefined;
