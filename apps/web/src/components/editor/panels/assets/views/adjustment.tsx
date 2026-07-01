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
					// eslint-disable-next-line react/jsx-no-comment-textnodes
					<div className="flex justify-between text-xs">
						// eslint-disable-next-line jsx-a11y/label-has-associated-control //
						eslint-disable-next-line jsx-a11y/label-has-associated-control
						<label>Brightness</label>
						<span className="text-muted-foreground">0%</span>
					</div>
					<input
						type="range"
						className="w-full"
						min="-100"
						max="100"
						defaultValue="0"
					/>
				</div>

				<div className="space-y-2">
					// eslint-disable-next-line react/jsx-no-comment-textnodes
					<div className="flex justify-between text-xs">
						// eslint-disable-next-line jsx-a11y/label-has-associated-control //
						eslint-disable-next-line jsx-a11y/label-has-associated-control
						<label>Contrast</label>
						<span className="text-muted-foreground">0%</span>
					</div>
					<input
						type="range"
						className="w-full"
						min="-100"
						max="100"
						defaultValue="0"
					/>
				</div>

				<div className="space-y-2">
					// eslint-disable-next-line react/jsx-no-comment-textnodes
					<div className="flex justify-between text-xs">
						// eslint-disable-next-line jsx-a11y/label-has-associated-control //
						eslint-disable-next-line jsx-a11y/label-has-associated-control
						<label>Saturation</label>
						<span className="text-muted-foreground">0%</span>
					</div>
					<input
						type="range"
						className="w-full"
						min="-100"
						max="100"
						defaultValue="0"
					/>
				</div>

				<div className="space-y-2">
					// eslint-disable-next-line react/jsx-no-comment-textnodes
					<div className="flex justify-between text-xs">
						// eslint-disable-next-line jsx-a11y/label-has-associated-control //
						eslint-disable-next-line jsx-a11y/label-has-associated-control
						<label>Temperature</label>
						<span className="text-muted-foreground">0</span>
					</div>
					<input
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
