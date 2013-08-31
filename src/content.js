//Only show the SmugMug menu if we're the site owner
if (document.body.className.indexOf('sm-user-owner') > -1) {
	var 
		scriptTags = document.getElementsByTagName('script'),
		found = false,
		matches;
	
	if ((matches = location.href.match(/^http:\/\/(?:www\.)?([^.]+)\.smugmug\.com\//))) {
		var nickname = matches[1];
		
		for (var i in scriptTags) {
			var 
				script = scriptTags[i],
				matches = script.innerHTML.match(/^\s*Y\.SM\.Page\.init\(([^\n]+)\);$/m);
			
			if (matches) {
				chrome.runtime.sendMessage({method: "showPageAction", nickname: nickname, pageDetails: JSON.parse(matches[1])});
				found = true;
				break;
			}
		}
		
		if (!found) {
			chrome.runtime.sendMessage({method: "showPageAction", nickname: nickname, pageDetails: false});		
		}
	}
}