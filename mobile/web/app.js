// Lazynext mobile companion app.
// Uses Capacitor plugins when running natively (Camera, Preferences) and web
// fallbacks when running in a browser, so the same page is testable on desktop.
import { getConfig, setConfig, status, listProjects, createProject, deleteProject, listMedia, uploadMediaBlob, agentTools, agentMcp, editorUrl } from './api.js';
import { initAnalytics, trackScreen, trackAction, trackError } from './analytics.js';

const $ = (id) => document.getElementById(id);
const Capacitor = window.Capacitor;
const Camera = Capacitor?.Plugins?.Camera;

let config = { url: '', key: '' };

// ── Tabs ────────────────────────────────────────────────────────────────────
document.querySelectorAll('.tab').forEach((tab) => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach((t) => t.classList.remove('active'));
    document.querySelectorAll('.tab-panel').forEach((p) => p.classList.remove('active'));
    tab.classList.add('active');
    $(`tab-${tab.dataset.tab}`).classList.add('active');
    trackScreen(tab.dataset.tab);
    if (tab.dataset.tab === 'projects') loadProjects();
    if (tab.dataset.tab === 'media') loadMedia();
    if (tab.dataset.tab === 'agent') loadAgent();
  });
});

// ── Status ──────────────────────────────────────────────────────────────────
function setStatus(state, text) {
  $('status-dot').className = `dot dot-${state}`;
  $('status-dot').title = text;
}

async function checkStatus() {
  try {
    const s = await status(config);
    setStatus('ok', `v${s.version}`);
    return s;
  } catch (e) {
    setStatus('bad', e.message);
    return null;
  }
}

// ── Projects ────────────────────────────────────────────────────────────────
async function loadProjects() {
  const list = $('projects');
  list.innerHTML = '<li class="empty">Loading…</li>';
  try {
    const r = await listProjects(config);
    if (!r.projects.length) { list.innerHTML = '<li class="empty">No projects yet.</li>'; return; }
    list.innerHTML = '';
    for (const p of r.projects) {
      const li = document.createElement('li');
      li.innerHTML = `<span class="name">${escapeHtml(p.name || '(unnamed)')}</span><span class="meta">${relTime(p.updatedAt)}</span>`;
      const del = document.createElement('button');
      del.className = 'del'; del.textContent = '✕'; del.title = 'Delete';
      del.addEventListener('click', async (e) => {
        e.stopPropagation();
        if (!confirm(`Delete "${p.name || p.id.slice(0, 8)}"?`)) return;
        try { await deleteProject(config, p.id, true); loadProjects(); } catch (err) { alert(err.message); }
      });
      li.append(del);
      li.addEventListener('click', () => openEditor(p.id));
      list.append(li);
    }
  } catch (e) {
    list.innerHTML = `<li class="empty">Failed: ${escapeHtml(e.message)}</li>`;
  }
}

$('new-project').addEventListener('click', async () => {
  const name = prompt('Project name?');
  if (name === null) return;
  try { await createProject(config, { name }); trackAction('project_create'); loadProjects(); } catch (e) { trackError(e.message); alert(e.message); }
});
$('refresh-projects').addEventListener('click', loadProjects);

function openEditor(id) {
  const url = editorUrl(config, id);
  if (Capacitor?.Plugins?.Browser) {
    Capacitor.Plugins.Browser.open({ url });
  } else {
    window.open(url, '_blank');
  }
}

// ── Media ───────────────────────────────────────────────────────────────────
async function loadMedia() {
  const list = $('media');
  list.innerHTML = '<li class="empty">Loading…</li>';
  try {
    const r = await listMedia(config);
    if (!r.media.length) { list.innerHTML = '<li class="empty">No media yet.</li>'; return; }
    list.innerHTML = '';
    for (const m of r.media) {
      const li = document.createElement('li');
      li.innerHTML = `<span class="name">${escapeHtml(m.name)}</span><span class="meta">${m.mime} · ${formatBytes(m.bytes)}</span>`;
      list.append(li);
    }
  } catch (e) {
    list.innerHTML = `<li class="empty">Failed: ${escapeHtml(e.message)}</li>`;
  }
}
$('refresh-media').addEventListener('click', loadMedia);

async function uploadBlob(blob, filename) {
  try {
    const rec = await uploadMediaBlob(config, blob, filename);
    trackAction('media_upload', { type: blob.type, bytes: blob.size });
    alert(`Uploaded ${filename} (${formatBytes(blob.size)})`);
    loadMedia();
    return rec;
  } catch (e) {
    trackError(e.message);
    alert(`Upload failed: ${e.message}`);
  }
}

$('capture-photo').addEventListener('click', async () => {
  if (Camera) {
    try {
      const photo = await Camera.getPhoto({ quality: 90, allowEditing: false, resultType: 'Base64', source: 'CAMERA' });
      const base64 = await fetch(`data:image/${photo.format};base64,${photo.base64String}`);
      const blob = await base64.blob();
      await uploadBlob(blob, `capture-${Date.now()}.${photo.format || 'jpg'}`);
    } catch (e) { if (e.message !== 'User denied access') alert(e.message); }
  } else {
    $('file-input').click();
  }
});

$('pick-file').addEventListener('click', () => $('file-input').click());
$('file-input').addEventListener('change', async (e) => {
  const file = e.target.files?.[0];
  if (file) await uploadBlob(file, file.name);
  e.target.value = '';
});

// ── Agent ───────────────────────────────────────────────────────────────────
async function loadAgent() {
  try {
    const mcp = await agentMcp(config);
    $('agent-mcp').innerHTML = `
      <div><span class="k">Protocol:</span> <span class="v">${escapeHtml(mcp.protocol)}</span></div>
      <div><span class="k">URL:</span> <span class="v">${escapeHtml(mcp.url)}</span></div>
      <div><span class="k">Auth:</span> <span class="v">${escapeHtml(mcp.auth)}</span></div>
      <div><span class="k">Token:</span> <span class="v">${mcp.tokenConfigured ? 'configured' : 'unset'}</span></div>`;
    const r = await agentTools(config);
    const list = $('agent-tools');
    list.innerHTML = '';
    for (const t of [...r.control, ...r.offline]) {
      const li = document.createElement('li');
      li.innerHTML = `<span class="name">${escapeHtml(t.name)}</span><span class="meta">${escapeHtml((t.description || '').slice(0, 60))}</span>`;
      list.append(li);
    }
  } catch (e) {
    $('agent-mcp').innerHTML = `<div class="v">Failed: ${escapeHtml(e.message)}</div>`;
  }
}

// ── Settings ────────────────────────────────────────────────────────────────
async function loadSettings() {
  $('set-url').value = config.url;
  $('set-key').value = config.key;
}
$('save-settings').addEventListener('click', async () => {
  await setConfig({ url: $('set-url').value.trim(), key: $('set-key').value.trim() });
  config = await getConfig();
  showMsg('Saved', 'ok');
  await checkStatus();
});
$('test-connection').addEventListener('click', async () => {
  showMsg('Testing…', '');
  const s = await checkStatus();
  if (s) showMsg(`Connected · v${s.version}`, 'ok'); else showMsg('Connection failed', 'bad');
});
function showMsg(text, cls) {
  const m = $('settings-msg');
  m.textContent = text; m.className = `msg ${cls || ''}`;
}

// ── Helpers ─────────────────────────────────────────────────────────────────
function escapeHtml(s) { return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
function formatBytes(n) { if (n < 1024) return `${n} B`; if (n < 1048576) return `${(n / 1024).toFixed(1)} KB`; return `${(n / 1048576).toFixed(1)} MB`; }
function relTime(ms) { const d = Date.now() - ms; if (d < 3600000) return `${Math.round(d / 60000)}m`; if (d < 86400000) return `${Math.round(d / 3600000)}h`; return `${Math.round(d / 86400000)}d`; }

// ── Init ────────────────────────────────────────────────────────────────────
(async () => {
  config = await getConfig();
  // Opt-in analytics: initialize if a PostHog key is set in the server env
  try {
    const s = await status(config);
    if (s && s.analyticsKey) initAnalytics(s.analyticsKey);
  } catch { /* analytics is best-effort */ }
  await loadSettings();
  await checkStatus();
  await loadProjects();
})();
