"use strict";

function showSMMenuPopup(tab, hasPermission, domainName) {
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
				var
					customDomain = false;
				
				if (siteDetail.loggedInUser && siteDetail.loggedInUser.homepage) {
					customDomain = siteDetail.loggedInUser.homepage.replace("http://", "").replace("https://", "");
				}
				
				chrome.tabs.create({
					url: 'list-galleries.html?nickname=' + encodeURIComponent(siteDetail.nickname) + "&customDomain=" + encodeURIComponent(customDomain)
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
						    + '&apiKey=' + encodeURIComponent(siteDetail.apiKey)
					});
					
					return false;
				};
				
				var bulkEditTool = document.getElementById("bulk-edit-beta");
				
				bulkEditTool.onclick = function(e) {
					if (e.shiftKey) {
						chrome.tabs.create({
							url: 'https://' + domainName[1] + '/photos/tools.mg?pageType=Album&tool=bulkcaption&AlbumID=' + encodeURIComponent(siteDetail.pageDetails.userNode.RemoteID)
								+ '&AlbumKey=' + encodeURIComponent(siteDetail.pageDetails.userNode.RemoteKey)
								+ '&url='+ encodeURIComponent(tab.url)
								+ '&apiKey=' + encodeURIComponent(siteDetail.apiKey)
						});
					} else {
						chrome.tabs.create({
							url: 'bulk-edit.html?domain=' + encodeURIComponent(domainName[1])
								+ '&albumKey=' + encodeURIComponent(siteDetail.pageDetails.userNode.RemoteKey)
								+ '&albumName=' + encodeURIComponent(siteDetail.pageDetails.userNode.Name)
								+ '&apiKey=' + encodeURIComponent(siteDetail.apiKey)
						});
					}
					
					return false;
				};
				
				document.getElementById("just-this-page").style.display = "block";
				
				document.getElementById("edit-thumbnails").onclick = function(e) {

					//Attempt to parse the key of the currently selected photo out of the URL, so we can crop that photo
					
					var 
						matches = tab.url.match(/^https?:\/\/[^\/]+(\/.*?)(?:\/i-([a-zA-Z0-9]+))?(?:\/(A|S|M|L|XL|X2|X3|320|640|960|1280|1920|O|Buy))?(\?[^#]*)?(#.*)?$/),
						
						match_gallery_url = matches[1],
						match_image_key = matches[2],
						match_lightbox_size = matches[3];
					
					// Ensure gallery URL ends in a slash
					if (match_gallery_url && !match_gallery_url.match(/\/$/)) {
						match_gallery_url += '/';
					}
					
					function reportCropThumbnailToolError(message) {
						if (message === undefined) {
							message = "Failed to look up details about that photo in order to crop it, please try again.";
						}
						
						document.getElementById("edit-thumbnails-error").innerText = message;
					}
					
					function openCropThumbnailTool(imageID, imageKey) {
						chrome.tabs.update({
							url: 'https://' + domainName[1] + '/photos/tools/crop.mg?' +
								'ImageID=' + encodeURIComponent(imageID) +
								'&ImageKey=' + encodeURIComponent(imageKey) +
								'&tool=newthumb' +
								'&url=' + encodeURIComponent('https://' + domainName[1] + match_gallery_url + '#!i=' + imageID + '&k=' + imageKey)
						});
						
						window.close();
					}

					//Clear error message
					reportCropThumbnailToolError("");
					
					YUI().use(['io'], function(Y) {
						if (match_image_key) {
							//Identify the image ID to go with the key of the selected image we identified
							
							Y.io('https://' + domainName[1] + '/api/v2/image!imagekeylookup?_filter=UploadKey&_shorturis=', {
								method: 'GET',
								headers: {
									'Accept': 'application/json'
								},
								data: {
									imagekey: match_image_key
								},
								on: {
									success: function(transactionid, response, args) {
										try {
											var data = JSON.parse(response.responseText);
											
											openCropThumbnailTool(data.Response.Image.UploadKey, match_image_key);
										} catch (e) {
											reportCropThumbnailToolError();
										}
									},
									failure: function() {
										reportCropThumbnailToolError();
									}
								}
							});
						} else {
							//We don't have a photo open, so just crop the first photo in the album
							
							Y.io('https://' + domainName[1] + '/api/v2/album/' + siteDetail.pageDetails.userNode.RemoteKey + '!images?count=1&_filter=UploadKey,Uri&_shorturis=', {
								method: 'GET',
								headers: {
									'Accept': 'application/json'
								},
								on: {
									success: function(transactionid, response, args) {
										try {
											var data = JSON.parse(response.responseText);
											
											if (data.Response.AlbumImage) {
												openCropThumbnailTool(data.Response.AlbumImage[0].UploadKey, data.Response.AlbumImage[0].Uri.match(/\/([a-zA-Z0-9]+)(-\d+)?$/)[1]);
											} else {
												reportCropThumbnailToolError("This gallery seems to be empty, no thumbnails found to crop.");
											}
										} catch (e) {
											reportCropThumbnailToolError();
										}									
									},
									failure: function() {
										reportCropThumbnailToolError();
									}
								}
							});						
						}
					});

					e.preventDefault();
					
					return false;
				};
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
					domainName = tab.url.match(/^https?:\/\/([^/]+)\//);
	
				if (domainName) {
					//We always have permission for *.smugmug.com domains
					if (tab.url.match(/^https?:\/\/(?:www\.)?([^.]+)\.smugmug\.com\//)) {
						showSMMenuPopup(tab, true, domainName);
					} else {
						//Assume we're on a custom domain name, so check that we have permission for it
						
						chrome.permissions.contains({
							permissions: [],
							origins: [domainName[0]]
						}, function(result) {
							showSMMenuPopup(tab, result, domainName);
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
