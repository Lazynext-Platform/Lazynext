import type { EditorCore } from "@/core";
import type { Bookmark, SceneTracks, TScene } from "@/timeline";
import { storageService } from "@/services/storage/service";
import {
	getMainScene,
	ensureMainScene,
	canDeleteScene,
	findCurrentScene,
} from "@/timeline/scenes";
import {
	getBookmarkAtTime,
	getFrameTime,
	isBookmarkAtTime,
	toggleBookmarkInArray,
	removeBookmarkFromArray,
	updateBookmarkInArray,
	moveBookmarkInArray,
} from "@/timeline/bookmarks/index";
import { buildEntityInsertOp, buildEntityDeleteOp, buildPropertyUpdateOp } from "@/collaboration/crdt-builders";
import type { MediaTime } from "@/wasm";

export class ScenesManager {
	private active: TScene | null = null;
	private list: TScene[] = [];
	private listeners = new Set<() => void>();

	constructor(private editor: EditorCore) {}

	async createScene({
		name,
		isMain = false,
	}: {
		name: string;
		isMain: boolean;
	}): Promise<string> {
		if (!this.editor.project.getActive()) {
			throw new Error("No active project");
		}

		const newSceneId = crypto.randomUUID();
		const scene: TScene = {
			id: newSceneId,
			name,
			isMain,
			createdAt: new Date() as any,
			updatedAt: new Date() as any,
			tracks: { overlay: [], main: null as any, audio: [] },
			bookmarks: [],
		};

		const op = buildEntityInsertOp(newSceneId, "scene", scene);
		this.editor.engine.applyOperation(op);
		return newSceneId;
	}

	async deleteScene({ sceneId }: { sceneId: string }): Promise<void> {
		const sceneToDelete = this.list.find((s) => s.id === sceneId);

		if (!sceneToDelete) {
			throw new Error("Scene not found");
		}

		const { canDelete, reason } = canDeleteScene({ scene: sceneToDelete });
		if (!canDelete) {
			throw new Error(reason);
		}

		if (!this.editor.project.getActive()) {
			throw new Error("No active project");
		}

		const op = buildEntityDeleteOp(sceneId, "scene", sceneToDelete);
		this.editor.engine.applyOperation(op);
	}

	async renameScene({
		sceneId,
		name,
	}: {
		sceneId: string;
		name: string;
	}): Promise<void> {
		if (!this.editor.project.getActive()) {
			throw new Error("No active project");
		}

		const op = buildPropertyUpdateOp(sceneId, "name", undefined, name);
		this.editor.engine.applyOperation(op);
	}

	async switchToScene({ sceneId }: { sceneId: string }): Promise<void> {
		const targetScene = this.list.find((s) => s.id === sceneId);

		if (!targetScene) {
			throw new Error("Scene not found");
		}

		const activeProject = this.editor.project.getActive();

		if (activeProject) {
			const updatedProject = {
				...activeProject,
				currentSceneId: sceneId,
				metadata: {
					...activeProject.metadata,
					updatedAt: new Date(),
				},
			};

			this.editor.project.setActiveProject({ project: updatedProject });
		}

		this.active = targetScene;
		this.notify();
	}

	async toggleBookmark({ time }: { time: MediaTime }): Promise<void> {
		const activeScene = this.getActiveSceneOrNull();
		const activeProject = this.editor.project.getActive();
		if (!activeScene || !activeProject) return;

		const frameTime = getFrameTime({
			time,
			fps: activeProject.settings.fps,
		});

		const updatedBookmarks = toggleBookmarkInArray({
			bookmarks: activeScene.bookmarks,
			frameTime,
		});

		const op = buildPropertyUpdateOp(activeScene.id, "bookmarks", activeScene.bookmarks, updatedBookmarks);
		this.editor.engine.applyOperation(op);
	}

	isBookmarked({ time }: { time: MediaTime }): boolean {
		const activeScene = this.getActiveScene();
		const activeProject = this.editor.project.getActive();

		if (!activeScene || !this.active || !activeProject) return false;

		const frameTime = getFrameTime({
			time,
			fps: activeProject.settings.fps,
		});

		return isBookmarkAtTime({ bookmarks: activeScene.bookmarks, frameTime });
	}

	async removeBookmark({ time }: { time: MediaTime }): Promise<void> {
		const activeScene = this.getActiveSceneOrNull();
		const activeProject = this.editor.project.getActive();
		if (!activeScene || !activeProject) return;

		const frameTime = getFrameTime({
			time,
			fps: activeProject.settings.fps,
		});

		const updatedBookmarks = removeBookmarkFromArray({
			bookmarks: activeScene.bookmarks,
			frameTime,
		});

		const op = buildPropertyUpdateOp(activeScene.id, "bookmarks", activeScene.bookmarks, updatedBookmarks);
		this.editor.engine.applyOperation(op);
	}

	async updateBookmark({
		time,
		updates,
	}: {
		time: MediaTime;
		updates: Partial<Omit<Bookmark, "time">>;
	}): Promise<void> {
		const activeScene = this.getActiveSceneOrNull();
		const activeProject = this.editor.project.getActive();
		if (!activeScene || !activeProject) return;

		const frameTime = getFrameTime({
			time,
			fps: activeProject.settings.fps,
		});

		const updatedBookmarks = updateBookmarkInArray({
			bookmarks: activeScene.bookmarks,
			frameTime,
			updates,
		});

		const op = buildPropertyUpdateOp(activeScene.id, "bookmarks", activeScene.bookmarks, updatedBookmarks);
		this.editor.engine.applyOperation(op);
	}

	async moveBookmark({
		fromTime,
		toTime,
	}: {
		fromTime: MediaTime;
		toTime: MediaTime;
	}): Promise<void> {
		const activeScene = this.getActiveSceneOrNull();
		const activeProject = this.editor.project.getActive();
		if (!activeScene || !activeProject) return;

		const fromFrameTime = getFrameTime({
			time: fromTime,
			fps: activeProject.settings.fps,
		});

		const toFrameTime = getFrameTime({
			time: toTime,
			fps: activeProject.settings.fps,
		});

		const updatedBookmarks = moveBookmarkInArray({
			bookmarks: activeScene.bookmarks,
			fromTime: fromFrameTime,
			toTime: toFrameTime,
		});

		const op = buildPropertyUpdateOp(activeScene.id, "bookmarks", activeScene.bookmarks, updatedBookmarks);
		this.editor.engine.applyOperation(op);
	}

	getBookmarkAtTime({ time }: { time: MediaTime }) {
		const activeScene = this.active;
		const activeProject = this.editor.project.getActive();

		if (!activeScene || !activeProject) return null;

		const frameTime = getFrameTime({
			time,
			fps: activeProject.settings.fps,
		});

		return getBookmarkAtTime({
			bookmarks: activeScene.bookmarks,
			frameTime,
		});
	}

	async loadProjectScenes({ projectId }: { projectId: string }): Promise<void> {
		try {
			const result = await storageService.loadProject({ id: projectId });
			if (result?.project.scenes) {
				const ensuredScenes = result.project.scenes ?? [];
				const currentScene = findCurrentScene({
					scenes: ensuredScenes,
					currentSceneId: result.project.currentSceneId,
				});

				this.list = ensuredScenes;
				this.active = currentScene;
				this.notify();
			}
		} catch (error) {
			console.error("Failed to load project scenes:", error);
			this.list = [];
			this.active = null;
			this.notify();
		}
	}

	initializeScenes({
		scenes,
		currentSceneId,
	}: {
		scenes: TScene[];
		currentSceneId?: string;
	}): void {
		const ensuredScenes = ensureMainScene({ scenes });
		const currentScene = currentSceneId
			? ensuredScenes.find((s) => s.id === currentSceneId)
			: null;

		const fallbackScene = getMainScene({ scenes: ensuredScenes });

		this.list = ensuredScenes;
		this.active = currentScene || fallbackScene;
		this.notify();

		const hasAddedMainScene = ensuredScenes.length > scenes.length;
		if (hasAddedMainScene) {
			const activeProject = this.editor.project.getActive();

			if (activeProject) {
				const updatedProject = {
					...activeProject,
					scenes: ensuredScenes,
					metadata: {
						...activeProject.metadata,
						updatedAt: new Date(),
					},
				};

				this.editor.project.setActiveProject({ project: updatedProject });
				this.editor.save.markDirty({ force: true });
			}
		}
	}

	clearScenes(): void {
		this.list = [];
		this.active = null;
		this.notify();
	}

	getActiveScene(): TScene {
		if (!this.active) {
			throw new Error("No active scene.");
		}
		return this.active;
	}

	getActiveSceneOrNull(): TScene | null {
		return this.active;
	}

	getScenes(): TScene[] {
		return this.list;
	}

	setScenes({
		scenes,
		activeSceneId,
	}: {
		scenes: TScene[];
		activeSceneId?: string;
	}): void {
		this.list = scenes;
		const nextActiveSceneId = activeSceneId ?? this.active?.id ?? null;
		this.active = nextActiveSceneId
			? (scenes.find((scene) => scene.id === nextActiveSceneId) ?? null)
			: null;
		this.notify();

		const activeProject = this.editor.project.getActive();
		if (activeProject) {
			const updatedProject = {
				...activeProject,
				scenes,
				metadata: {
					...activeProject.metadata,
					updatedAt: new Date(),
				},
			};
			this.editor.project.setActiveProject({ project: updatedProject });
		}
	}

	subscribe(listener: () => void): () => void {
		this.listeners.add(listener);
		return () => this.listeners.delete(listener);
	}

	private notify(): void {
		this.listeners.forEach((fn) => {
			fn();
		});
	}

	updateSceneTracks({ tracks }: { tracks: SceneTracks }): void {
		if (!this.active) return;

		const op = buildPropertyUpdateOp(this.active.id, "tracks", this.active.tracks, tracks);
		this.editor.engine.applyOperation(op);
	}
}
