// Stub type declarations for content-collections generated module.
// The real types are generated during `next build` by @content-collections/next
// and saved to .content-collections/generated/index.d.ts (gitignored).
// This stub allows `tsc --noEmit` (typecheck) to pass in CI before build.

declare module "content-collections" {
	// Mirror the shape of the generated .content-collections/generated/index.d.ts
	// without requiring the build step to have run.
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const allChangelogs: any[];

	// eslint-disable-next-line @typescript-eslint/no-empty-object-type
	type Changelog = (typeof allChangelogs)[number];

	export { Changelog, allChangelogs };
}
