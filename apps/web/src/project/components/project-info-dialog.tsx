/**
 * Read-only dialog displaying project metadata.
 *
 * Shows duration, created/modified dates, and a truncated project ID.
 *
 * @module project/components/project-info-dialog
 */

import {
	Dialog,
	DialogBody,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import type { TProjectMetadata } from "@/project/types";
import { formatDate } from "@/utils/date";
import { Button } from "@/components/ui/button";

function formatProjectDuration(duration: number) {
	const durationSeconds = duration / 120000;
	const pad = (n: number) => n.toString().padStart(2, "0");
	const h = Math.floor(durationSeconds / 3600);
	const m = Math.floor((durationSeconds % 3600) / 60);
	const s = Math.floor(durationSeconds % 60);

	if (durationSeconds >= 3600) {
		return `${pad(h)}:${pad(m)}:${pad(s)}`;
	}
	return `${pad(m)}:${pad(s)}`;
}

function InfoRow({
	label,
	value,
}: {
	label: string;
	value: string | React.ReactNode;
}) {
	return (
		<div className="flex justify-between items-center py-0 last:pb-0">
			<span className="text-muted-foreground text-sm">{label}</span>
			<span className="text-sm font-medium">{value}</span>
		</div>
	);
}

/**
 * Displays project metadata in a read-only dialog.
 *
 * @param isOpen - whether the dialog is visible.
 * @param onOpenChange - callback when open state changes.
 * @param project - project metadata to display.
 */
export function ProjectInfoDialog({
	isOpen,
	onOpenChange,
	project,
}: {
	isOpen: boolean;
	onOpenChange: (open: boolean) => void;
	project: TProjectMetadata;
}) {
	const durationFormatted =
		project.duration > 0 ? formatProjectDuration(project.duration) : "0:00";

	return (
		<Dialog open={isOpen} onOpenChange={onOpenChange}>
			<DialogContent onOpenAutoFocus={(event) => event.preventDefault()}>
				<DialogHeader>
					<DialogTitle className="truncate max-w-[350px]">
						{project.name}
					</DialogTitle>
				</DialogHeader>

				<DialogBody className="flex flex-col">
					<InfoRow label="Duration" value={durationFormatted} />
					<InfoRow
						label="Created"
						value={formatDate({ date: project.createdAt })}
					/>
					<InfoRow
						label="Modified"
						value={formatDate({ date: project.updatedAt })}
					/>
					<InfoRow
						label="Project ID"
						value={
							<code className="text-xs bg-muted px-1.5 py-0.5 rounded">
								{project.id.slice(0, 8)}
							</code>
						}
					/>
				</DialogBody>
				<DialogFooter>
					<Button variant="outline" onClick={() => onOpenChange(false)}>
						Close
					</Button>
					<Button onClick={() => onOpenChange(false)}>Done</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
