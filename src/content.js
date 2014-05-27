// Don't re-inject
if (!window.ssSmugmugForChromeAtIdle) {
	window.ssSmugmugForChromeAtIdle = true;
	
	//Only enable the extension menu if we're the site owner (we'll also use this as a not-a-smugmug-site test)
	var 
		enable = document.body.className.indexOf('sm-user-owner') > -1;

	if (enable) {
		var 
			siteDetailMessage = {
				nickname: false,
				loggedIn: true,
				loggedInUser: false,
				pageOwner: false,
				pageDetails: false
			},
			scriptTags = document.getElementsByTagName('script');
		
		for (var i in scriptTags) {
			var 
				script = scriptTags[i],
				matches,
				code;
			
			if (!script.src && (code = script.innerHTML)) {
				//Super rough, but should work:
				if (!siteDetailMessage.loggedInUser && (matches = code.match(/SM\.env\.loggedInUser\s*=\s*({[^\n}]+});/))) {
					try {
						siteDetailMessage.loggedInUser = JSON.parse(matches[1]);
					} catch (e) {
						//Not critical that we have this information
					}
				}
				if (!siteDetailMessage.pageOwner && (matches = code.match(/SM\.env\.pageOwner\s*=\s*({[^\n}]+});/))) {
					try {
						siteDetailMessage.pageOwner = JSON.parse(matches[1]);
						siteDetailMessage.nickname = siteDetailMessage.pageOwner.nickName; 
					} catch (e) {
					}
				}
			
				if ((matches = code.match(/^\s*Y\.SM\.Page\.init\(([^\n]+)\);$/m))) {
					try {
						siteDetailMessage.pageDetails = JSON.parse(matches[1]);
					} catch (e) {
						continue;
					}
				}
			}
		}
		
		chrome.extension.onMessage.addListener(function(message, sender, sendResponse) {
			if (message.method == 'getSiteDetail') {  
				sendResponse(siteDetailMessage);
			}
		});
	} else {
		chrome.extension.onMessage.addListener(function(message, sender, sendResponse) {
			if (message.method == 'getSiteDetail') {  
				sendResponse({loggedIn: false});
			}
		});
	}
}