/**
 * @module Supported transcription language definitions — code/name pairs
 * and the derived Language / LanguageCode utility types.
 */

export const LANGUAGES = [
	{ code: "en", name: "English" },
	{ code: "es", name: "Spanish" },
	{ code: "it", name: "Italian" },
	{ code: "fr", name: "French" },
	{ code: "de", name: "German" },
	{ code: "pt", name: "Portuguese" },
	{ code: "ru", name: "Russian" },
	{ code: "ja", name: "Japanese" },
	{ code: "zh", name: "Chinese" },
] as const;

/** Type definition for Language. */
export type Language = (typeof LANGUAGES)[number];
/** Type definition for LanguageCode. */
export type LanguageCode = Language["code"];
