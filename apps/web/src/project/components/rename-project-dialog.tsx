/**
 * Dialog for renaming an existing project.
 *
 * @module project/components/rename-project-dialog
 */

import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogBody,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { Label } from "@/components/ui/label";

/**
 * Modal dialog for renaming a project. Resets the input to the
 * current name each time the dialog opens.
 *
 * @param isOpen - whether the dialog is visible.
 * @param onOpenChange - callback when open state changes.
 * @param onConfirm - callback with the new project name.
 * @param projectName - current name of the project.
 */
export function RenameProjectDialog({
	isOpen,
	onOpenChange,
	onConfirm,
	projectName,
}: {
	isOpen: boolean;
	onOpenChange: (open: boolean) => void;
	onConfirm: (newName: string) => void;
	projectName: string;
}) {
	const [name, setName] = useState(projectName);

	const handleOpenChange = (open: boolean) => {
		if (open) {
			setName(projectName);
		}
		onOpenChange(open);
	};

	return (
		<Dialog open={isOpen} onOpenChange={handleOpenChange}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Rename project</DialogTitle>
				</DialogHeader>

				<DialogBody className="gap-3">
					<Label>New name</Label>
					<Input
						value={name}
						onChange={(e) => setName(e.target.value)}
						maxLength={200}
						onKeyDown={(e) => {
							if (e.key === "Enter") {
								e.preventDefault();
								const trimmed = name.trim();
								if (trimmed.length > 0) {
									onConfirm(trimmed);
								}
							}
						}}
						placeholder="Enter a new name"
					/>
				</DialogBody>

				<DialogFooter>
					<Button
						variant="outline"
						onClick={(e) => {
							e.preventDefault();
							e.stopPropagation();
							onOpenChange(false);
						}}
					>
						Cancel
					</Button>
					<Button
						onClick={() => {
							const trimmed = name.trim();
							if (trimmed.length > 0) {
								onConfirm(trimmed);
							}
						}}
					>
						Rename
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
