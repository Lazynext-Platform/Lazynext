// Content Script — injected on all URLs to support video detection
// and timeline injection from the Lazynext browser extension.
//
// Kept intentionally thin: most work is done via chrome.scripting.executeScript
// from the popup (which can access the full DOM synchronously). This script
// provides the fallback message listener for future features like:
//   - Right-click "send frame to timeline"
//   - Keyboard shortcut video capture
//   - Page action injection overlays

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === "EXTRACT_VIDEO") {
    const videoElements = document.querySelectorAll("video");
    const videoData = Array.from(videoElements).map((v, i) => ({
      id: `video-${i}`,
      src: v.src || v.querySelector("source")?.src || null,
      currentTime: v.currentTime,
      duration: v.duration,
      width: v.videoWidth,
      height: v.videoHeight,
    }));
    sendResponse({
      videosFound: videoElements.length,
      videos: videoData,
    });
  }
  return true; // Keep channel open for async response
});
