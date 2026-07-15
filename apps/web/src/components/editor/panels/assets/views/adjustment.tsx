"use client";
/** @module Adjustment view — color correction sliders (brightness, contrast, saturation, temperature) */

export function AdjustmentView() {
	return (
		<div className="flex h-full flex-col gap-6 p-4 overflow-y-auto">
			<div>
				<div className="text-sm font-medium mb-1">Color Adjustment</div>
				<div className="text-xs text-muted-foreground mb-4">
					Fine-tune the colors and lighting of your clips.
				</div>
			</div>

			<div className="flex flex-col gap-4">
				<div className="space-y-2">
					<div className="flex justify-between text-xs">
						<label htmlFor="adjustment-brightness">Brightness</label>
						<span className="text-muted-foreground">0%</span>
					</div>
					<input
						id="adjustment-brightness"
						type="range"
						className="w-full"
						min="-100"
						max="100"
						defaultValue="0"
					/>
				</div>

				<div className="space-y-2">
					<div className="flex justify-between text-xs">
						<label htmlFor="adjustment-contrast">Contrast</label>
						<span className="text-muted-foreground">0%</span>
					</div>
					<input
						id="adjustment-contrast"
						type="range"
						className="w-full"
						min="-100"
						max="100"
						defaultValue="0"
					/>
				</div>

				<div className="space-y-2">
					<div className="flex justify-between text-xs">
						<label htmlFor="adjustment-saturation">Saturation</label>
						<span className="text-muted-foreground">0%</span>
					</div>
					<input
						id="adjustment-saturation"
						type="range"
						className="w-full"
						min="-100"
						max="100"
						defaultValue="0"
					/>
				</div>

				<div className="space-y-2">
					<div className="flex justify-between text-xs">
						<label htmlFor="adjustment-temperature">Temperature</label>
						<span className="text-muted-foreground">0</span>
					</div>
					<input
						id="adjustment-temperature"
						type="range"
						className="w-full"
						min="-100"
						max="100"
						defaultValue="0"
					/>
				</div>
			</div>
		</div>
	);
}
