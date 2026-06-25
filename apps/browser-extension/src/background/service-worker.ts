// Service Worker (Background Script)

let API_GATEWAY = "http://localhost:8005";

// Restore the configured gateway URL from extension storage, falling
// back to the localhost default for development.
chrome.storage.local.get("apiGatewayUrl", (items) => {
	if (items.apiGatewayUrl) {
		API_GATEWAY = items.apiGatewayUrl;
	}
});

chrome.runtime.onInstalled.addListener(() => {
	console.log("Lazynext Extension Installed");

	chrome.contextMenus.create({
		id: "send-to-lazynext",
		title: "Send Video to Lazynext Timeline",
		contexts: ["video", "link"],
	});
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
	if (info.menuItemId === "send-to-lazynext") {
		const mediaUrl = info.srcUrl || info.linkUrl;
		if (!mediaUrl) return;

		console.log(`Sending media to Lazynext: ${mediaUrl}`);

		try {
			const response = await fetch(
				`${API_GATEWAY}/api/v1/ai/ingest`,
				{
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({
						url: mediaUrl,
						crdtAction: "APPEND_TRACK",
					}),
				},
			);

			if (!response.ok) {
				console.error(`Gateway returned ${response.status}`);
				return;
			}
			const data = await response.json();
			console.log("Success:", data);
		} catch (error) {
			console.error("Failed to reach Lazynext API Gateway:", error);
		}
	}
});
