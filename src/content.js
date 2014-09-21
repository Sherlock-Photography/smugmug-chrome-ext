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
			case 'getToken':
				if (message.domain == window.location.host) {
					var req = new XMLHttpRequest();
					
					req.onload = function(data) {
						if (this.status == 200) {
							sendResponse(JSON.parse(this.responseText));
						}
					};
					
					req.open("post", "/api/v2!token", true);
					req.setRequestHeader("Accept", "application/json");
					req.send();
					
					return true; // We will send our response asynchronously
				}
			break;
		}
	});
	

}