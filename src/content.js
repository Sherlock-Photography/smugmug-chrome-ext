//Only show the SmugMug menu if we're the site owner
if (document.body.className.indexOf('sm-user-owner') > -1) {
	var 
		found = false,
		matches;
	
	if ((matches = location.href.match(/^http:\/\/(?:www\.)?([^.]+)\.smugmug\.com\//))) {
		var 
			siteDetailMessage = {
				method: "showPageAction",
				nickname: matches[1],
				loggedInUser: false,
				pageDetails: false
			},
			loggedInUser = false, pageDetails = false,
			scriptTags = document.getElementsByTagName('script');
		
		for (var i in scriptTags) {
			var 
				script = scriptTags[i],
				matches;
			
			//Super rough, but should work:
			if (!siteDetailMessage.loggedInUser && (matches = script.innerHTML.match(/SM\.env\.loggedInUser={[^\n}]+};/))) {
				try {
					siteDetailMessage.loggedInUser = JSON.parse(matches[1]);
				} catch (e) {
					//Not critical that we have this information
				}
			} else {
				matches = script.innerHTML.match(/^\s*Y\.SM\.Page\.init\(([^\n]+)\);$/m);
				
				if (matches) {
					try {
						siteDetailMessage.pageDetails = JSON.parse(matches[1]);
					} catch (e) {
						continue;
					}
			
					//This should come last in the page, so our search is done
					break;
				}
			}
		}
		
		chrome.runtime.sendMessage(siteDetailMessage);
	}
}