var pageDetails, nickname, loggedInUser;

chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
	if (request.method == 'showPageAction') {
		pageDetails = request.pageDetails;
		nickname = request.nickname;
		loggedInUser = request.loggedInUser;
		
		chrome.pageAction.show(sender.tab.id);
	}
});