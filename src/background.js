/**
 * Blindly try to add our JS to the pages (since we cannot check their URLs to see if they are SmugMug domains or not without
 * adding the "tabs" permission, we rely on permissions exceptions being thrown instead!).
 */
function swallowErrors() {
	
}

chrome.tabs.onUpdated.addListener(function(tabId, changeInfo, tab) {
	if (changeInfo && changeInfo.status) {
		if (changeInfo.status == "complete") {
			chrome.tabs.executeScript(tabId, {
				file: "content.js",
				runAt: "document_idle"
			}, swallowErrors);
		} else {
			chrome.tabs.executeScript(tabId, {
				file: "content-start.js",
				runAt: "document_start"
			}, swallowErrors);
		}
	}
});