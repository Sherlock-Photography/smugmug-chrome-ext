document.addEventListener('DOMContentLoaded', function() {
	document.getElementById("create-backup").onclick = function() {
		chrome.tabs.create({
			url:'backup.html'
		});
		
		return false;
	};

	var buyNow = document.getElementById("paypal-buynow");
	
	if (chrome.extension.getBackgroundPage().pageDetails && chrome.extension.getBackgroundPage().pageDetails.userNode 
			&& chrome.extension.getBackgroundPage().pageDetails.userNode.RemoteKey) {
		buyNow.onclick = function() {
			chrome.tabs.create({
				url:'paypal.html'
			});
			
			return false;
		};
	} else {
		buyNow.parentNode.className = 'disabled';

		buyNow.onclick = function() {
			return false;
		};
	}
});
