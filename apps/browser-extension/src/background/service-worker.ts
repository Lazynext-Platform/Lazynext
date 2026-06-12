// Service Worker (Background Script)
// Important: Service workers are ephemeral. Do not store state in global variables.
chrome.runtime.onInstalled.addListener(() => {
  console.log("Lazynext Extension Installed");
});

chrome.action.onClicked.addListener(async (tab) => {
  // If we wanted a Side Panel instead of a Popup, we would trigger it here.
  // Because we defined default_popup in manifest, this onClicked may not fire.
  console.log("Action clicked", tab);
});
