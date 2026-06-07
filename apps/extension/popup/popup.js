// Lazynext Browser Extension — Popup Script
const API_BASE = 'http://localhost:3000';

// Tab switching
document.querySelectorAll('.tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active', 'text-violet-400', 'border-b-2', 'border-violet-500'));
    tab.classList.add('active', 'text-violet-400', 'border-b-2', 'border-violet-500');
    document.querySelectorAll('#content > div').forEach(d => d.classList.add('hidden'));
    document.getElementById(`tab-${tab.dataset.tab}`).classList.remove('hidden');
  });
});

// Start Recording
document.getElementById('btn-start-recording')?.addEventListener('click', async () => {
  try {
    const stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
    chrome.runtime.sendMessage({ type: 'RECORDING_STARTED', streamId: stream.id });
    document.getElementById('status').className = 'h-2 w-2 rounded-full bg-red-500';
    document.getElementById('btn-start-recording').textContent = '⏹ Stop Recording';
  } catch (err) {
    console.error('Recording failed:', err);
    alert('Screen recording permission denied.');
  }
});

// Send AI Prompt
document.getElementById('btn-send-prompt')?.addEventListener('click', async () => {
  const prompt = document.getElementById('ai-prompt-input').value.trim();
  const model = document.getElementById('ai-model').value;
  if (!prompt) return;

  const responseDiv = document.getElementById('ai-response');
  const responseText = document.getElementById('ai-response-text');
  responseDiv.classList.remove('hidden');
  responseText.textContent = 'Processing...';

  try {
    const res = await fetch(`${API_BASE}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, model: model === 'auto' ? undefined : model }),
    });
    const data = await res.json();
    responseText.textContent = data.response ?? data.message ?? 'Command executed.';
  } catch {
    responseText.textContent = 'Failed to connect to Lazynext server. Make sure it is running.';
  }
});

// Open Editor
document.getElementById('btn-open-editor')?.addEventListener('click', () => {
  chrome.tabs.create({ url: `${API_BASE}/projects` });
});

// Quick actions
document.querySelectorAll('.action-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const action = btn.dataset.action;
    const prompts = {
      trim: 'Trim the selected clip to remove silence',
      mute: 'Mute the audio on the selected track',
      speed: 'Speed up the selected clip by 2x',
      export: 'Export the current project in 1080p',
    };
    document.getElementById('ai-prompt-input').value = prompts[action] || '';
    document.querySelector('[data-tab="ai"]').click();
  });
});

// Check connection status
fetch(`${API_BASE}/api/health`)
  .then(r => r.ok && document.getElementById('status').className = 'h-2 w-2 rounded-full bg-emerald-500')
  .catch(() => document.getElementById('status').className = 'h-2 w-2 rounded-full bg-red-500');
