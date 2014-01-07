document.addEventListener('DOMContentLoaded', function() {
	
	chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
		chrome.tabs.sendMessage(tabs[0].id, {method:"getSiteDetail"}, function(siteDetail) {
			document.getElementById("create-backup").onclick = function() {
				chrome.tabs.create({
					url: 'backup.html?nickname=' + encodeURIComponent(siteDetail.nickname)
				});
				
				return false;
			};
			
			document.getElementById("list-galleries").onclick = function() {
				chrome.tabs.create({
					url: 'list-galleries.html?nickname=' + encodeURIComponent(siteDetail.nickname) + (siteDetail.loggedInUser && siteDetail.loggedInUser.homepage ? "&customDomain=" + encodeURIComponent(siteDetail.loggedInUser.homepage.replace("http://", "")) : "")
				});
				
				return false;
			};

			var payPalButtons = document.getElementById("paypal-buynow");

			// Is this a gallery page?
			if (siteDetail.pageDetails && siteDetail.pageDetails.userNode && siteDetail.pageDetails.userNode.RemoteKey) {
				payPalButtons.onclick = function() {
					chrome.tabs.create({
						url: 'paypal.html?nickname=' + encodeURIComponent(siteDetail.nickname)
							+ '&albumKey=' + encodeURIComponent(siteDetail.pageDetails.userNode.RemoteKey)
							+ '&albumName=' + encodeURIComponent(siteDetail.pageDetails.userNode.Name)
					});
					
					return false;
				};
				
				document.getElementById("just-this-page").style.display = "block";
			} else {
				payPalButtons.parentNode.className = 'disabled';

				payPalButtons.onclick = function() {
					return false;
				};
			}
		});
	});
});
