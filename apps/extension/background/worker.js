// Lazynext Browser Extension — Background Service Worker

const API_BASE = 'http://localhost:3000';

// Handle keyboard shortcuts
chrome.commands.onCommand.addListener((command) => {
  switch (command) {
    case 'start-recording':
      chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
        if (tab?.id) chrome.tabs.sendMessage(tab.id, { type: 'START_RECORDING' });
      });
      break;
    case 'ai-prompt':
      chrome.action.openPopup();
      break;
  }
});

// Handle messages from popup and content scripts
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  switch (message.type) {
    case 'RECORDING_STARTED':
      chrome.notifications.create({
        type: 'basic',
        iconUrl: '/icons/icon128.png',
        title: 'Recording Started',
        message: 'Lazynext is recording your screen.',
      });
      break;
    case 'VIDEO_DETECTED':
      chrome.action.setBadgeText({ text: '🎬' });
      chrome.action.setBadgeBackgroundColor({ color: '#7c3aed' });
      break;
    case 'EXPORT_COMPLETE':
      chrome.notifications.create({
        type: 'basic',
        iconUrl: '/icons/icon128.png',
        title: 'Export Complete',
        message: message.filename ?? 'Your video is ready.',
      });
      chrome.downloads.download({ url: message.url, filename: message.filename });
      break;
  }
  sendResponse({ ok: true });
});

// Check server health periodically
setInterval(async () => {
  try {
    const res = await fetch(`${API_BASE}/api/health`);
    const status = res.ok ? 'connected' : 'disconnected';
    chrome.storage.local.set({ serverStatus: status });
  } catch {
    chrome.storage.local.set({ serverStatus: 'disconnected' });
  }
}, 30000);
