// Content Script
// Injected into the active page DOM to extract video/assets or inject UI.
console.log("Lazynext Content Script running in the page");

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
	if (message.type === "EXTRACT_VIDEO") {
		const videoElements = document.querySelectorAll("video");
		sendResponse({ videosFound: videoElements.length });
	}
	return true; // Keep channel open for async response
});
