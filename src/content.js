// Don't re-inject
if (!window.ssSmugmugForChromeAtIdle) {
	window.ssSmugmugForChromeAtIdle = true;
	
	var siteDetailMessage;
	
	//Only enable the extension menu if we're the site owner (we'll also use this as a not-a-smugmug-site test)
	if (document.body.className.indexOf('sm-user-owner') > -1) {
		var scriptTags = document.getElementsByTagName('script');
		
		siteDetailMessage = {
			nickname: false,
			loggedIn: true,
			loggedInUser: false,
			pageOwner: false,
			pageDetails: false
		};
	
		for (var i in scriptTags) {
			var 
				script = scriptTags[i],
				matches, code, SM;
			
			if (!script.src && (code = script.innerHTML)) {
				if ((matches = code.match(/^\s*var (SM\s*=\s*\{[^\n]+\};)$/m))) {
					try {
						eval(matches[0]); //Since it isn't JSON due to missing quotes, we can't use that cleanly
					} catch (e) {
					}
					
					if (SM) {
						siteDetailMessage.loggedInUser = SM.env.loggedInUser;
						siteDetailMessage.pageOwner = SM.env.pageOwner;
						siteDetailMessage.nickname = siteDetailMessage.pageOwner.nickName;
					}
				} else if ((matches = code.match(/^\s*Y\.SM\.Page\.init\(([^\n]+)\);$/m))) {
					try {
						siteDetailMessage.pageDetails = JSON.parse(matches[1]);
					} catch (e) {
						continue;
					}
				}
			}
		}
	} else {
		siteDetailMessage = { 
			loggedIn: false
		};
	}
	
	chrome.extension.onMessage.addListener(function(message, sender, sendResponse) {
		switch (message.method) {
			case 'getSiteDetail':  
				sendResponse(siteDetailMessage);
			break;
		}
	});
	

}