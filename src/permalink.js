// From http://stackoverflow.com/a/6969486/14431
function escapeRegExp(str) {
	return str.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, "\\$&");
}

document.addEventListener('DOMContentLoaded', function() {
	//Fetch details about the current page:
	chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
		chrome.tabs.sendMessage(tabs[0].id, {method: "getSiteDetail"}, function(siteDetail) {			
			if (siteDetail.pageDetails && siteDetail.pageDetails.userNode) {
				var userNode = siteDetail.pageDetails.userNode;
				
				var 
					pl = userNode.Url,
					permalinkBox = document.getElementById("permalink-box");
				
				//Remove NodeID from the end of the URL for unlisted galleries (albumID/albumKey substitutes for that)
				pl = pl.replace(new RegExp("/n-" + escapeRegExp(userNode.NodeID) + "$"), "");
				
				//Add the old-style SmugMug albumID/albumKey to the end
				pl = pl + "/" + userNode.RemoteID + "_" + userNode.RemoteKey;
				
				//Is this a lightbox URL?
				
				var 
					pageUrl = userNode.Url.replace(/\/$/, ""), //Remove trailing backslash
					matches = tabs[0].url.match(new RegExp("^" + escapeRegExp(pageUrl) + "/i-([0-9a-zA-Z]+)/([A-Z0-9]{1,2})$"));
				
				if (matches) {
					/* When the gallery URL is correct, SmugMug does a 301 permanent to the vanilla gallery URL, discarding
					 * the query string. The New SmugMug gallery then interprets the hashbang arguments and opens the lightbox. 
					 * 
					 * When the gallery URL is incorrect, SmugMug loads a special gallery-404 page to examine the hash with
					 * JS (which the SM server couldn't see on its own).
					 * 
					 * The query string part (?) ends up being examined as well as the hash (I think accidentally). The information
					 * in the query string causes a redirect to a URL like /r-KT1a1j/XL.
					 * 
					 * When it arrives at the new-SmugMug gallery router, this gets converted to /i-KT1a1j/XL which opens the lightbox.
					 */
					pl = pl + "?k=" + matches[1] + "&lb=1&s=" + matches[2] + "#!/i-" + matches[1] + "/" + matches[2];
				}
				
				//Attempt to switch the link to use the user's custom domain
				if (siteDetail.loggedInUser && siteDetail.loggedInUser.homepage && !siteDetail.loggedInUser.homepage.match(/\.smugmug\.com$/)) {
					pl = pl.replace(new RegExp("^http://" + siteDetail.loggedInUser.nickName + "\.smugmug\.com"), siteDetail.loggedInUser.homepage);
				}
				
				permalinkBox.value = pl;
				
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
