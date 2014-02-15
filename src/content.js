//Only show the SmugMug menu if we're the site owner
var enable = document.body.className.indexOf('sm-user-owner') > -1;

if (enable) {
	//Let other scripts in the page know that they are allowed to execute too
	var injectJS = document.createElement('script');
	injectJS.text = "window.sherlockPhotographySMForChrome.config.enable = true;";
	(document.head || document.documentElement).appendChild(injectJS);

	var 
		found = false,
		matches;
	
	if ((matches = location.href.match(/^http:\/\/(?:www\.)?([^.]+)\.smugmug\.com\//))) {
		var 
			siteDetailMessage = {
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
			if (!siteDetailMessage.loggedInUser && (matches = script.innerHTML.match(/SM\.env\.loggedInUser=({[^\n}]+});/))) {
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
		
		chrome.extension.onMessage.addListener(function(message, sender, sendResponse) {
			if (message.method == 'getSiteDetail') {  
				sendResponse(siteDetailMessage);
			}
		});
		
		chrome.runtime.sendMessage({method: "showPageAction"});
	}
}