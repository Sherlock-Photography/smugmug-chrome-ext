//Only show the SmugMug menu if we're the site owner
if (document.body.className.indexOf('sm-user-owner') > -1) {
	chrome.runtime.sendMessage({method: "showPageAction"});
}