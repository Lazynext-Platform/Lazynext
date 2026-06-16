import { promises as fs } from "fs";
import path from "path";

/**
 * Cloud-Agnostic Storage Service
 *
 * In local development, this saves to the local filesystem.
 * In production (AWS/GCP), this interface can be seamlessly swapped to
 * upload files directly to an S3 bucket or Google Cloud Storage.
 */

export interface StorageAdapter {
	writeFile(filePath: string, data: string | Buffer): Promise<void>;
	readFile(filePath: string): Promise<Buffer>;
	ensureDirectory(dirPath: string): Promise<void>;
}

class LocalStorageAdapter implements StorageAdapter {
	async writeFile(filePath: string, data: string | Buffer): Promise<void> {
		await fs.writeFile(filePath, data);
	}

	async readFile(filePath: string): Promise<Buffer> {
		return await fs.readFile(filePath);
	}

	async ensureDirectory(dirPath: string): Promise<void> {
		await fs.mkdir(dirPath, { recursive: true });
	}
}

// AWS S3 Adapter (Example Implementation for the future)
/*
class S3StorageAdapter implements StorageAdapter {
	async writeFile(filePath: string, data: string | Buffer): Promise<void> {
		// Use aws-sdk to upload to S3
	}
	async readFile(filePath: string): Promise<Buffer> {
		// Use aws-sdk to download from S3
	}
	async ensureDirectory(dirPath: string): Promise<void> {
		// S3 is flat, no directories needed
	}
}
*/

export const StorageService: StorageAdapter =
	process.env.STORAGE_PROVIDER === "s3"
		? new LocalStorageAdapter() // Replace with S3StorageAdapter when implementing
		: new LocalStorageAdapter();
