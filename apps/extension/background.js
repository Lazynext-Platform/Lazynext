// background.js

let activeRecorder = null;
let currentStream = null;
let sessionId = null;
let chunkIndex = 0;

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'captureActiveTab') {
    sessionId = 'ext_session_' + Date.now();
    chunkIndex = 0;
    startCapture(sendResponse);
    return true;
  } else if (message.action === 'stopCapture') {
    stopCapture(sendResponse);
    return true;
  }
});

function startCapture(sendResponse) {
  if (activeRecorder) {
    sendResponse({ success: false, error: 'Already recording' });
    return;
  }

  chrome.tabCapture.capture({ audio: true, video: true }, (stream) => {
    if (chrome.runtime.lastError || !stream) {
      sendResponse({ success: false, error: chrome.runtime.lastError?.message || 'Failed to capture stream' });
      return;
    }
    
    currentStream = stream;
    activeRecorder = new MediaRecorder(stream, { mimeType: 'video/webm' });
    
    activeRecorder.ondataavailable = async (event) => {
      if (event.data.size > 0) {
        try {
          await uploadChunk(event.data);
        } catch (err) {
          console.error("Chunk upload failed:", err);
        }
      }
    };

    activeRecorder.onstop = async () => {
      stream.getTracks().forEach(t => t.stop());
      activeRecorder = null;
      currentStream = null;
      
      // Notify API Gateway to finalize stream
      try {
        await fetch('http://localhost:8005/api/v1/ingest/stream/complete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ session_id: sessionId })
        });
      } catch (err) {
        console.error("Stream complete failed:", err);
      }
    };

    // Request data every 1000ms (1 chunk per second)
    activeRecorder.start(1000);
    sendResponse({ success: true, detail: "Recording started" });
  });
}

function stopCapture(sendResponse) {
  if (activeRecorder && activeRecorder.state !== 'inactive') {
    activeRecorder.stop();
    sendResponse({ success: true, detail: "Recording stopped" });
  } else {
    sendResponse({ success: false, error: 'Not recording' });
  }
}

async function uploadChunk(blob) {
  const formData = new FormData();
  formData.append('chunk', blob, 'capture.webm');
  formData.append('session_id', sessionId);
  formData.append('chunk_index', chunkIndex.toString());
  chunkIndex++;

  const response = await fetch('http://localhost:8005/api/v1/ingest/stream', {
    method: 'POST',
    body: formData
  });
  
  if (!response.ok) {
    throw new Error(`Server returned ${response.status}`);
  }
}

