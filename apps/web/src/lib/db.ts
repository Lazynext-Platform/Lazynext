/**
 * IndexedDB persistence layer for local project state.
 *
 * Provides raw IndexedDB operations for opening the database, saving,
 * loading, and clearing project state. Used for offline/local editing
 * before syncing to the server.
 *
 * @module lib/db
 */

const DB_NAME = "lazynext_db";
const STORE_NAME = "lazynext_store";

/**
 * Opens (or creates) the IndexedDB instance for Lazynext.
 *
 * @returns a Promise resolving to the opened IDBDatabase.
 */
export async function openDB(): Promise<IDBDatabase> {
	return new Promise((resolve, reject) => {
		const request = indexedDB.open(DB_NAME, 1);
		request.onupgradeneeded = (e) => {
			// eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion
			const db = (e.target as IDBOpenDBRequest).result;
			if (!db.objectStoreNames.contains(STORE_NAME)) {
				db.createObjectStore(STORE_NAME, { keyPath: "id" });
			}
		};
		request.onsuccess = () => resolve(request.result);
		request.onerror = () => reject(request.error);
	});
}

/**
 * Persists the current project state and media assets to IndexedDB.
 *
 * @param projectData - the serializable project state.
 * @param assets - array of media asset objects.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function saveProjectState(projectData: any, assets: any[]) {
	const db = await openDB();
	return new Promise<void>((resolve, reject) => {
		const transaction = db.transaction(STORE_NAME, "readwrite");
		const store = transaction.objectStore(STORE_NAME);

		const data = {
			id: "current_project",
			projectData,
			assets: assets.map((a) => ({
				id: a.id,
				name: a.name,
				file: a.file,
				peaks: a.peaks,
			})),
		};

		store.put(data);
		transaction.oncomplete = () => resolve();
		transaction.onerror = () => reject(transaction.error);
	});
}

/**
 * Loads the most recently saved project state from IndexedDB.
 *
 * @returns the project data and assets, or null if nothing is saved.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function loadProjectState(): Promise<{
	projectData: any;
	assets: any[];
} | null> {
	const db = await openDB();
	return new Promise((resolve, reject) => {
		const transaction = db.transaction(STORE_NAME, "readonly");
		const store = transaction.objectStore(STORE_NAME);
		const request = store.get("current_project");

		request.onsuccess = () => {
			if (request.result) {
				resolve({
					projectData: request.result.projectData,
					// eslint-disable-next-line @typescript-eslint/no-explicit-any
					assets: (request.result.assets || []).map((a: any) => ({
						...a,
						url: a.file ? URL.createObjectURL(a.file) : a.url || "",
					})),
				});
			} else {
				resolve(null);
			}
		};
		request.onerror = () => reject(request.error);
	});
}

/**
 * Removes the saved project state from IndexedDB.
 */
export async function clearProjectState() {
	const db = await openDB();
	return new Promise<void>((resolve, reject) => {
		const transaction = db.transaction(STORE_NAME, "readwrite");
		const store = transaction.objectStore(STORE_NAME);
		store.delete("current_project");
		transaction.oncomplete = () => resolve();
		transaction.onerror = () => reject(transaction.error);
	});
}
