document.addEventListener('DOMContentLoaded', () => {
  const captureBtn = document.getElementById('captureBtn');
  const statusDiv = document.getElementById('status');

  const stopBtn = document.getElementById('stopBtn');

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
      }
    });
  });
});
