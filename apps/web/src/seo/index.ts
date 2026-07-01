/**
 * SEO barrel export — re-exports metadata config, Schema.org JSON-LD
 * components, head meta tags, and social card generators.
 *
 * @module seo
 */

export { SITE_CONFIG, generateMetadata } from "./metadata";
export {
	OrganizationLD,
	SoftwareAppLD,
	WebSiteLD,
	VideoObjectLD,
	BreadcrumbLD,
	HowToLD,
	ProductLD,
} from "./SchemaOrg";
export { SEOHeadTags, PreloadHeroImage } from "./HeadMeta";
export { UniversalSocialMeta } from "./SocialCards";
