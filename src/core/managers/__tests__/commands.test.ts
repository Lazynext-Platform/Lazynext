import { describe, expect, it, beforeEach, mock } from "bun:test";
import { CommandManager } from "../commands";
import { Command, type CommandResult } from "@/commands";

// --- Mocks ---

interface MockEditorCore {
	selection: {
		getSnapshot: () => MockSnapshot;
		restoreSnapshot: (opts: { snapshot: MockSnapshot }) => void;
		applySelectionPatch: (opts: { patch: MockSelectionPatch }) => MockSnapshot | undefined;
	};
	scenes: {
		getActiveSceneOrNull: () => { tracks: unknown } | null;
	};
	timeline: {
		updateTracks: (tracks: unknown) => void;
	};
}

interface MockSnapshot {
	selectedElements: string[];
}

interface MockSelectionPatch {
	selectedElements?: string[];
	selectedKeyframes?: unknown[];
	keyframeSelectionAnchor?: unknown;
	selectedMaskPoints?: unknown;
}

function createMockEditor(overrides?: Partial<MockEditorCore>): MockEditorCore {
	return {
		selection: {
			getSnapshot: () => ({ selectedElements: [] }),
			restoreSnapshot: () => {},
			applySelectionPatch: () => undefined,
		},
		scenes: {
			getActiveSceneOrNull: () => null,
		},
		timeline: {
			updateTracks: () => {},
		},
		...overrides,
	};
}

function createMockCommand(overrides?: {
	execute?: () => CommandResult | undefined;
	undo?: () => void;
	redo?: () => CommandResult | undefined;
}): Command {
	const cmd = {
		execute: (): CommandResult | undefined => undefined,
		undo: (): void => {},
		redo: (): CommandResult | undefined => undefined,
		...overrides,
	};
	return cmd as unknown as Command;
}

// --- Tests ---

describe("CommandManager", () => {
	let editor: MockEditorCore;
	let manager: CommandManager;

	beforeEach(() => {
		editor = createMockEditor();
		manager = new CommandManager(editor as any);
	});

	describe("execute", () => {
		it("calls command.execute()", () => {
			const executeFn = mock(() => undefined) as any;
			const command = createMockCommand({ execute: executeFn });

			manager.execute({ command });

			expect(executeFn).toHaveBeenCalledTimes(1);
		});

		it("returns the command after execution", () => {
			const command = createMockCommand();
			const result = manager.execute({ command });
			expect(result).toBe(command);
		});

		it("records the command in history", () => {
			const command = createMockCommand();
			manager.execute({ command });

			expect(manager.canUndo()).toBe(true);
		});

		it("clears the redo stack on execute", () => {
			const cmd1 = createMockCommand();
			manager.execute({ command: cmd1 });
			manager.undo();
			expect(manager.canRedo()).toBe(true);

			const cmd2 = createMockCommand();
			manager.execute({ command: cmd2 });
			expect(manager.canRedo()).toBe(false);
		});

		it("takes a selection snapshot before execution", () => {
			const snapshots: MockSnapshot[] = [];
			editor.selection.getSnapshot = () => {
				const snap = { selectedElements: [`elem-${snapshots.length}`] };
				snapshots.push(snap);
				return snap;
			};

			const command = createMockCommand();
			manager.execute({ command });
			manager.undo();

			expect(snapshots.length).toBeGreaterThanOrEqual(1);
		});
	});

	describe("undo/redo", () => {
		it("canUndo returns false when history is empty", () => {
			expect(manager.canUndo()).toBe(false);
		});

		it("canUndo returns true after executing a command", () => {
			manager.execute({ command: createMockCommand() });
			expect(manager.canUndo()).toBe(true);
		});

		it("calls command.undo() on undo", () => {
			const undoFn = mock(() => {}) as any;
			const command = createMockCommand({ undo: undoFn });

			manager.execute({ command });
			manager.undo();

			expect(undoFn).toHaveBeenCalledTimes(1);
		});

		it("canRedo returns true after undo", () => {
			manager.execute({ command: createMockCommand() });
			manager.undo();

			expect(manager.canRedo()).toBe(true);
		});

		it("calls command.redo() on redo", () => {
			const redoFn = mock(() => undefined) as any;
			const command = createMockCommand({ redo: redoFn });

			manager.execute({ command });
			manager.undo();
			manager.redo();

			expect(redoFn).toHaveBeenCalledTimes(1);
		});

		it("multiple undos work in LIFO order", () => {
			const calls: string[] = [];
			const cmd1 = createMockCommand({ undo: () => calls.push("cmd1") });
			const cmd2 = createMockCommand({ undo: () => calls.push("cmd2") });

			manager.execute({ command: cmd1 });
			manager.execute({ command: cmd2 });

			manager.undo();
			manager.undo();

			expect(calls).toEqual(["cmd2", "cmd1"]);
		});

		it("canUndo returns false after undoing all commands", () => {
			manager.execute({ command: createMockCommand() });
			manager.undo();

			expect(manager.canUndo()).toBe(false);
		});

		it("redo restores the command to history", () => {
			manager.execute({ command: createMockCommand() });
			manager.undo();
			expect(manager.canUndo()).toBe(false);

			manager.redo();
			expect(manager.canUndo()).toBe(true);
		});
	});

	describe("selection handling", () => {
		it("restores selection on undo when command declared a selection override", () => {
			let restoredSnapshot: MockSnapshot | null = null;
			editor.selection.restoreSnapshot = (opts) => {
				restoredSnapshot = opts.snapshot;
			};
			editor.selection.getSnapshot = () => ({ selectedElements: ["before-element"] });
			editor.selection.applySelectionPatch = () => ({ selectedElements: ["after-element"] });

			const command = createMockCommand({
				execute: () => ({ selection: { selectedElements: ["after-element"], selectedKeyframes: [], keyframeSelectionAnchor: null as any, selectedMaskPoints: null } } as unknown as CommandResult),
			});

			manager.execute({ command });
			manager.undo();

			expect(restoredSnapshot!).toEqual({ selectedElements: ["before-element"] });
		});

		it("does NOT restore selection on undo when command had no selection override", () => {
			let restoreCalled = false;
			editor.selection.restoreSnapshot = () => { restoreCalled = true; };

			const command = createMockCommand({
				execute: () => undefined,
			});

			manager.execute({ command });
			manager.undo();

			expect(restoreCalled).toBe(false);
		});
	});

	describe("clear", () => {
		it("clears history and redo stack", () => {
			manager.execute({ command: createMockCommand() });
			manager.undo();
			expect(manager.canUndo()).toBe(false);
			expect(manager.canRedo()).toBe(true);

			manager.clear();

			expect(manager.canUndo()).toBe(false);
			expect(manager.canRedo()).toBe(false);
		});
	});

	describe("push", () => {
		it("records a command without executing it", () => {
			const executeFn = mock(() => undefined) as any;
			const command = createMockCommand({ execute: executeFn });

			manager.push({ command });

			expect(executeFn).toHaveBeenCalledTimes(0);
			expect(manager.canUndo()).toBe(true);
		});

		it("clears redo stack on push", () => {
			manager.execute({ command: createMockCommand() });
			manager.undo();
			expect(manager.canRedo()).toBe(true);

			manager.push({ command: createMockCommand() });
			expect(manager.canRedo()).toBe(false);
		});
	});

	describe("reactors", () => {
		it("calls registered reactors after execute", () => {
			let called = false;
			const reactorFn = () => { called = true; };
			manager.registerReactor(reactorFn);

			manager.execute({ command: createMockCommand() });

			expect(called).toBe(true);
		});

		it("calls registered reactors after redo", () => {
			let redoCalled = false;
			const redoReactor = () => { redoCalled = true; };
			manager.registerReactor(redoReactor);

			manager.execute({ command: createMockCommand() });
			manager.undo();
			manager.redo();

			expect(redoCalled).toBe(true);
		});
	});

	describe("ripple editing", () => {
		it("does not call ripple when disabled", () => {
			manager.isRippleEnabled = false;
			const updateTracksFn = mock(() => {}) as any;
			editor.timeline.updateTracks = updateTracksFn;

			manager.execute({ command: createMockCommand() });

			// updateTracks should not be called for ripple since it's disabled
			expect(updateTracksFn).toHaveBeenCalledTimes(0);
		});
	});
});
