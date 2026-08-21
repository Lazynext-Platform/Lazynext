// Lazynext extension popup. Talks to the background service worker via messages.
const $ = (id) => document.getElementById(id);

function send(type, extra = {}) {
  return new Promise((resolve) => chrome.runtime.sendMessage({ type, ...extra }, resolve));
}

function setStatus(state, text) {
  const dot = $('status-dot');
  const line = $('status-line');
  dot.className = `dot dot-${state}`;
  line.className = `status-line ${state === 'ok' ? 'ok' : state === 'bad' ? 'bad' : ''}`;
  line.textContent = text;
}

async function refresh() {
  $('refresh').classList.add('spin');
  try {
    const r = await send('status');
    if (!r || !r.ok) throw new Error(r?.error || 'unreachable');
    const s = r.data;
    const caps = Object.entries(s.capabilities || {}).filter(([, v]) => v).map(([k]) => k);
    setStatus('ok', `Connected · v${s.version}${caps.length ? ' · ' + caps.join(', ') : ''}`);
    await loadProjects();
  } catch (error) {
    setStatus('bad', `Offline — ${error.message}`);
    $('projects').innerHTML = '<li class="empty">No connection. Check Settings.</li>';
    $('project-count').textContent = '';
  } finally {
    $('refresh').classList.remove('spin');
  }
}

async function loadProjects() {
  const r = await send('projects:list');
  const list = $('projects');
  if (!r || !r.ok) { list.innerHTML = '<li class="empty">Could not load projects.</li>'; return; }
  const projects = r.data.projects || [];
  $('project-count').textContent = `(${projects.length})`;
  if (projects.length === 0) { list.innerHTML = '<li class="empty">No projects yet.</li>'; return; }
  list.innerHTML = '';
  for (const p of projects) {
    const li = document.createElement('li');
    const name = document.createElement('span');
    name.className = 'name';
    name.textContent = p.name || '(unnamed)';
    const del = document.createElement('button');
    del.className = 'del';
    del.textContent = '✕';
    del.title = 'Delete project';
    del.addEventListener('click', async (e) => {
      e.stopPropagation();
      if (!confirm(`Delete project "${p.name || p.id.slice(0, 8)}"?`)) return;
      const rr = await send('projects:delete', { id: p.id, purge: true });
      if (rr?.ok) loadProjects();
      else alert(rr?.error || 'Delete failed');
    });
    li.append(name, del);
    li.addEventListener('click', () => openProject(p.id));
    list.append(li);
  }
}

async function openProject(id) {
  const cfg = await send('config:get');
  const url = id ? `${cfg.data.url}/#/editor/${id}` : `${cfg.data.url}/`;
  chrome.tabs.create({ url });
  window.close();
}

$('refresh').addEventListener('click', refresh);
$('new-project').addEventListener('click', async () => {
  const name = prompt('Project name?');
  if (name === null) return;
  const r = await send('projects:create', { body: { name } });
  if (r?.ok) { await loadProjects(); }
  else alert(r?.error || 'Create failed');
});
$('open-editor').addEventListener('click', () => openProject(null));
$('options-link').addEventListener('click', (e) => {
  e.preventDefault();
  chrome.runtime.openOptionsPage();
});
$('version').textContent = `v${chrome.runtime.getManifest().version}`;

refresh();
