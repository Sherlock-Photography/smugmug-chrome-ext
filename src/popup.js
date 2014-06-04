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
					chrome.tabs.create({
						url: 'http://' + domainName[1] + '/photos/tools.mg?pageType=Album&tool=bulkcaption&AlbumID=' + encodeURIComponent(siteDetail.pageDetails.userNode.RemoteID)
							+ '&AlbumKey=' + encodeURIComponent(siteDetail.pageDetails.userNode.RemoteKey)
							+ '&url='+ encodeURIComponent(tab.url)
					});
					
					return false;
				};
				
				var bulkEditBeta = document.getElementById("bulk-edit-beta");
				
				bulkEditBeta.onclick = function(e) {
					chrome.tabs.create({
						url: 'bulk-edit.html?nickname=' + encodeURIComponent(siteDetail.nickname)
							+ '&albumKey=' + encodeURIComponent(siteDetail.pageDetails.userNode.RemoteKey)
							+ '&albumName=' + encodeURIComponent(siteDetail.pageDetails.userNode.Name)
					});
					
					return false;
				};
				
				document.getElementById("just-this-page").style.display = "block";
				
				document.getElementById("edit-thumbnails").onclick = function(e) {

					//Attempt to parse the key of the currently selected photo out of the URL, so we can crop that photo
					
					var 
						matches = tab.url.match(/^http:\/\/[^\/]+(\/.*?)(?:\/i-([a-zA-Z0-9]+))?(?:\/(A|S|M|L|XL|X2|X3|320|640|960|1280|1920|O|Buy))?(\?[^#]*)?(#.*)?$/),
						
						match_gallery_url = matches[1],
						match_image_key = matches[2],
						match_lightbox_size = matches[3];
					
					// Ensure gallery URL ends in a slash
					if (match_gallery_url && !match_gallery_url.match(/\/$/)) {
						match_gallery_url += '/';
					}
					
					function report_crop_thumbnail_tool_error(message) {
						if (message === undefined) {
							message = "Failed to look up details about that photo in order to crop it, please try again.";
						}
						
						document.getElementById("edit-thumbnails-error").innerText = message;
					}
					
					function open_crop_thumbnail_tool(imageID, imageKey) {
						chrome.tabs.update({
							url: 'http://' + domainName[1] + '/photos/tools/crop.mg?' +
								'ImageID=' + encodeURIComponent(imageID) +
								'&ImageKey=' + encodeURIComponent(imageKey) +
								'&tool=newthumb' +
								'&url=' + encodeURIComponent('http://' + domainName[1] + match_gallery_url + '#!i=' + imageID + '&k=' + imageKey)
						});
						
						window.close();
					}					

					//Clear error message
					report_crop_thumbnail_tool_error("");
					
					YUI().use(['io'], function(Y) {
						if (match_image_key) {
							//Identify the image ID to go with the key of the selected image we identified
							
							Y.io('http://' + domainName[1] + '/api/v2/image!imagekeylookup?_filter=UploadKey&_shorturis=', {
								method: 'GET',
								headers: {
									'Accept': 'application/json'
								},
								data: {
									imagekey: match_image_key
								},
								on: {
									success: function(transactionid, response, arguments) {
										try {
											var data = JSON.parse(response.responseText);
											
											open_crop_thumbnail_tool(data.Response.Image.UploadKey, match_image_key);
										} catch (e) {
											report_crop_thumbnail_tool_error();
										}									
									},
									failure: function() {
										report_crop_thumbnail_tool_error();
									}
								}
							});
						} else {
							//We don't have a photo open, so just crop the first photo in the album
							
							Y.io('http://' + domainName[1] + '/api/v2/album/' + siteDetail.pageDetails.userNode.RemoteKey + '!images?count=1&_filter=UploadKey,Uri&_shorturis=', {
								method: 'GET',
								headers: {
									'Accept': 'application/json'
								},
								on: {
									success: function(transactionid, response, arguments) {
										try {
											var data = JSON.parse(response.responseText);
											
											if (data.Response.AlbumImage) {
												open_crop_thumbnail_tool(data.Response.AlbumImage[0].UploadKey, data.Response.AlbumImage[0].Uri.match(/\/([a-zA-Z0-9]+)(-\d+)?$/)[1]);
											} else {
												report_crop_thumbnail_tool_error("This gallery seems to be empty, no thumbnails found to crop.");												
											}
										} catch (e) {
											report_crop_thumbnail_tool_error();
										}									
									},
									failure: function() {
										report_crop_thumbnail_tool_error();
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
