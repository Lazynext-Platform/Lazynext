/** @module services/offline-storage Offline project storage and CRDT operation queue */
import AsyncStorage from "@react-native-async-storage/async-storage";

const PROJECTS_KEY = "@lazynext/projects";
const QUEUE_KEY = "@lazynext/crdt_queue";
const LAST_SYNC_KEY = "@lazynext/last_sync";

interface LocalProject {
	id: string;
	name: string;
	updatedAt: string;
	data: Record<string, unknown>;
}

interface CrdtOperation {
	id: string;
	timestamp: number;
	type: string;
	payload: Record<string, unknown>;
	projectId: string;
}

/** Offline-first project storage: AsyncStorage-backed CRUD, CRDT operation queue, and sync manager. */
export const OfflineStorage = {
	// ── Project Storage ──

	async saveProjectLocally(project: LocalProject): Promise<void> {
		const json = await AsyncStorage.getItem(PROJECTS_KEY);
		const projects: LocalProject[] = json ? JSON.parse(json) : [];
		const idx = projects.findIndex((p) => p.id === project.id);
		if (idx >= 0) {
			projects[idx] = project;
		} else {
			projects.push(project);
		}
		await AsyncStorage.setItem(PROJECTS_KEY, JSON.stringify(projects));
	},

	async loadLocalProjects(): Promise<LocalProject[]> {
		const json = await AsyncStorage.getItem(PROJECTS_KEY);
		return json ? JSON.parse(json) : [];
	},

	async getProjectById(id: string): Promise<LocalProject | null> {
		const projects = await this.loadLocalProjects();
		return projects.find((p) => p.id === id) ?? null;
	},

	async deleteProjectLocally(id: string): Promise<void> {
		const projects = await this.loadLocalProjects();
		const filtered = projects.filter((p) => p.id !== id);
		await AsyncStorage.setItem(PROJECTS_KEY, JSON.stringify(filtered));
	},

	// ── CRDT Operation Queue ──

	async enqueueOperation(op: CrdtOperation): Promise<void> {
		const json = await AsyncStorage.getItem(QUEUE_KEY);
		const queue: CrdtOperation[] = json ? JSON.parse(json) : [];
		queue.push(op);
		await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
	},

	async getQueuedOperations(): Promise<CrdtOperation[]> {
		const json = await AsyncStorage.getItem(QUEUE_KEY);
		return json ? JSON.parse(json) : [];
	},

	async clearQueue(): Promise<void> {
		await AsyncStorage.removeItem(QUEUE_KEY);
	},

	async removeOperation(opId: string): Promise<void> {
		const queue = await this.getQueuedOperations();
		const filtered = queue.filter((op) => op.id !== opId);
		await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(filtered));
	},

	// ── Sync ──

	async syncPendingChanges(): Promise<{
		synced: number;
		failed: number;
	}> {
		const queue = await this.getQueuedOperations();
		if (queue.length === 0) return { synced: 0, failed: 0 };

		let synced = 0;
		let failed = 0;

		for (const op of queue) {
			try {
				const { NativeBridge } = require("../NativeBridge");
				await NativeBridge.processIntent(
					JSON.stringify({ op: op.type, payload: op.payload }),
				);
				synced++;
			} catch {
				failed++;
			}
		}

		if (failed === 0) {
			await this.clearQueue();
		} else {
			const remaining = queue.slice(synced);
			await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(remaining));
		}

		await AsyncStorage.setItem(LAST_SYNC_KEY, new Date().toISOString());
		return { synced, failed };
	},

	async getLastSyncTime(): Promise<string | null> {
		return AsyncStorage.getItem(LAST_SYNC_KEY);
	},

	// ── Status ──

	async getOfflineStatus(): Promise<{
		isOnline: boolean;
		queuedOpsCount: number;
		pendingSync: boolean;
	}> {
		const queue = await this.getQueuedOperations();
		const isOnline = await (async () => {
			try {
				const { NativeBridge } = require("../NativeBridge");
				return NativeBridge.isOnline();
			} catch {
				return false;
			}
		})();

		return {
			isOnline,
			queuedOpsCount: queue.length,
			pendingSync: queue.length > 0,
		};
	},

	async getStorageUsage(): Promise<{ projectCount: number; queueSize: number }> {
		const projects = await this.loadLocalProjects();
		const queue = await this.getQueuedOperations();
		return {
			projectCount: projects.length,
			queueSize: queue.length,
		};
	},
};
