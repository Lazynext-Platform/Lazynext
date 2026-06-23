// Service Worker (Background Script)

chrome.runtime.onInstalled.addListener(() => {
	console.log("Lazynext Extension Installed");
	
	chrome.contextMenus.create({
		id: "send-to-lazynext",
		title: "Send Video to Lazynext Timeline",
		contexts: ["video", "link"]
	});
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
	if (info.menuItemId === "send-to-lazynext") {
		const mediaUrl = info.srcUrl || info.linkUrl;
		if (!mediaUrl) return;

		console.log(`Sending media to Lazynext: ${mediaUrl}`);

		try {
			// Ping the new Rust API Gateway
			const response = await fetch("http://127.0.0.1:8005/api/v1/ai/ingest", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					url: mediaUrl,
					crdtAction: "APPEND_TRACK"
				})
			});

			const data = await response.json();
			console.log("Success:", data);
		} catch (error) {
			console.error("Error:", error);
		}
	}
});
