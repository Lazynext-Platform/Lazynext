/**
 * Local filesystem storage abstraction.
 *
 * All media is stored on the local filesystem on the Linode host.
 *
 * @module lib/storage
 */

import { promises as fs } from "fs";
import path from "path";

function sanitizeStoragePath(filePath: string): string {
	const clean = path.normalize(filePath).replace(/^\.\.(\/|\\)/, "");
	if (clean.includes("..")) {
		throw new Error(`Path traversal blocked: ${filePath}`);
	}
	return clean;
}

const STORAGE_ROOT = process.env.STORAGE_ROOT
	|| process.env.MEDIA_DIR
	|| path.join(process.cwd(), ".storage");

/** Filesystem storage backend. */
export interface StorageAdapter {
	writeFile(filePath: string, data: string | Buffer): Promise<void>;
	readFile(filePath: string): Promise<Buffer>;
	ensureDirectory(dirPath: string): Promise<void>;
}

class LocalStorageAdapter implements StorageAdapter {
	private resolve(filePath: string): string {
		return path.join(STORAGE_ROOT, sanitizeStoragePath(filePath));
	}

	async writeFile(filePath: string, data: string | Buffer): Promise<void> {
		const safePath = this.resolve(filePath);
		await fs.mkdir(path.dirname(safePath), { recursive: true });
		await fs.writeFile(safePath, data);
	}

	async readFile(filePath: string): Promise<Buffer> {
		return await fs.readFile(this.resolve(filePath));
	}

	async ensureDirectory(dirPath: string): Promise<void> {
		await fs.mkdir(this.resolve(dirPath), { recursive: true });
	}
}

/** Singleton local filesystem storage service. */
export const StorageService: StorageAdapter = new LocalStorageAdapter();
