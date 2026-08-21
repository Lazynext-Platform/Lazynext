// API Gateway — a versioned, API-key-authenticated REST surface that exposes
// Lazynext's project library, media, search, and agent discovery to external
// apps, services, integrations, the CLI, the browser extension, and the mobile
// app. It is the single "central API layer" consumed by every other format.
//
// Auth: Authorization: Bearer <LAZYNEXT_API_KEY>  or  x-lazynext-api-key: <key>
// Rate limit: token bucket per key (default 120/min; LAZYNEXT_API_RATE_LIMIT)
// Discovery: GET /api/v1/health (public) · GET /api/v1/openapi.json · GET /api/v1/docs
//
// The gateway reuses the same importable store/media/search functions as the
// editor and the external-agent (MCP) surface, so all three stay in sync.
import { randomUUID } from 'node:crypto';
import { readdir, stat } from 'node:fs/promises';
import { createWriteStream } from 'node:fs';
import { mkdir, rename, unlink } from 'node:fs/promises';
import { join } from 'node:path';
import { Readable, Transform } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import type { IncomingMessage, ServerResponse } from 'node:http';
import type { Plugin } from 'vite';
import { getKey } from '../keystore.ts';
import { computeCaps } from '../keystore.ts';
import {
  apiGatewayAuthorized,
  apiGatewayEnabled,
  apiGatewayKey,
  parseRateLimit,
  presentedApiKey,
  rateLimitConsume,
} from '../api-gateway-auth.ts';
import {
  isSafeUploadName,
  mimeFor,
  resolveUploadFile,
  serveDiskFile,
  uploadDir,
  uploadReadDirs,
} from '../media-dir.ts';
import { searchContent } from '../storage/fulltext-search.ts';
import { hybridSearch } from '../storage/hybrid-search.ts';
import {
  deleteStoredEntry,
  getStoredEntry,
  setStoredEntry,
} from './project-store.ts';
import {
  createExternalProject,
  listExternalProjects,
} from '../external-agent/projects.ts';
import { MCP_CONTROL_TOOLS } from '../external-agent/mcp-controls.ts';
import { offlineExternalToolSchemas } from '../external-agent/offline-tools.ts';
import { externalMcpToken } from '../editor-auth.ts';

const API_VERSION = 'v1';
const APP_VERSION = '0.4.2';
const MAX_UPLOAD_BYTES = 10 * 1024 * 1024 * 1024;
const MAX_BODY_BYTES = 64 * 1024 * 1024;
const MEDIA_LIST_LIMIT = 500;

const MIME_EXTENSION: Record<string, string> = {
  'video/mp4': '.mp4', 'video/quicktime': '.mov', 'video/webm': '.webm',
  'image/jpeg': '.jpg', 'image/png': '.png', 'image/gif': '.gif',
  'image/webp': '.webp', 'image/avif': '.avif', 'image/heic': '.heic', 'image/heif': '.heif',
  'audio/mpeg': '.mp3', 'audio/wav': '.wav', 'audio/mp4': '.m4a', 'audio/aac': '.aac',
  'audio/ogg': '.ogg', 'audio/opus': '.opus', 'audio/flac': '.flac',
};

function corsOrigin(): string {
  return (process.env.LAZYNEXT_API_CORS_ORIGIN?.trim() || getKey('LAZYNEXT_API_CORS_ORIGIN')).trim() || '*';
}

function applyCorsHeaders(res: ServerResponse): void {
  res.setHeader('Access-Control-Allow-Origin', corsOrigin());
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type, x-lazynext-api-key');
  res.setHeader('Access-Control-Max-Age', '600');
}

function sendJson(res: ServerResponse, status: number, body: unknown): void {
  applyCorsHeaders(res);
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(body));
}

function sendError(res: ServerResponse, status: number, message: string, code?: string): void {
  sendJson(res, status, code ? { error: message, code } : { error: message });
}

function routePath(req: IncomingMessage): string {
  // Inside the /api/v1 mount, req.url is the stripped path (with query).
  const url = req.url ?? '/';
  const q = url.indexOf('?');
  return q >= 0 ? url.slice(0, q) : url;
}

function query(req: IncomingMessage): URLSearchParams {
  const url = req.url ?? '/';
  const q = url.indexOf('?');
  return new URLSearchParams(q >= 0 ? url.slice(q + 1) : '');
}

async function readJsonBody(req: IncomingMessage): Promise<Record<string, unknown>> {
  const chunks: Buffer[] = [];
  let total = 0;
  for await (const chunk of req) {
    const buf = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk as Buffer);
    total += buf.length;
    if (total > MAX_BODY_BYTES) throw new Error('request body too large');
    chunks.push(buf);
  }
  const text = Buffer.concat(chunks).toString('utf8') || '{}';
  const parsed: unknown = JSON.parse(text);
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('body must be a JSON object');
  }
  return parsed as Record<string, unknown>;
}

function projectIdFromPath(path: string): string | null {
  const m = /^\/projects\/([^/]+)$/.exec(path);
  const id = m?.[1];
  return id && /^[a-zA-Z0-9_-]{1,160}$/.test(id) ? id : null;
}

function mediaNameFromPath(path: string): string | null {
  const m = /^\/media\/(.+)$/.exec(path);
  const name = m?.[1];
  return name && isSafeUploadName(name) ? name : null;
}

// ── OpenAPI spec ────────────────────────────────────────────────────────────

function openApiSpec(origin: string): unknown {
  const base = `${origin}/api/${API_VERSION}`;
  const paths: Record<string, unknown> = {};
  const json = (_method: string, op: unknown) => { (paths[op as string] ??= {}); /* placeholder */ };
  void json;
  const spec: Record<string, unknown> = {
    openapi: '3.1.0',
    info: {
      title: 'Lazynext API Gateway',
      version: APP_VERSION,
      description: 'Central REST API for Lazynext — projects, media, search, and agent discovery. Authenticate every request with `Authorization: Bearer <LAZYNEXT_API_KEY>` or `x-lazynext-api-key: <key>`. Programmatic agent editing uses the MCP endpoint at `/api/external-mcp/mcp`.',
    },
    servers: [{ url: base }],
    components: {
      securitySchemes: {
        apiKey: {
          type: 'http',
          scheme: 'bearer',
          description: 'Bearer token = LAZYNEXT_API_KEY. Also accepted via the x-lazynext-api-key header.',
        },
      },
    },
    security: [{ apiKey: [] }],
    paths,
  };
  // Build paths explicitly so the spec is accurate and useful.
  const P = (p: string) => { (spec.paths as Record<string, Record<string, unknown>>)[p] ??= {}; return (spec.paths as Record<string, Record<string, unknown>>)[p]; };
  const GET = (p: string, op: { summary: string; description?: string; params?: unknown[] }) => { P(p).get = { summary: op.summary, description: op.description, parameters: op.params ?? [], responses: { '200': { description: 'OK' } } }; };
  const POST = (p: string, op: { summary: string; description?: string }) => { P(p).post = { summary: op.summary, description: op.description, requestBody: { content: { 'application/json': { schema: { type: 'object' } } } }, responses: { '200': { description: 'OK' } } }; };
  const DEL = (p: string, op: { summary: string; description?: string; params?: unknown[] }) => { P(p).delete = { summary: op.summary, description: op.description, parameters: op.params ?? [], responses: { '200': { description: 'OK' } } }; };

  GET('/health', { summary: 'Health check (public, no auth)' });
  GET('/status', { summary: 'Server status and capabilities' });
  GET('/openapi.json', { summary: 'OpenAPI document (public)' });
  GET('/docs', { summary: 'Interactive API docs (public)' });
  GET('/projects', { summary: 'List projects', params: [{ name: 'includeDeleted', in: 'query', schema: { type: 'boolean' } }] });
  POST('/projects', { summary: 'Create a project', description: 'Body: { name?, description?, fps?, compositionWidth?, compositionHeight? }' });
  GET('/projects/{id}', { summary: 'Get a project document', params: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }] });
  DEL('/projects/{id}', { summary: 'Delete a project', description: '?purge=true also removes the stored document.', params: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }, { name: 'purge', in: 'query', schema: { type: 'boolean' } }] });
  GET('/projects/{id}/media', { summary: 'List media available to a project', params: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }] });
  GET('/media', { summary: 'List all uploaded media' });
  POST('/media', { summary: 'Upload media', description: 'Raw body with Content-Type set to the media MIME and ?name=<filename>. Returns the stored media record.' });
  GET('/media/{name}', { summary: 'Download a media file', params: [{ name: 'name', in: 'path', required: true, schema: { type: 'string' } }] });
  GET('/search', { summary: 'Full-text search', params: [{ name: 'q', in: 'query', required: true, schema: { type: 'string' } }, { name: 'project', in: 'query', schema: { type: 'string' } }, { name: 'limit', in: 'query', schema: { type: 'integer' } }] });
  POST('/search/hybrid', { summary: 'Hybrid (text + vector) search', description: 'Body: { query, queryVector?, projectId?, limit? }' });
  GET('/agent/tools', { summary: 'List MCP agent tools' });
  GET('/agent/mcp', { summary: 'MCP endpoint discovery' });
  return spec;
}

function docsHtml(origin: string): string {
  const specUrl = `${origin}/api/${API_VERSION}/openapi.json`;
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Lazynext API Gateway</title>
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui.css">
<style>html,body{margin:0;height:100%}body{background:#0b0b0c}</style>
</head><body>
<div id="swagger"></div>
<script src="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui-bundle.js" crossorigin></script>
<script>
window.onload=()=>SwaggerUIBundle({url:${JSON.stringify(specUrl)},dom_id:'#swagger',deepLinking:true,theme:'dark'});
</script></body></html>`;
}

// ── Handlers ────────────────────────────────────────────────────────────────

async function handleStatus(res: ServerResponse, origin: string): Promise<void> {
  sendJson(res, 200, {
    app: 'lazynext',
    version: APP_VERSION,
    apiVersion: API_VERSION,
    gateway: true,
    capabilities: computeCaps(),
    mcpEndpoint: `${origin}/api/external-mcp/mcp`,
    mcpTokenConfigured: externalMcpToken().length > 0,
  });
}

async function handleProjectsList(res: ServerResponse, includeDeleted: boolean): Promise<void> {
  const projects = await listExternalProjects(includeDeleted);
  sendJson(res, 200, { projects, total: projects.length });
}

async function handleProjectCreate(req: IncomingMessage, res: ServerResponse): Promise<void> {
  const body = await readJsonBody(req);
  const meta = await createExternalProject(body);
  sendJson(res, 201, meta);
}

async function handleProjectGet(res: ServerResponse, id: string): Promise<void> {
  const doc = await getStoredEntry(`project:${id}`);
  if (!doc || (doc as { entries?: unknown }).entries === undefined && doc === null) {
    const exists = (await listExternalProjects(true)).some((p) => p.id === id);
    if (!exists) { sendError(res, 404, 'project not found'); return; }
  }
  sendJson(res, 200, doc);
}

async function handleProjectDelete(res: ServerResponse, id: string, purge: boolean): Promise<void> {
  const projects = await listExternalProjects(true);
  const meta = projects.find((p) => p.id === id);
  if (!meta) { sendError(res, 404, 'project not found'); return; }
  const updated = projects.map((p) => p.id === id ? { ...p, deletedAt: Date.now() } : p);
  await setStoredEntry('projects', updated);
  if (purge) await deleteStoredEntry(`project:${id}`);
  sendJson(res, 200, { ok: true, id, deleted: true, purged: purge });
}

async function handleMediaList(res: ServerResponse): Promise<void> {
  const seen = new Set<string>();
  const files: { name: string; bytes: number; mime: string }[] = [];
  for (const dir of uploadReadDirs()) {
    let entries: string[];
    try { entries = await readdir(dir); } catch { continue; }
    for (const name of entries) {
      if (!isSafeUploadName(name) || seen.has(name)) continue;
      seen.add(name);
      try {
        const info = await stat(join(dir, name));
        if (!info.isFile()) continue;
        files.push({ name, bytes: info.size, mime: mimeFor(name) });
      } catch { /* best-effort */ }
      if (files.length >= MEDIA_LIST_LIMIT) break;
    }
    if (files.length >= MEDIA_LIST_LIMIT) break;
  }
  sendJson(res, 200, { media: files, total: files.length });
}

async function handleMediaUpload(req: IncomingMessage, res: ServerResponse): Promise<void> {
  const name = (query(req).get('name') ?? '').replace(/^.*[\\/]/, '').slice(0, 180);
  if (!isSafeUploadName(name)) { sendError(res, 400, 'missing or unsafe name'); return; }
  const mime = (req.headers['content-type'] ?? '').split(';')[0]!.trim().toLowerCase();
  const ext = MIME_EXTENSION[mime] ?? (name.includes('.') ? name.slice(name.lastIndexOf('.')) : '');
  if (!ext) { sendError(res, 415, 'unsupported media type'); return; }
  const storedName = `${randomUUID()}${ext}`;
  const dir = uploadDir();
  await mkdir(dir, { recursive: true });
  const partPath = join(dir, `.${storedName}.part`);
  const finalPath = join(dir, storedName);
  let bytes = 0;
  const limiter = new Transform({
    transform(chunk: Buffer, _e, cb) { bytes += chunk.length; cb(bytes > MAX_UPLOAD_BYTES ? new Error('file too large') : null, chunk); },
  });
  try {
    await pipeline(req as Readable, limiter, createWriteStream(partPath));
    if (bytes === 0) { await unlink(partPath).catch(() => undefined); sendError(res, 400, 'empty body'); return; }
    await rename(partPath, finalPath);
  } catch (error) {
    await unlink(partPath).catch(() => undefined);
    sendError(res, 413, error instanceof Error ? error.message : 'upload failed');
    return;
  }
  sendJson(res, 201, {
    id: randomUUID(), name, storedName, mime, bytes,
    path: `/media/uploads/${storedName}`,
    url: `/api/${API_VERSION}/media/${storedName}`,
  });
}

async function handleMediaServe(req: IncomingMessage, res: ServerResponse, name: string): Promise<void> {
  const file = resolveUploadFile(name);
  if (!file) { sendError(res, 404, 'media not found'); return; }
  await serveDiskFile(req, res, file);
}

async function handleSearch(res: ServerResponse, q: URLSearchParams): Promise<void> {
  const query = q.get('q')?.trim() ?? '';
  if (!query) { sendError(res, 400, 'q is required'); return; }
  const limit = Number(q.get('limit') ?? 20);
  const project = q.get('project')?.trim() || undefined;
  sendJson(res, 200, { hits: searchContent(query, { projectId: project, limit }) });
}

async function handleHybridSearch(req: IncomingMessage, res: ServerResponse): Promise<void> {
  const body = await readJsonBody(req);
  const q = typeof body.query === 'string' ? body.query.trim() : '';
  if (!q) { sendError(res, 400, 'query is required'); return; }
  const queryVector = Array.isArray(body.queryVector)
    ? (body.queryVector as unknown[]).filter((v): v is number => typeof v === 'number')
    : undefined;
  const projectId = typeof body.projectId === 'string' ? body.projectId : undefined;
  const limit = typeof body.limit === 'number' ? body.limit : 20;
  sendJson(res, 200, { hits: hybridSearch(q, queryVector, { projectId, limit }) });
}

function handleAgentTools(res: ServerResponse): void {
  const control = MCP_CONTROL_TOOLS.map((t) => ({ name: t.name, description: t.description, schema: t.inputSchema }));
  const offline = offlineExternalToolSchemas().map((t) => ({ name: t.name, description: t.description, schema: t.input_schema }));
  sendJson(res, 200, { control, offline });
}

function handleAgentMcp(res: ServerResponse, origin: string): void {
  sendJson(res, 200, {
    protocol: 'mcp',
    transport: 'streamable-http',
    url: `${origin}/api/external-mcp/mcp`,
    auth: 'Authorization: Bearer <LAZYNEXT_MCP_TOKEN>',
    tokenConfigured: externalMcpToken().length > 0,
    note: 'Copy the MCP token from Settings → External agents (MCP) in the editor.',
  });
}

// ── Plugin ──────────────────────────────────────────────────────────────────

function requestOrigin(req: IncomingMessage): string {
  const host = typeof req.headers.host === 'string' ? req.headers.host : 'localhost:5199';
  const proto = (req.socket as { encrypted?: boolean }).encrypted ? 'https:' : 'http:';
  return `${proto}//${host}`;
}

export function apiGatewayPlugin(): Plugin {
  return {
    name: 'lazynext-api-gateway',
    configureServer(server) {
      server.middlewares.use(`/api/${API_VERSION}`, (req: IncomingMessage, res: ServerResponse) => {
        void (async () => {
          const origin = requestOrigin(req);
          const path = routePath(req);
          const method = (req.method ?? 'GET').toUpperCase();

          // CORS preflight
          if (method === 'OPTIONS') {
            applyCorsHeaders(res);
            res.statusCode = 204;
            res.end();
            return;
          }

          // Public routes
          if (path === '/health') { sendJson(res, 200, { status: 'ok', app: 'lazynext', version: APP_VERSION, apiVersion: API_VERSION }); return; }
          if (path === '/openapi.json') { sendJson(res, 200, openApiSpec(origin)); return; }
          if (path === '/docs') {
            applyCorsHeaders(res);
            res.statusCode = 200;
            res.setHeader('Content-Type', 'text/html; charset=utf-8');
            res.end(docsHtml(origin));
            return;
          }

          // Gateway disabled?
          if (!apiGatewayEnabled()) {
            sendError(res, 404, 'api gateway disabled — set LAZYNEXT_API_KEY to enable', 'gateway_disabled');
            return;
          }

          // Authenticate
          if (!apiGatewayAuthorized(req)) {
            sendError(res, 401, 'invalid or missing api key', 'unauthorized');
            return;
          }

          // Rate limit
          const config = parseRateLimit(process.env.LAZYNEXT_API_RATE_LIMIT || getKey('LAZYNEXT_API_RATE_LIMIT'));
          if (!rateLimitConsume(presentedApiKey(req) ?? 'anon', config)) {
            res.setHeader('Retry-After', String(Math.ceil(1 / config.refillPerSecond) || 1));
            sendError(res, 429, 'rate limit exceeded', 'rate_limited');
            return;
          }

          try {
            // Status
            if (path === '/status' && method === 'GET') { await handleStatus(res, origin); return; }

            // Projects
            if (path === '/projects' && method === 'GET') { await handleProjectsList(res, query(req).get('includeDeleted') === 'true'); return; }
            if (path === '/projects' && method === 'POST') { await handleProjectCreate(req, res); return; }
            const projectId = projectIdFromPath(path);
            if (projectId && method === 'GET' && path === `/projects/${projectId}`) { await handleProjectGet(res, projectId); return; }
            if (projectId && method === 'DELETE' && path === `/projects/${projectId}`) { await handleProjectDelete(res, projectId, query(req).get('purge') === 'true'); return; }
            if (projectId && method === 'GET' && path === `/projects/${projectId}/media`) { await handleMediaList(res); return; }

            // Media
            if (path === '/media' && method === 'GET') { await handleMediaList(res); return; }
            if (path === '/media' && method === 'POST') { await handleMediaUpload(req, res); return; }
            const mediaName = mediaNameFromPath(path);
            if (mediaName && method === 'GET') { await handleMediaServe(req, res, mediaName); return; }

            // Search
            if (path === '/search' && method === 'GET') { await handleSearch(res, query(req)); return; }
            if (path === '/search/hybrid' && method === 'POST') { await handleHybridSearch(req, res); return; }

            // Agent
            if (path === '/agent/tools' && method === 'GET') { handleAgentTools(res); return; }
            if (path === '/agent/mcp' && method === 'GET') { handleAgentMcp(res, origin); return; }

            sendError(res, 404, `no route for ${method} ${path}`, 'not_found');
          } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            server.config.logger.error(`[api-gateway] ${message}`);
            if (!res.headersSent) sendError(res, 400, message);
          }
        })();
      });
    },
  };
}

export { apiGatewayKey, API_VERSION };
