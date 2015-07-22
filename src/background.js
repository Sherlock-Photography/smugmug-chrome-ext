/**
 * Blindly try to add our JS to the pages (since we cannot check their URLs to see if they are SmugMug domains or not without
 * adding the "tabs" permission, we rely on permissions exceptions being thrown instead!).
 */
function swallowErrors() {
	chrome.runtime.lastError; // If we don't read lastError, Chrome squawks in the console
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

/* 
 * SmugMug have implemented CORS-like security which checks that the Origin header on requests isn't something nasty, probably
 * because they plan to enable cross-domain requests against their API.
 * 
 * Use the webRequest framework to forge the Origin header by removing it from our requests.
 */

var
	requestFilter = {
		urls : [ "http://*/*", "https://*/*" ] /* We'll only actually get to see requests for domains we have permissions for (*.smugmug.com etc) */
	},
	extraInfoSpec = [ 'requestHeaders', 'blocking' ],
	
	requestHandler = function(details) {
		var headers = details.requestHeaders, blockingResponse = {};
	
		// The Origin header is only checked on POST/PATCH requests
		if (details.method == 'POST' || details.method == 'PATCH') {
			for (var i = 0; i < headers.length; ++i) {
				if (headers[i].name == 'Origin' && headers[i].value.match(/^chrome-extension:\/\/ninadcapimgifcnahdjbdaolfcnnlcjk/) ||
						headers[i].value.match(/^chrome-extension:\/\/ifabodhdkjnhjbcdkdfjkboidifjneia/) ||
						headers[i].value.match(/^chrome-extension:\/\/acobflahofemoblocddilbgnokclnphd/)) {
					headers.splice(i, 1);
					break;
				}
			}
		}
		
		blockingResponse.requestHeaders = headers;
		return blockingResponse;
	};

chrome.webRequest.onBeforeSendHeaders.addListener(requestHandler, requestFilter, extraInfoSpec);