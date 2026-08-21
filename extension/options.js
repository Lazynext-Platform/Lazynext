// Lazynext extension options page.
import { getConfig, setConfig, status, agentTools } from './api.js';

const $ = (id) => document.getElementById(id);

async function init() {
  const config = await getConfig();
  $('url').value = config.url;
  $('key').value = config.key;
  void loadTools(config);
}

$('save').addEventListener('click', async () => {
  await setConfig({ url: $('url').value.trim(), key: $('key').value.trim() });
  const s = $('saved');
  s.classList.add('show');
  setTimeout(() => s.classList.remove('show'), 1500);
  void test(false);
});

$('test').addEventListener('click', () => test(true));

async function test(showResult) {
  const line = $('test-result');
  line.textContent = 'Testing…';
  line.className = 'status-line';
  try {
    const config = await getConfig();
    const s = await status(config);
    const caps = Object.entries(s.capabilities || {}).filter(([, v]) => v).map(([k]) => k);
    line.textContent = `Connected · v${s.version}${caps.length ? ' · ' + caps.join(', ') : ''}`;
    line.classList.add('ok');
    void loadTools(config);
  } catch (error) {
    line.textContent = `Failed — ${error.message}`;
    line.classList.add('bad');
    if (showResult) console.error(error);
  }
}

async function loadTools(config) {
  try {
    const r = await agentTools(config);
    const lines = [
      ...r.control.map((t) => `[control] ${t.name} — ${t.description || ''}`),
      ...r.offline.map((t) => `[offline] ${t.name} — ${t.description || ''}`),
    ];
    $('tools').textContent = lines.join('\n') || '(no tools)';
  } catch (error) {
    $('tools').textContent = `Could not load tools: ${error.message}`;
  }
}

init();
