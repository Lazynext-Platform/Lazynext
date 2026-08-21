// Lazynext mobile companion — shared API Gateway client.
// Uses Capacitor Preferences when running natively, localStorage in a browser.
const DEFAULT_URL = 'http://localhost:5199';

const Pref = window.Capacitor?.Plugins?.Preferences;

export async function getConfig() {
  let url = DEFAULT_URL, key = '';
  if (Pref) {
    try {
      const u = await Pref.get({ key: 'lazynextUrl' }); if (u.value) url = u.value;
      const k = await Pref.get({ key: 'lazynextKey' }); if (k.value) key = k.value;
    } catch { /* fall back below */ }
  }
  if (!Pref || !url) { url = localStorage.getItem('lazynextUrl') || url; }
  if (!Pref || !key) { key = localStorage.getItem('lazynextKey') || key; }
  return { url: url.replace(/\/+$/, ''), key };
}

export async function setConfig({ url, key }) {
  if (Pref) {
    if (typeof url === 'string') await Pref.set({ key: 'lazynextUrl', value: url.replace(/\/+$/, '') });
    if (typeof key === 'string') await Pref.set({ key: 'lazynextKey', value: key });
  } else {
    if (typeof url === 'string') localStorage.setItem('lazynextUrl', url.replace(/\/+$/, ''));
    if (typeof key === 'string') localStorage.setItem('lazynextKey', key);
  }
}

async function gateway(config, path, opts = {}) {
  const url = new URL(`/api/v1${path}`, config.url);
  if (opts.query) for (const [k, v] of Object.entries(opts.query)) if (v !== undefined && v !== false) url.searchParams.set(k, String(v));
  const headers = { Accept: 'application/json', ...(opts.headers || {}) };
  if (config.key) headers['Authorization'] = `Bearer ${config.key}`;
  if (opts.body !== undefined) headers['Content-Type'] = 'application/json';
  const res = await fetch(url, { method: opts.method || 'GET', headers, body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined });
  const text = await res.text();
  let data = null; try { data = text ? JSON.parse(text) : null; } catch { data = text; }
  if (!res.ok) { const e = new Error((data && data.error) || `HTTP ${res.status}`); e.status = res.status; throw e; }
  return data;
}

export const status = (c) => gateway(c, '/status');
export const listProjects = (c, includeDeleted = false) => gateway(c, '/projects', { query: { includeDeleted } });
export const createProject = (c, body) => gateway(c, '/projects', { method: 'POST', body });
export const deleteProject = (c, id, purge = false) => gateway(c, `/projects/${encodeURIComponent(id)}`, { method: 'DELETE', query: { purge } });
export const listMedia = (c) => gateway(c, '/media');
export const agentTools = (c) => gateway(c, '/agent/tools');
export const agentMcp = (c) => gateway(c, '/agent/mcp');

export async function uploadMediaBlob(config, blob, filename) {
  const url = new URL('/api/v1/media', config.url);
  url.searchParams.set('name', filename);
  const headers = { 'Content-Type': blob.type || 'application/octet-stream' };
  if (config.key) headers['Authorization'] = `Bearer ${config.key}`;
  const res = await fetch(url, { method: 'POST', headers, body: blob });
  const text = await res.text();
  let data = null; try { data = text ? JSON.parse(text) : null; } catch { data = text; }
  if (!res.ok) throw new Error((data && data.error) || `HTTP ${res.status}`);
  return data;
}

export function editorUrl(config, projectId) {
  return projectId ? `${config.url}/#/editor/${encodeURIComponent(projectId)}` : `${config.url}/`;
}
