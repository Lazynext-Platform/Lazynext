const FEATURES = [
	{
		icon: "🤖",
		title: "AI-Powered Editing",
		description: "Describe your edit in natural language and watch our multi-model AI agent execute it across your timeline.",
	},
	{
		icon: "⚡",
		title: "Rust-Powered Core",
		description: "Sub-millisecond compositor built in Rust with wgpu. Real-time 8K playback without proxies.",
	},
	{
		icon: "🎨",
		title: "FFMPEG Filter Engine",
		description: "Type-safe filter_complex graph builder. 17+ filter types with preset chains for instant results.",
	},
	{
		icon: "🔒",
		title: "Local-First Architecture",
		description: "Your projects stay on your device. IndexedDB + OPFS with 31 migration versions. Sync when you want.",
	},
	{
		icon: "🌐",
		title: "Multi-Platform",
		description: "Web, Desktop (GPUI), CLI, MCP Server, and Mobile C-API. One engine, five interfaces.",
	},
	{
		icon: "🎬",
		title: "Professional Export",
		description: "4K/8K HDR export with color-managed pipeline. Cloud render farm for distributed processing.",
	},
];

export function FeaturesGrid() {
	return (
		<section className="px-4 py-24">
			<div className="mx-auto max-w-5xl">
				<div className="mb-16 text-center">
					<h2 className="text-3xl font-bold text-white md:text-4xl">Everything you need</h2>
					<p className="mt-3 text-zinc-400">A complete video editing platform powered by AI and Rust.</p>
				</div>
				<div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
					{FEATURES.map((f) => (
						<div key={f.title} className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6 transition-colors hover:border-zinc-700">
							<div className="mb-3 text-3xl">{f.icon}</div>
							<h3 className="text-lg font-semibold text-white">{f.title}</h3>
							<p className="mt-2 text-sm text-zinc-400">{f.description}</p>
						</div>
					))}
				</div>
			</div>
		</section>
	);
}
