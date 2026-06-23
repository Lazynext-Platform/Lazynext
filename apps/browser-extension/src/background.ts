// @ts-nocheck
chrome.runtime.onInstalled.addListener(() => {
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
      const response = await fetch("https://api.lazynext.ai/api/v1/ai/ingest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: mediaUrl,
          crdtAction: "APPEND_TRACK"
        })
      });

      const data = await response.json();
      console.log("Success:", data);
      
      // Alert the user via a basic notification
      // Note: Must use absolute path to the root of the extension for iconUrl
      await chrome.notifications.create({
          type: "basic",
          iconUrl: "/icons/icon128.png",
          title: "Lazynext",
          message: "Media sent to timeline successfully."
      });
    } catch (error) {
      console.error("Error:", error);
      await chrome.notifications.create({
          type: "basic",
          iconUrl: "/icons/icon128.png",
          title: "Lazynext Error",
          message: "Failed to send media to Lazynext."
      });
    }
  }
});
