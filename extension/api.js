// Shared Lazynext API Gateway client for the browser extension.
// Config (url + key) is stored in chrome.storage.sync and edited on the options page.

const DEFAULT_URL = 'http://localhost:5199';

export async function getConfig() {
  const stored = await chrome.storage.sync.get({ lazynextUrl: '', lazynextKey: '' });
  return {
    url: (stored.lazynextUrl || DEFAULT_URL).replace(/\/+$/, ''),
    key: stored.lazynextKey || '',
  };
}

export async function setConfig({ url, key }) {
  const patch = {};
  if (typeof url === 'string') patch.lazynextUrl = url.replace(/\/+$/, '');
  if (typeof key === 'string') patch.lazynextKey = key;
  await chrome.storage.sync.set(patch);
}

async function gateway(config, path, opts = {}) {
  const url = new URL(`/api/v1${path}`, config.url);
  if (opts.query) {
    for (const [k, v] of Object.entries(opts.query)) {
      if (v !== undefined && v !== false) url.searchParams.set(k, String(v));
    }
  }
  const headers = { Accept: 'application/json', ...(opts.headers || {}) };
  if (config.key) headers['Authorization'] = `Bearer ${config.key}`;
  if (opts.body !== undefined) headers['Content-Type'] = 'application/json';
  const res = await fetch(url, {
    method: opts.method || 'GET',
    headers,
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
  });
  const text = await res.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }
  if (!res.ok) {
    const message = (data && data.error) || `HTTP ${res.status}`;
    const err = new Error(message);
    err.status = res.status;
    err.code = data && data.code;
    err.data = data;
    throw err;
  }
  return data;
}

export async function status(config) {
  return gateway(config, '/status');
}

export async function listProjects(config, includeDeleted = false) {
  return gateway(config, '/projects', { query: { includeDeleted } });
}

export async function createProject(config, body) {
  return gateway(config, '/projects', { method: 'POST', body });
}

export async function deleteProject(config, id, purge = false) {
  return gateway(config, `/projects/${encodeURIComponent(id)}`, { method: 'DELETE', query: { purge } });
}

export async function listMedia(config) {
  return gateway(config, '/media');
}

/** Upload a Blob/File to the media library. */
export async function uploadMediaBlob(config, blob, filename) {
  const url = new URL('/api/v1/media', config.url);
  url.searchParams.set('name', filename);
  const headers = { 'Content-Type': blob.type || 'application/octet-stream' };
  if (config.key) headers['Authorization'] = `Bearer ${config.key}`;
  const res = await fetch(url, { method: 'POST', headers, body: blob });
  const text = await res.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }
  if (!res.ok) throw new Error((data && data.error) || `HTTP ${res.status}`);
  return data;
}

export async function agentTools(config) {
  return gateway(config, '/agent/tools');
}

export function editorUrl(config, projectId) {
  return projectId ? `${config.url}/#/editor/${encodeURIComponent(projectId)}` : `${config.url}/`;
}
