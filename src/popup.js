function show_popup(tab, hasPermission, domainName) {
	if (!hasPermission) {
		document.getElementById("hasnt-permission").style.display = "block";					
		document.getElementById("custom-domain-name").textContent = domainName[1]; 
	}
	
	chrome.tabs.sendMessage(tab.id, {method:"getSiteDetail"}, function(siteDetail) {
		if (hasPermission && siteDetail === undefined) {
			document.getElementById("please-refresh").style.display = "block";
		} else if (hasPermission && (!siteDetail.loggedIn || !siteDetail.loggedInUser || !siteDetail.loggedInUser.isOwner)) {
			document.getElementById("please-log-in").style.display = "block";
		} else {
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

			// Is this a gallery page?
			if (siteDetail && siteDetail.pageDetails && siteDetail.pageDetails.userNode && siteDetail.pageDetails.userNode.RemoteKey) {
				var payPalButtons = document.getElementById("paypal-buynow");
				
				payPalButtons.onclick = function() {
					chrome.tabs.create({
						url: 'paypal.html?nickname=' + encodeURIComponent(siteDetail.nickname)
							+ '&albumKey=' + encodeURIComponent(siteDetail.pageDetails.userNode.RemoteKey)
							+ '&albumName=' + encodeURIComponent(siteDetail.pageDetails.userNode.Name)
							+ '&token=' + encodeURIComponent(siteDetail.pageDetails.csrfToken)
					});
					
					return false;
				};
				
				var bulkEdit = document.getElementById("bulk-edit");
								
				bulkEdit.onclick = function(e) {
					if (false) {
						chrome.tabs.create({
							url: 'http://' + domainName[1] + '/photos/tools.mg?pageType=Album&tool=bulkcaption&AlbumID=' + encodeURIComponent(siteDetail.pageDetails.userNode.RemoteID)
								+ '&AlbumKey=' + encodeURIComponent(siteDetail.pageDetails.userNode.RemoteKey)
								+ '&url='+ encodeURIComponent(tab.url)
						});
						
						return false;
					}
					
					chrome.tabs.create({
						url: 'bulk-edit.html?nickname=' + encodeURIComponent(siteDetail.nickname)
							+ '&albumKey=' + encodeURIComponent(siteDetail.pageDetails.userNode.RemoteKey)
							+ '&albumName=' + encodeURIComponent(siteDetail.pageDetails.userNode.Name)
							+ '&token=' + encodeURIComponent(siteDetail.pageDetails.csrfToken)
					});
					
					return false;
				};
				
				document.getElementById("just-this-page").style.display = "block";
			}

			if (hasPermission) {
				document.getElementById("has-permission").style.display = "block";
			} else {
				var requestPermission = document.getElementById("request-permission");
				
				requestPermission.onclick = function(e) {
					chrome.permissions.request({
						origins: [domainName[0]]
					}, function(granted) {
						/* 
						 * If the user had to interact with the "give permission" dialog, then this popup will be closed.
						 * 
						 * If the user had previously enabled the site, the popup will stay open and we can reload to let them
						 * start using it:
						 */ 
						if (granted) {
							location.reload();
						}
					});				
	
					e.preventDefault();
	
					return false;
				};
			}						
		}
	});
}

function connectWithPage() {
	chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
		var tab;
		
		if (tabs && tabs.length > 0 && (tab = tabs[0])) {
			//We can read the tab URL due to having the 'activetab' permission:
			if (tab.status == 'complete' && tab.url) {
				document.getElementById("tab-loading").style.display = "none";
				
				var 
					domainName = tab.url.match(/^http:\/\/([^/]+)\//);
	
				if (domainName) {
					//We always have permission for *.smugmug.com domains
					if (tab.url.match(/^http:\/\/(?:www\.)?([^.]+)\.smugmug\.com\//)) {
						show_popup(tab, true, domainName);
					} else {
						//Assume we're on a custom domain name, so check that we have permission for it
						
						chrome.permissions.contains({
							permissions: [],
							origins: [domainName[0]]
						}, function(result) {
							show_popup(tab, result, domainName);
						});
					}
				} else {
					//Not even an http:// URL. Just show the "about me" section
				}
			} else if (tab.status == 'loading'){
				document.getElementById("tab-loading").style.display = "block";
				setTimeout(connectWithPage, 1000);
			} else {
				document.getElementById("tab-loading").style.display = "none";
			}
		}
	});
}

document.addEventListener('DOMContentLoaded', connectWithPage);
