/**
 * Cloud-agnostic storage abstraction.
 *
 * In local development, saves to the filesystem via Node.js `fs`.
 * In production (Azure), uploads files to Azure Blob Storage using
 * the `@azure/storage-blob` SDK with `DefaultAzureCredential`.
 *
 * The active adapter is selected via the `STORAGE_PROVIDER` env var.
 *
 * @module lib/storage
 */

import { promises as fs } from "fs";
import path from "path";

/**
 * Cloud-Agnostic Storage Service
 *
 * In local development, this saves to the local filesystem.
 * In production (Azure), this interface uploads files to Azure Blob Storage.
 */

function sanitizeStoragePath(filePath: string): string {
	const clean = path.normalize(filePath).replace(/^\.\.(\/|\\)/, "");
	if (clean.includes("..")) {
		throw new Error(`Path traversal blocked: ${filePath}`);
	}
	return clean;
}

const STORAGE_ROOT = process.env.STORAGE_ROOT
	|| path.join(process.cwd(), ".storage");

/** Common interface for file-system-like storage backends. */
export interface StorageAdapter {
	writeFile(filePath: string, data: string | Buffer): Promise<void>;
	readFile(filePath: string): Promise<Buffer>;
	ensureDirectory(dirPath: string): Promise<void>;
}

// ── Local Filesystem Adapter ──────────────────────────────────────────────

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

// ── Azure Blob Storage Adapter ────────────────────────────────────────────
// Uses @azure/storage-blob and DefaultAzureCredential for authentication.
// In Container Apps / AKS, this uses Managed Identity automatically.
// For local dev, az login or AZURE_STORAGE_CONNECTION_STRING works.

class AzureBlobStorageAdapter implements StorageAdapter {
	private container: string;
	private account: string;
	private blobClient: any | null = null;

	constructor() {
		this.container = process.env.MEDIA_BUCKET || "media";
		this.account = process.env.AZURE_STORAGE_ACCOUNT || "lazynextmediadev";
	}

	private async getContainerClient(): Promise<any> {
		if (this.blobClient) return this.blobClient;

		const { BlobServiceClient } = await import("@azure/storage-blob");
		const { DefaultAzureCredential } = await import("@azure/identity");

		// DefaultAzureCredential tries:
		// 1. Managed Identity (AZURE_CLIENT_ID)
		// 2. Azure CLI (az login)
		// 3. Environment vars (AZURE_TENANT_ID, etc.)
		const credential = new DefaultAzureCredential();

		const serviceClient = new BlobServiceClient(
			`https://${this.account}.blob.core.windows.net`,
			credential,
		);

		this.blobClient = serviceClient.getContainerClient(this.container);
		return this.blobClient;
	}

	async writeFile(filePath: string, data: string | Buffer): Promise<void> {
		const client = await this.getContainerClient();
		const blockBlobClient = client.getBlockBlobClient(filePath);
		await blockBlobClient.upload(data, data.length);
	}

	async readFile(filePath: string): Promise<Buffer> {
		const client = await this.getContainerClient();
		const blockBlobClient = client.getBlockBlobClient(filePath);
		return await blockBlobClient.downloadToBuffer();
	}

	async ensureDirectory(_dirPath: string): Promise<void> {
		// Azure Blob Storage is flat — no directories needed
	}
}

// ── Storage Service Export ────────────────────────────────────────────────

/** Singleton storage service, selects adapter based on STORAGE_PROVIDER. */
export const StorageService: StorageAdapter =
	process.env.STORAGE_PROVIDER === "azure"
		? new AzureBlobStorageAdapter()
		: new LocalStorageAdapter();
