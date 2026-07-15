/** @module Sponsor type definitions and data for the marketing site */
export type Sponsor = {
	/** Sponsor display name. */
	name: string;
	/** Sponsor website URL. */
	url: string;
	/** Path to the sponsor's logo image. */
	logo: string;
	/** Description of the sponsor. */
	description: string;
	/** Whether to invert colors in dark mode. */
	invertOnDark?: boolean;
};

export const SPONSORS: Sponsor[] = [
	{
		name: "Modal",
		url: "https://modal.com?utm_source=lazynext",
		logo: "/logos/others/modal.svg",
		description: "Serverless GPU compute for AI video generation, fine-tuning, and inference.",
		invertOnDark: true,
	},
];
