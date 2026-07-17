/**
 * Robots.txt generation — allows crawling of public pages while
 * disallowing Next.js internals and authenticated app routes.
 *
 * @module app/robots
 */

import type { MetadataRoute } from "next";
import { SITE_URL } from "@/site/brand";

/** Utility representing robots. */
export default function robots(): MetadataRoute.Robots {
	return {
		rules: {
			userAgent: "*",
			allow: "/",
			disallow: ["/_next/", "/projects/", "/editor/"],
		},
		sitemap: `${SITE_URL}/sitemap.xml`,
	};
}
