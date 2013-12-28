chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
	if (request.method == 'showPageAction') {
		chrome.pageAction.show(sender.tab.id);
	}
});