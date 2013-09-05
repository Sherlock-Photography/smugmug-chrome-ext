document.addEventListener('DOMContentLoaded', function() {
	document.getElementById("create-backup").onclick = function() {
		chrome.tabs.create({
			url:'backup.html'
		});
		
		return false;
	};
	
	document.getElementById("paypal-buynow").onclick = function() {
		chrome.tabs.create({
			url:'paypal.html'
		});
		
		return false;
	};	
});
