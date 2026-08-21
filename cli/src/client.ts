// Thin HTTP client for the Lazynext API Gateway.
import { createWriteStream, statSync } from 'node:fs';
import { basename } from 'node:path';
import { request } from 'node:https';
import { request as httpRequest } from 'node:http';
import type { CliConfig } from './config';

export class ApiError extends Error {
  readonly status: number;
  readonly code?: string;
  constructor(status: number, message: string, code?: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

function onceHeader(raw: string | string[] | undefined): string | undefined {
  if (!raw) return undefined;
  return Array.isArray(raw) ? raw[0] : raw;
}

interface RequestOptions {
  method: string;
  path: string;
  query?: Record<string, string | boolean | undefined>;
  body?: unknown;
  headers?: Record<string, string>;
  // When set, stream the response body to this path instead of parsing JSON.
  streamTo?: string;
}

function buildUrl(config: CliConfig, path: string, query?: RequestOptions['query']): URL {
  const url = new URL(`/api/v1${path}`, config.url);
  if (query) {
    for (const [k, v] of Object.entries(query)) {
      if (v === undefined || v === false) continue;
      url.searchParams.set(k, String(v));
    }
  }
  return url;
}

export class Client {
  constructor(private readonly config: CliConfig) {}

  async json<T = unknown>(opts: RequestOptions): Promise<T> {
    const url = buildUrl(this.config, opts.path, opts.query);
    const isTls = url.protocol === 'https:';
    const body = opts.body !== undefined ? Buffer.from(JSON.stringify(opts.body)) : undefined;
    const headers: Record<string, string> = {
      Accept: 'application/json',
      ...(this.config.key ? { Authorization: `Bearer ${this.config.key}` } : {}),
      ...(opts.headers ?? {}),
    };
    if (body !== undefined) headers['Content-Type'] = 'application/json';

    return new Promise<T>((resolve, reject) => {
      const req = isTls
        ? request(url, { method: opts.method, headers }, (res) => this.handle(res, opts, resolve, reject))
        : httpRequest(url, { method: opts.method, headers }, (res) => this.handle(res, opts, resolve, reject));
      req.on('error', reject);
      if (body !== undefined) req.end(body);
      else req.end();
    });
  }

  /** Upload a file as a raw media body. */
  async uploadFile(filePath: string): Promise<unknown> {
    const url = buildUrl(this.config, '/media', { name: basename(filePath) });
    const stat = statSync(filePath);
    const mime = mimeForExt(filePath);
    const headers: Record<string, string> = {
      'Content-Type': mime,
      'Content-Length': String(stat.size),
      ...(this.config.key ? { Authorization: `Bearer ${this.config.key}` } : {}),
    };
    return new Promise((resolve, reject) => {
      const req = httpRequest(url, { method: 'POST', headers }, (res) => this.handle(res, { method: 'POST', path: '/media' }, resolve, reject));
      req.on('error', reject);
      const stream = createReadStreamSafe(filePath);
      stream.on('error', reject);
      stream.pipe(req);
    });
  }

  /** Download a media file to a local path. */
  async downloadFile(name: string, dest: string): Promise<{ bytes: number }> {
    const url = buildUrl(this.config, `/media/${name}`);
    const headers: Record<string, string> = {
      ...(this.config.key ? { Authorization: `Bearer ${this.config.key}` } : {}),
    };
    return new Promise((resolve, reject) => {
      const req = httpRequest(url, { method: 'GET', headers }, (res) => {
        if (res.statusCode && res.statusCode >= 400) {
          this.readError(res, reject);
          return;
        }
        const out = createWriteStream(dest);
        let bytes = 0;
        res.on('data', (c: Buffer) => { bytes += c.length; });
        res.pipe(out);
        out.on('finish', () => resolve({ bytes }));
        out.on('error', reject);
      });
      req.on('error', reject);
      req.end();
    });
  }

  private handle<T>(res: import('node:http').IncomingMessage, opts: RequestOptions, resolve: (v: T) => void, reject: (e: Error) => void): void {
    if (opts.streamTo) {
      if (res.statusCode && res.statusCode >= 400) { this.readError(res, reject); return; }
      const out = createWriteStream(opts.streamTo);
      res.pipe(out);
      out.on('finish', () => resolve(undefined as T));
      out.on('error', reject);
      return;
    }
    const chunks: Buffer[] = [];
    res.on('data', (c: Buffer) => chunks.push(c));
    res.on('end', () => {
      const text = Buffer.concat(chunks).toString('utf8');
      if (res.statusCode && (res.statusCode < 200 || res.statusCode >= 300)) {
        let message = `HTTP ${res.statusCode}`;
        let code: string | undefined;
        try { const j = JSON.parse(text); message = j.error || message; code = j.code; } catch { /* keep */ }
        reject(new ApiError(res.statusCode ?? 0, message, code));
        return;
      }
      if (!text) { resolve(undefined as T); return; }
      try { resolve(JSON.parse(text) as T); } catch { resolve(text as unknown as T); }
    });
  }

  private readError(res: import('node:http').IncomingMessage, reject: (e: Error) => void): void {
    const chunks: Buffer[] = [];
    res.on('data', (c: Buffer) => chunks.push(c));
    res.on('end', () => {
      const text = Buffer.concat(chunks).toString('utf8');
      let message = `HTTP ${res.statusCode}`;
      let code: string | undefined;
      try { const j = JSON.parse(text); message = j.error || message; code = j.code; } catch { /* keep */ }
      reject(new ApiError(res.statusCode ?? 0, message, code));
    });
  }
}

function createReadStreamSafe(filePath: string) {
  // Lazy require to keep the module import surface small.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { createReadStream } = require('node:fs') as typeof import('node:fs');
  return createReadStream(filePath);
}

const EXT_MIME: Record<string, string> = {
  '.mp4': 'video/mp4', '.mov': 'video/quicktime', '.webm': 'video/webm',
  '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.gif': 'image/gif',
  '.webp': 'image/webp', '.avif': 'image/avif', '.heic': 'image/heic', '.heif': 'image/heif',
  '.mp3': 'audio/mpeg', '.wav': 'audio/wav', '.m4a': 'audio/mp4', '.aac': 'audio/aac',
  '.ogg': 'audio/ogg', '.opus': 'audio/opus', '.flac': 'audio/flac',
};

export function mimeForExt(filePath: string): string {
  const i = filePath.lastIndexOf('.');
  const ext = i >= 0 ? filePath.slice(i).toLowerCase() : '';
  return EXT_MIME[ext] ?? 'application/octet-stream';
}

export { onceHeader };
