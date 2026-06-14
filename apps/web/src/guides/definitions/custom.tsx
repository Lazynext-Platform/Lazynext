import {
	PlusSignIcon,
	RulerIcon,
	Delete01Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Button } from "@/components/ui/button";
import type { GuideDefinition } from "@/guides/types";
import { usePreviewStore } from "@/preview/preview-store";
import { cn } from "@/utils/ui";

function CustomGuideOverlay() {
	const customLines = usePreviewStore((s) => s.customLines);

	return (
		<div className="absolute inset-0">
			{customLines.map((line, i) => (
				<div
					key={i}
					className={cn(
						"absolute bg-red-500",
						line.axis === "x" ? "top-0 bottom-0 w-px" : "left-0 right-0 h-px",
					)}
					style={{
						[line.axis === "x" ? "left" : "top"]: `${line.percent}%`,
					}}
				/>
			))}
		</div>
	);
}

function CustomGuideOptions() {
	const addCustomLine = usePreviewStore((s) => s.addCustomLine);
	const clearCustomLines = usePreviewStore((s) => s.clearCustomLines);

	return (
		<div className="flex gap-2">
			<Button
				variant="outline"
				size="sm"
				className="flex-1"
				onClick={() => {
					// Add a vertical line in the center
					addCustomLine("x", 50);
				}}
			>
				<HugeiconsIcon icon={PlusSignIcon} />
				Add vertical
			</Button>
			<Button
				variant="outline"
				size="sm"
				className="flex-1"
				onClick={() => {
					// Add a horizontal line in the center
					addCustomLine("y", 50);
				}}
			>
				<HugeiconsIcon icon={PlusSignIcon} />
				Add horizontal
			</Button>
			<Button
				variant="outline"
				size="icon"
				onClick={clearCustomLines}
				title="Clear all custom lines"
			>
				<HugeiconsIcon icon={Delete01Icon} className="size-4" />
			</Button>
		</div>
	);
}

export const customGuide = {
	id: "custom",
	label: "Custom",
	renderPreview: () => <HugeiconsIcon size={16} icon={RulerIcon} />,
	renderTriggerIcon: () => <HugeiconsIcon icon={RulerIcon} />,
	renderOverlay: () => <CustomGuideOverlay />,
	renderOptions: () => <CustomGuideOptions />,
} as const satisfies GuideDefinition;
