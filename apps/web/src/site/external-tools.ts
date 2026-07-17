/** @module External tools data for the marketing site featuring partner integrations */
import { OcDataBuddyIcon, OcMarbleIcon } from "@/components/icons";

/** Type definition for ExternalTool. */
export type ExternalTool = {
	/** Tool display name. */
	name: string;
	/** Tool description text. */
	description: string;
	/** Tool URL. */
	url: string;
	/** Icon component for the tool. */
	icon: React.ElementType;
};

/** Utility representing EXTERNAL_TOOLS. */
export const EXTERNAL_TOOLS: ExternalTool[] = [
	{
		name: "Marble",
		description:
			"Modern headless CMS for content management and the blog for Lazynext",
		url: "https://marblecms.com?utm_source=lazynext",
		icon: OcMarbleIcon,
	},
	{
		name: "Databuddy",
		description: "GDPR compliant analytics and user insights for Lazynext",
		url: "https://databuddy.cc?utm_source=lazynext",
		icon: OcDataBuddyIcon,
	},
];
