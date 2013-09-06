YUI().use(['node', 'json', 'io', 'event-resize', 'ss-event-log-widget',  
           'ss-progress-bar', 'ss-api-smartqueue', 'model'], function(Y) {
	var 
		nickname = chrome.extension.getBackgroundPage().nickname,
		pageDetails = chrome.extension.getBackgroundPage().pageDetails,
		smugDomain = nickname + ".smugmug.com",
		albumID = pageDetails.userNode.RemoteKey,
		eventLog = new Y.SherlockPhotography.EventLogWidget(),
		imageListContainer = null;

	var 
		regPayPalItemNameField = /<input type="hidden" name="item_name" value="[^"]*">/,
		regFindInstalledPayPalCode = /<div class="ss-paypal-button">[\s\S]+?<\/div>/, //Yeah, I know, Zalgo and all that.
		regFindInstalledPayPalCodeGlobal = new RegExp(regFindInstalledPayPalCode.source, "g"); 	
	
	//Sorry, this is the best I can do on Chrome! (it doesn't allow User-Agent to be changed)
	Y.io.header('X-User-Agent', 'Unofficial SmugMug extension for Chrome v0.1 / I\'m in ur server, mogrifying ur data / n.sherlock@gmail.com');
	
	function syncButtonState(buttonNode, image) {
		buttonNode.get('childNodes').remove();
		if (image.get('Caption').match(regFindInstalledPayPalCode)) {
			buttonNode.addClass("paypal");
			buttonNode.append('<span class="label label-info">Has button</span>');
		} else {
			buttonNode.removeClass("paypal");
		}		
	}
	
	function renderImageNode(image) {
		var 
			rendered = Y.Node.create('<li class="smugmug-image" style="background-image: url(' + Y.Escape.html(image.get('ThumbnailUrl')) + ')"></li>');

		rendered.setData('image', image);

		image.after({
			CaptionChange: function() {
				syncButtonState(rendered, image);
			}
		});
		
		syncButtonState(rendered, image);
		
		return rendered;
	}
	
	function fetchPhotos() {
		var 
			logProgress = eventLog.appendLog('info', "Finding photos in this gallery...");
		
		imageListContainer.get('childNodes').remove();
		
		var queue = new Y.SherlockPhotography.APISmartQueue({
			processResponse: function(request, data) {
				if (data.Code == 200 && data.Response) {
					var response = data.Response;
					
					for (var index in response.AlbumImage) {
						var image = response.AlbumImage[index];
						
						//Sanity checks:
						if (!image.ThumbnailUrl || image.Caption === undefined)
							continue;
						
						var
							model = new Y.Model(image);
						
						imageListContainer.append(renderImageNode(model));
					}

					if (response.Pages && response.Pages.NextPage) {
						queue.enqueueRequest({
							url: 'http://' + smugDomain + response.Pages.NextPage,
							headers: {'Accept': 'application/json'},
						});
						queue.run();
					}
				}
				return true;
			},
			responseType: 'json',
			delayBetweenRequests: 500
		});
		
		queue.enqueueRequest({
			url: 'http://' + smugDomain + '/api/v2/album/' + albumID + '!images',
			data: {
				count: 100 /* Page size */
			},
			headers: {'Accept': 'application/json'}
		});
		
		queue.on({
			complete: function() {
				logProgress.set('message', "Finding photos in this gallery... done!");
			},
			requestFail: function(e) {
				eventLog.appendLog('error', "Failed to fetch a page, gallery listing is incomplete");
			},
			progress: function(progress) {
				logProgress.set('progress', progress);
			}
		});
		
		queue.run();		
	}
		
	/**
	 * Does the PayPal button code look correct? 
	 */
	function validatePayPalCode(code) {
		return code && code.match(regPayPalItemNameField);
	}
	
	function preparePayPalCode(code) {
		return '<div class="ss-paypal-button">' + code + '</div>';
	}
	
	function customizePayPalCodeForImage(payPalCode, image) {
		return payPalCode.replace(regPayPalItemNameField, '<input type="hidden" name="item_name" value="' + Y.Escape.html(image.get('WebUri')) + '">');
	}
		
	function installPayPalButtons(images, payPalCode) {
		var 
			logProgress = eventLog.appendLog('info', "Adding PayPal buttons to selected photos..."),
			queue = new Y.SherlockPhotography.APISmartQueue({
				processResponse: function(request, data) {
					if (data.Response && data.Response.Image && data.Response.Image.Caption !== undefined) {
						//Update our model of the caption to the new caption the server ack'ed
						request.context.set('Caption', data.Response.Image.Caption);
					}
				},
				responseType: 'json',
				retryPosts: true, //Since our requests are idempotent				
				delayBetweenRequests: 100
			});
		
		for (var index in images) {
			var 
				image = images[index],
				imagePayPalCode = customizePayPalCodeForImage(payPalCode, image),
				oldCaption = image.get('Caption'), 
				newCaption;
			
			if (oldCaption.match(regFindInstalledPayPalCode)) {
				newCaption = oldCaption.replace(regFindInstalledPayPalCode, imagePayPalCode);
			} else if (image.Caption == ""){
				newCaption = imagePayPalCode;
			} else {
				newCaption = oldCaption + "\n" + imagePayPalCode;
			}
			
			if (newCaption != oldCaption) {
				queue.enqueueRequest({
					url: 'http://' + smugDomain + image.get('Uris').Image.Uri + '?_method=PATCH',
					method: 'POST',				
					data: JSON.stringify({
						Caption: newCaption
					}),
					headers: {
						'Accept': 'application/json',
						'Content-Type': 'application/json'
					},
					context: image
				});
			}
		}
		
		queue.on({
			complete: function() {
				logProgress.set('message', "Adding PayPal buttons to selected photos... done!");
			},
			requestFail: function(e) {
				//eventLog._logError("Failed to fetch site themes");
			},
			progress: function(progress) {
				logProgress.set('progress', progress);
			}
		});
	
		queue.run();
	}
	
	function removePayPalButtons(images) {
		var 
			logProgress = eventLog.appendLog('info', "Removing PayPal buttons from selected photos..."),
			queue = new Y.SherlockPhotography.APISmartQueue({
				processResponse: function(request, data) {
					if (data.Response && data.Response.Image && data.Response.Image.Caption !== undefined) {
						//Update our model of the caption to the new caption the server ack'ed
						request.context.set('Caption', data.Response.Image.Caption);
					}
				},
				responseType: 'json',
				retryPosts: true, //Since our requests are idempotent
				delayBetweenRequests: 100
			});
		

		for (var index in images) {
			var 
				image = images[index],
				oldCaption = image.get('Caption'),
				newCaption;
						
			if (oldCaption.match(regFindInstalledPayPalCodeGlobal)) {
				newCaption = oldCaption.replace(regFindInstalledPayPalCodeGlobal, '');
			
				queue.enqueueRequest({
					url: 'http://' + smugDomain + image.get('Uris').Image.Uri + '?_method=PATCH',
					method: 'POST',				
					data: JSON.stringify({
						Caption: newCaption
					}),
					headers: {
						'Accept': 'application/json',
						'Content-Type': 'application/json'
					},
					context: image
				});
			}
		}
		
		queue.on({
			complete: function() {
				logProgress.set('message', "Removing PayPal buttons from selected photos... done!");
			},
			requestFail: function(e) {
				//eventLog._logError("Failed to fetch site themes");
			},
			progress: function(progress) {
				logProgress.set('progress', progress);
			}
		});
	
		queue.run();
	}	
	
	function updateButtonStates() {
		var 
			selected = Y.all(".smugmug-image.selected"),
			hasPayPalCode = validatePayPalCode(Y.one("#buynow-button-code").get("value"));
		
		if (selected.size() && hasPayPalCode) {
			Y.one('#btn-apply').removeAttribute("disabled");
		} else {
			Y.one('#btn-apply').setAttribute("disabled", "disabled");
		}
		
		if (selected.size() && selected.filter(".paypal").size()) {
			Y.one('#btn-remove').removeAttribute("disabled");
		} else {
			Y.one('#btn-remove').setAttribute("disabled", "disabled");				
		}
	}
	
	function collectSelectedImageModels() {
		var images = [];
		
		Y.all(".smugmug-image.selected").each(function() {
			images.push(this.getData('image'));
		});
		
		return images;
	}
	
	Y.on({
		domready: function () {
			eventLog.render('#eventLog');

			imageListContainer = Y.one('.smugmug-images');
			
			imageListContainer.delegate("click", function(e) {
				e.currentTarget.toggleClass('selected');
				
				updateButtonStates();
				
				e.preventDefault();
			}, ".smugmug-image");

			Y.one("#buynow-button-code").after({
				valueChange: function(e) {
					updateButtonStates();
				}
			});
			
			Y.one('#btn-apply').on({
				click: function(e) {
					var payPalCode = Y.one('#buynow-button-code').get('value');
					
					if (validatePayPalCode(payPalCode)) {
						payPalCode = preparePayPalCode(payPalCode);

						installPayPalButtons(collectSelectedImageModels(), payPalCode);
					}
					
					e.preventDefault();
				}
			});
			
			Y.one('#btn-remove').on({
				click: function(e) {
					removePayPalButtons(collectSelectedImageModels());
					
					e.preventDefault();
				}
			});			
			
			fetchPhotos();
		}
	});
});