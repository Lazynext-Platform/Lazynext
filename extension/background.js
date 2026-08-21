// Lazynext extension background service worker.
// Registers a context menu to send media from any page to your Lazynext media
// library, and routes messages from the popup/options pages.
import { getConfig, uploadMediaBlob, listProjects, createProject, deleteProject, status, agentTools } from './api.js';

const MENU_ID = 'lazynext-send-media';
const MENU_PAGE_ID = 'lazynext-send-page';

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: MENU_ID,
    title: 'Send to Lazynext',
    contexts: ['image', 'video', 'audio'],
  });
  chrome.contextMenus.create({
    id: MENU_PAGE_ID,
    title: 'Send page media to Lazynext',
    contexts: ['page', 'link'],
  });
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  const srcUrl = info.srcUrl || info.linkUrl || info.pageUrl;
  if (!srcUrl) return;
  if (info.menuItemId === MENU_ID && info.srcUrl) {
    await sendUrlToLazynext(info.srcUrl, tab);
  } else if (info.menuItemId === MENU_PAGE_ID) {
    await sendPageMedia(tab);
  }
});

async function sendUrlToLazynext(url, _tab) {
  const config = await getConfig();
  if (!config.key) {
    notify('Lazynext: not configured', 'Open the extension options to set your API key.');
    return;
  }
  try {
    notify('Lazynext: downloading…', truncate(url));
    const res = await fetch(url, { mode: 'cors' });
    if (!res.ok) throw new Error(`download failed: HTTP ${res.status}`);
    const blob = await res.blob();
    const filename = filenameFromUrl(url, blob.type);
    notify('Lazynext: uploading…', filename);
    const record = await uploadMediaBlob(config, blob, filename);
    notify('Lazynext: uploaded', `${filename} (${formatBytes(blob.size)})`, true);
    return record;
  } catch (error) {
    notify('Lazynext: failed', error.message, false, true);
  }
}

async function sendPageMedia(tab) {
  if (!tab || tab.id == null) return;
  try {
    const [result] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => {
        const pick = (sel) => Array.from(document.querySelectorAll(sel))
          .map((el) => el.src || el.currentSrc || el.href)
          .filter(Boolean);
        return [...pick('img'), ...pick('video'), ...pick('audio'), ...pick('a[href]')];
      },
    });
    const urls = (result?.result || []).filter((u) => /\.(png|jpe?g|gif|webp|avif|mp4|mov|webm|mp3|wav|m4a|aac|ogg|opus|flac)(\?|$)/i.test(u));
    const unique = [...new Set(urls)].slice(0, 20);
    if (unique.length === 0) {
      notify('Lazynext: no media', 'No supported media found on this page.');
      return;
    }
    notify('Lazynext: sending', `${unique.length} item(s) from this page`);
    let ok = 0;
    for (const url of unique) {
      const r = await sendUrlToLazynext(url, tab);
      if (r) ok++;
    }
    notify('Lazynext: done', `${ok}/${unique.length} uploaded`, true);
  } catch (error) {
    notify('Lazynext: failed', error.message, false, true);
  }
}

function filenameFromUrl(url, mime) {
  try {
    const u = new URL(url);
    const base = u.pathname.split('/').pop() || 'media';
    const ext = base.includes('.') ? '' : extForMime(mime);
    return (base || 'media') + ext;
  } catch {
    return 'media' + extForMime(mime);
  }
}

const MIME_EXT = {
  'image/jpeg': '.jpg', 'image/png': '.png', 'image/gif': '.gif', 'image/webp': '.webp',
  'image/avif': '.avif', 'video/mp4': '.mp4', 'video/webm': '.webm', 'video/quicktime': '.mov',
  'audio/mpeg': '.mp3', 'audio/wav': '.wav', 'audio/mp4': '.m4a', 'audio/aac': '.aac',
  'audio/ogg': '.ogg', 'audio/opus': '.opus', 'audio/flac': '.flac',
};
function extForMime(mime) {
  const clean = (mime || '').split(';')[0].trim().toLowerCase();
  return MIME_EXT[clean] || '';
}

function truncate(s, n = 60) { return s.length <= n ? s : s.slice(0, n - 1) + '…'; }
function formatBytes(n) {
  if (n < 1024) return `${n} B`;
  if (n < 1048576) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1048576).toFixed(1)} MB`;
}

function notify(title, message, ok = false, error = false) {
  const icon = error ? 'icons/icon-128.png' : ok ? 'icons/icon-128.png' : 'icons/icon-128.png';
  chrome.notifications.create({
    type: 'basic',
    iconUrl: chrome.runtime.getURL(icon),
    title,
    message: message || '',
    priority: 2,
  });
}

// Message router for popup/options pages.
chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  (async () => {
    try {
      const config = await getConfig();
      switch (msg?.type) {
        case 'status': return sendResponse({ ok: true, data: await status(config) });
        case 'projects:list': return sendResponse({ ok: true, data: await listProjects(config, msg.includeDeleted) });
        case 'projects:create': return sendResponse({ ok: true, data: await createProject(config, msg.body || {}) });
        case 'projects:delete': return sendResponse({ ok: true, data: await deleteProject(config, msg.id, !!msg.purge) });
        case 'agent:tools': return sendResponse({ ok: true, data: await agentTools(config) });
        case 'config:get': return sendResponse({ ok: true, data: config });
        default: return sendResponse({ ok: false, error: 'unknown message type' });
      }
    } catch (error) {
      sendResponse({ ok: false, error: error.message });
    }
  })();
  return true; // async response
});
