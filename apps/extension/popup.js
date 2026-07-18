// popup.js — Lazynext Capture extension popup UI
// Handles video capture start/stop via the active tab's content script.
// For simplicity, we send messages and handle state statelessly.

document.addEventListener('DOMContentLoaded', () => {
  const captureBtn = document.getElementById('captureBtn');
  const statusDiv = document.getElementById('status');
  const stopBtn = document.getElementById('stopBtn');
  const themeBtn = document.getElementById('themeBtn');

  // Theme Management
  chrome.storage.local.get("themeMode", (res) => {
    let mode = res.themeMode || "system";
    themeBtn.textContent = mode;
    applyTheme(mode);
  });

  function applyTheme(mode) {
    const html = document.documentElement;
    html.classList.remove("light", "dark");
    if (mode !== "system") {
      html.classList.add(mode);
    }
  }

  themeBtn.addEventListener('click', () => {
    chrome.storage.local.get("themeMode", (res) => {
      let currentMode = res.themeMode || "system";
      let nextMode = currentMode === "system" ? "dark" : currentMode === "dark" ? "light" : "system";
      chrome.storage.local.set({ themeMode: nextMode });
      themeBtn.textContent = nextMode;
      applyTheme(nextMode);
    });
  });

  // Check if we are already recording (a robust extension would store this in storage)
  // For simplicity, we just send a message and handle it statelessly if we can.
  
  captureBtn.addEventListener('click', () => {
    captureBtn.disabled = true;
    captureBtn.textContent = 'Starting...';
    statusDiv.textContent = '';
    statusDiv.className = '';

    chrome.runtime.sendMessage({ action: 'captureActiveTab' }, (response) => {
      if (chrome.runtime.lastError) {
        captureBtn.disabled = false;
        captureBtn.textContent = 'Start Recording';
        statusDiv.textContent = `Error: ${chrome.runtime.lastError.message}`;
        statusDiv.className = 'error';
        return;
      }

      if (response && response.success) {
        statusDiv.textContent = 'Recording started...';
        statusDiv.className = 'success';
        captureBtn.style.display = 'none';
        stopBtn.style.display = 'block';
      } else {
        captureBtn.disabled = false;
        captureBtn.textContent = 'Start Recording';
        statusDiv.textContent = response?.error || 'Unknown error occurred.';
        statusDiv.className = 'error';
      }
    });
  });

  stopBtn.addEventListener('click', () => {
    stopBtn.disabled = true;
    stopBtn.textContent = 'Stopping...';

    chrome.runtime.sendMessage({ action: 'stopCapture' }, (response) => {
      stopBtn.disabled = false;
      stopBtn.textContent = 'Stop Recording';
      
      if (response && response.success) {
        statusDiv.textContent = 'Recording stopped and sent to Lazynext.';
        statusDiv.className = 'success';
        stopBtn.style.display = 'none';
        captureBtn.style.display = 'block';
        captureBtn.disabled = false;
        captureBtn.textContent = 'Start Recording';
        document.getElementById('publishSection').style.display = 'block';
      }
    });
  });

  const handleShare = (platform) => {
    chrome.runtime.sendMessage({ action: 'publishSocial', platform }, (response) => {
      if (response && response.success) {
        statusDiv.textContent = `Queued for ${platform}!`;
        statusDiv.className = 'success';
        document.getElementById('publishSection').style.display = 'none';
      } else {
        statusDiv.textContent = `Error: ${response?.error || 'Unknown'}`;
        statusDiv.className = 'error';
      }
    });
  };

  document.getElementById('shareTiktokBtn').addEventListener('click', () => handleShare('tiktok'));
  document.getElementById('shareYoutubeBtn').addEventListener('click', () => handleShare('youtube'));
  document.getElementById('shareInstagramBtn').addEventListener('click', () => handleShare('instagram'));
    document.getElementById('shareFacebookBtn').addEventListener('click', () => handleShare('facebook'));
  document.getElementById('shareLinkedInBtn').addEventListener('click', () => handleShare('linkedin'));
  document.getElementById('sharePinterestBtn').addEventListener('click', () => handleShare('pinterest'));
  document.getElementById('shareSnapchatBtn').addEventListener('click', () => handleShare('snapchat'));
  document.getElementById('shareTwitchBtn').addEventListener('click', () => handleShare('twitch'));
  document.getElementById('shareVimeoBtn').addEventListener('click', () => handleShare('vimeo'));
  document.getElementById('shareThreadsBtn').addEventListener('click', () => handleShare('threads'));
    document.getElementById('shareRedditBtn').addEventListener('click', () => handleShare('reddit'));
  document.getElementById('shareDiscordBtn').addEventListener('click', () => handleShare('discord'));
  document.getElementById('shareBlueskyBtn').addEventListener('click', () => handleShare('bluesky'));
  document.getElementById('shareMastodonBtn').addEventListener('click', () => handleShare('mastodon'));
    document.getElementById('shareDailymotionBtn').addEventListener('click', () => handleShare('dailymotion'));
  document.getElementById('shareBilibiliBtn').addEventListener('click', () => handleShare('bilibili'));
  document.getElementById('sharePatreonBtn').addEventListener('click', () => handleShare('patreon'));
  document.getElementById('shareMediumBtn').addEventListener('click', () => handleShare('medium'));
  document.getElementById('shareWhatsAppBtn').addEventListener('click', () => handleShare('whatsapp'));
  document.getElementById('shareWeChatBtn').addEventListener('click', () => handleShare('wechat'));
  document.getElementById('shareLineBtn').addEventListener('click', () => handleShare('line'));
  document.getElementById('shareKwaiBtn').addEventListener('click', () => handleShare('kwai'));
  document.getElementById('shareTumblrBtn').addEventListener('click', () => handleShare('tumblr'));
  document.getElementById('shareOnlyFansBtn').addEventListener('click', () => handleShare('onlyfans'));
    document.getElementById('shareKickBtn').addEventListener('click', () => handleShare('kick'));
  document.getElementById('shareTruthSocialBtn').addEventListener('click', () => handleShare('truthsocial'));
  document.getElementById('shareVKontakteBtn').addEventListener('click', () => handleShare('vk'));
  document.getElementById('shareWeiboBtn').addEventListener('click', () => handleShare('weibo'));
  document.getElementById('shareKakaoTalkBtn').addEventListener('click', () => handleShare('kakaotalk'));
  document.getElementById('shareViberBtn').addEventListener('click', () => handleShare('viber'));
  document.getElementById('shareSignalBtn').addEventListener('click', () => handleShare('signal'));
  document.getElementById('shareSlackBtn').addEventListener('click', () => handleShare('slack'));
  document.getElementById('shareSubstackBtn').addEventListener('click', () => handleShare('substack'));
  document.getElementById('shareGhostBtn').addEventListener('click', () => handleShare('ghost'));
  document.getElementById('shareLocalsBtn').addEventListener('click', () => handleShare('locals'));
  document.getElementById('shareOdyseeBtn').addEventListener('click', () => handleShare('odysee'));
  document.getElementById('shareBitChuteBtn').addEventListener('click', () => handleShare('bitchute'));
  document.getElementById('shareFlickrBtn').addEventListener('click', () => handleShare('flickr'));
  document.getElementById('shareMixcloudBtn').addEventListener('click', () => handleShare('mixcloud'));
  document.getElementById('shareDTubeBtn').addEventListener('click', () => handleShare('dtube'));
  document.getElementById('shareTrovoBtn').addEventListener('click', () => handleShare('trovo'));
  document.getElementById('shareXiguaBtn').addEventListener('click', () => handleShare('xigua'));
  document.getElementById('shareTelegramBtn').addEventListener('click', () => handleShare('telegram'));
  document.getElementById('shareRumbleBtn').addEventListener('click', () => handleShare('rumble'));
  document.getElementById('shareTwitterBtn').addEventListener('click', () => handleShare('twitter'));
});
