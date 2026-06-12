chrome.runtime.onInstalled.addListener(()=>{console.log("Lazynext Extension Installed")});chrome.action.onClicked.addListener(async e=>{console.log("Action clicked",e)});
