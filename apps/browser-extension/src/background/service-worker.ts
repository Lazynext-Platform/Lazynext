/** @module background/service-worker Service worker for browser extension background script */
// Service Worker (Background Script)

let API_GATEWAY = "http://localhost:8005";
let AUTH_TOKEN = "";
let AUTH_REFRESH_TOKEN = "";
let AUTH_USER: { id: string; name: string; email: string } | null = null;

// Restore the configured gateway URL, token, and user from extension storage,
// falling back to the localhost default for development.
chrome.storage.local.get(
	["apiGatewayUrl", "authToken", "authRefreshToken", "authUser"],
	(items: { [key: string]: any }) => {
		if (items.apiGatewayUrl && typeof items.apiGatewayUrl === "string") {
			API_GATEWAY = items.apiGatewayUrl;
		}
		if (items.authToken && typeof items.authToken === "string") {
			AUTH_TOKEN = items.authToken;
		}
		if (items.authRefreshToken && typeof items.authRefreshToken === "string") {
			AUTH_REFRESH_TOKEN = items.authRefreshToken;
		}
		if (items.authUser && typeof items.authUser === "object") {
			AUTH_USER = items.authUser;
		}
	},
);

// Listen for messages from the extension popup/content scripts
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
	if (message.type === "SET_AUTH_TOKEN") {
		AUTH_TOKEN = message.token || "";
		AUTH_REFRESH_TOKEN = message.refreshToken || "";
		AUTH_USER = message.user || null;
		chrome.storage.local.set({
			authToken: AUTH_TOKEN,
			authRefreshToken: AUTH_REFRESH_TOKEN,
			authUser: AUTH_USER,
		});
		sendResponse({ success: true });
	} else if (message.type === "GET_AUTH_TOKEN") {
		sendResponse({
			token: AUTH_TOKEN,
			refreshToken: AUTH_REFRESH_TOKEN,
			user: AUTH_USER,
		});
	} else if (message.type === "CLEAR_AUTH") {
		AUTH_TOKEN = "";
		AUTH_REFRESH_TOKEN = "";
		AUTH_USER = null;
		chrome.storage.local.remove(["authToken", "authRefreshToken", "authUser"]);
		sendResponse({ success: true });
	}
	return true;
});

// Open a popup window for OAuth sign-in (Google, Apple, Microsoft)
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
	if (message.type === "START_OAUTH") {
		const provider = message.provider as string;
		const redirectUrl = message.redirectUrl as string ||
			`${API_GATEWAY.replace(":8005", ":3000")}/api/auth/callback/${provider}`;
		const authUrl = message.authUrl as string ||
			`${API_GATEWAY.replace(":8005", ":3000")}/api/auth/sign-in/social?provider=${provider}&callbackURL=${redirectUrl}`;

		// Open a popup for OAuth flow
		chrome.windows.create(
			{
				url: authUrl,
				type: "popup",
				width: 500,
				height: 700,
			},
			(window) => {
				// Listen for auth completion
				const tabId = window?.tabs?.[0]?.id;
				if (tabId) {
				const listener: Parameters<
					typeof chrome.tabs.onUpdated.addListener
				>[0] = (updatedTabId, changeInfo) => {
					if (updatedTabId === tabId && changeInfo.url) {
						const url = new URL(changeInfo.url);
						const params = new URLSearchParams(url.search);
						const token = params.get("token");
						const errParam = params.get("error");

						if (token || errParam) {
							chrome.tabs.onUpdated.removeListener(listener);
							chrome.windows.remove(window.id!);
							sendResponse({ token, error: errParam });
						}
					}
				};
					chrome.tabs.onUpdated.addListener(listener);
				}
			},
		);
	}
	return true;
});

chrome.runtime.onInstalled.addListener(() => {
	console.log("Lazynext Extension Installed");

	chrome.contextMenus.create({
		id: "send-to-lazynext",
		title: "Send Video to Lazynext Timeline",
		contexts: ["video", "link"],
	});
});

chrome.contextMenus.onClicked.addListener(async (info, _tab) => {
	if (info.menuItemId === "send-to-lazynext") {
		const mediaUrl = info.srcUrl || info.linkUrl;
		if (!mediaUrl) return;

		if (!mediaUrl.startsWith("http://") && !mediaUrl.startsWith("https://")) {
			console.warn(`Rejected non-http URL: ${mediaUrl}`);
			return;
		}
		try {
			const u = new URL(mediaUrl);
			if (u.hostname === "localhost" || u.hostname === "127.0.0.1" || u.hostname === "[::1]") {
				console.warn(`Rejected localhost URL: ${mediaUrl}`);
				return;
			}
		} catch {
			console.warn(`Invalid URL: ${mediaUrl}`);
			return;
		}

		try {
			const headers: Record<string, string> = { "Content-Type": "application/json" };
			if (AUTH_TOKEN) {
				headers["Authorization"] = `Bearer ${AUTH_TOKEN}`;
			}
			const response = await fetch(
				`${API_GATEWAY}/api/v1/ai/ingest`,
				{
					method: "POST",
					headers,
					body: JSON.stringify({
						url: mediaUrl,
						crdtAction: "APPEND_TRACK",
					}),
				},
			);

			if (!response.ok) {
				console.error(`Gateway returned ${response.status}`);
				void chrome.notifications.create(`lazynext-err-${Date.now()}`, {
					type: "basic",
					iconUrl: "icons/icon48.png",
					title: "Lazynext — Import Failed",
					message: `API Gateway returned ${response.status}. Check your connection.`,
				});
				return;
			}
			const data = await response.json();
			console.log("Success:", data);
			void chrome.notifications.create(`lazynext-ok-${Date.now()}`, {
				type: "basic",
				iconUrl: "icons/icon48.png",
				title: "Sent to Lazynext",
				message: `Media added to your timeline.`,
			});
		} catch (error) {
			console.error("Failed to reach Lazynext API Gateway:", error);
			void chrome.notifications.create(`lazynext-err-${Date.now()}`, {
				type: "basic",
				iconUrl: "icons/icon48.png",
				title: "Lazynext — Offline",
				message: "Could not reach the API Gateway. Open the web app and retry.",
			});
		}
	}
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
	if (changeInfo.status === "complete" && tab.url && tab.url.includes("lazynext.com/billing")) {
		// Example check: check API Gateway if user has wallet balance
		console.log("Checking if user has wallet credits available for checkout...");
		// Fake notification simulating discovering a wallet balance
		setTimeout(() => {
			void chrome.notifications.create(`lazynext-wallet-${Date.now()}`, {
				type: "basic",
				iconUrl: "icons/icon48.png",
				title: "You have $50.00 in credits!",
				message: "Apply your wallet balance at checkout to save on your subscription.",
			});
		}, 1000);
	}
});
