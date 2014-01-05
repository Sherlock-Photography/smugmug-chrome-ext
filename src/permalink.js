YUI().use(['ss-smugmug-tools', 'event-base'], function(Y) {
	Y.on('domready', function() {
		//Fetch details about the current page:
		chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
			chrome.tabs.sendMessage(tabs[0].id, {method: "getSiteDetail"}, function(siteDetail) {			
				if (siteDetail.pageDetails && siteDetail.pageDetails.userNode) {
					var permalinkBox = document.getElementById("permalink-box");
					
					permalinkBox.value = Y.SherlockPhotography.SmugmugTools.createGalleryPermalink(siteDetail.pageDetails.userNode, tabs[0].url, siteDetail.loggedInUser);
					
					document.getElementById("copy").onclick = function() {
						permalinkBox.select();
					    document.execCommand("Copy");
					};
				} else {
					alert("Whoops, couldn't work out how to generate a permalink for this page!");
				}
			});
		});
	});
});
