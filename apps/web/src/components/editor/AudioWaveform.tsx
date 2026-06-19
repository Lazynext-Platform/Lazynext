export default function AudioWaveform({
	width,
	seed,
	peaks,
}: {
	width: number;
	seed: string;
	peaks?: number[];
}) {
	const lines = [];
	const spacing = 3; // pixels between each bar
	const totalBars = Math.floor(width / spacing);

	if (peaks && peaks.length > 0) {
		// We have real peaks! Map them to the width.
		const step = peaks.length / totalBars;
		for (let i = 0; i < totalBars; i++) {
			const peakIdx = Math.min(Math.floor(i * step), peaks.length - 1);
			const val = peaks[peakIdx] || 0;
			const heightPercent = Math.max(10, Math.min(95, val * 100)); // normalized 0-1
			const x = i * spacing + 1;
			lines.push(
				<line
					key={i}
					x1={x}
					y1={`${50 - heightPercent / 2}%`}
					x2={x}
					y2={`${50 + heightPercent / 2}%`}
					stroke="currentColor"
					strokeWidth="1.5"
					strokeLinecap="round"
					opacity={0.6}
				/>,
			);
		}
	} else {
		// Fallback pseudo-random for dummy assets
		let h = 2166136261;
		for (let i = 0; i < seed.length; i++) {
			h = Math.imul(h ^ seed.charCodeAt(i), 16777619);
		}

		const rng = () => {
			h = Math.imul(h ^ (h >>> 16), 2246822507);
			h = Math.imul(h ^ (h >>> 13), 3266489909);
			return ((h ^= h >>> 16) >>> 0) / 4294967296;
		};

		for (let i = 0; i < totalBars; i++) {
			const heightPercent = 10 + Math.floor(rng() * 80);
			const x = i * spacing + 1;
			lines.push(
				<line
					key={i}
					x1={x}
					y1={`${50 - heightPercent / 2}%`}
					x2={x}
					y2={`${50 + heightPercent / 2}%`}
					stroke="currentColor"
					strokeWidth="1.5"
					strokeLinecap="round"
					opacity={0.6}
				/>,
			);
		}
	}

	return (
		<svg
			width="100%"
			height="100%"
			className="absolute inset-0 pointer-events-none text-foreground/50"
			preserveAspectRatio="none"
		>
			{lines}
		</svg>
	);
}
