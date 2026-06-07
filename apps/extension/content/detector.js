// Lazynext Browser Extension — Content Script (Video Detector)

// Detect video elements on the page and notify the extension
function detectVideos() {
  const videos = document.querySelectorAll('video');
  if (videos.length > 0) {
    chrome.runtime.sendMessage({ type: 'VIDEO_DETECTED', count: videos.length });
    // Add Lazynext overlay button to each video
    videos.forEach((video, index) => {
      if (video.dataset.lazynextProcessed) return;
      video.dataset.lazynextProcessed = 'true';

      const btn = document.createElement('button');
      btn.textContent = '🎬 Edit with Lazynext';
      btn.style.cssText = `
        position: absolute; top: 8px; right: 8px; z-index: 9999;
        background: #7c3aed; color: white; border: none; border-radius: 8px;
        padding: 6px 12px; font-size: 12px; font-weight: 600; cursor: pointer;
        font-family: -apple-system, sans-serif; box-shadow: 0 4px 12px rgba(124,58,237,0.4);
      `;
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const src = video.querySelector('source')?.src || video.src || window.location.href;
        chrome.runtime.sendMessage({
          type: 'OPEN_IN_LAZYNEXT',
          videoUrl: src,
          pageUrl: window.location.href,
        });
        window.open(`http://localhost:3000/editor/new?url=${encodeURIComponent(src)}`, '_blank');
      });

      // Position relative to video
      const wrapper = document.createElement('div');
      wrapper.style.position = 'relative';
      wrapper.style.display = 'inline-block';
      video.parentNode?.insertBefore(wrapper, video);
      wrapper.appendChild(video);
      wrapper.appendChild(btn);
    });
  }
}

// Run on load and on DOM changes
detectVideos();
new MutationObserver(detectVideos).observe(document.body, { childList: true, subtree: true });
