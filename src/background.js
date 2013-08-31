var pageDetails, nickname;

chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
	if (request.method == 'showPageAction') {
		pageDetails = request.pageDetails;
		nickname = request.nickname;
		
		chrome.pageAction.show(sender.tab.id);
	}
});