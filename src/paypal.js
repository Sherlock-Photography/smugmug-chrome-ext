YUI().use(['node', 'json', 'io', 'event-resize', 'querystring-parse-simple', 'ss-event-log-widget', 'ss-paypal-button-manager',
           'ss-progress-bar', 'ss-api-smartqueue', 'model', 'event-valuechange', 'ss-csrf-manager'], function(Y) {
	var 
		query = Y.QueryString.parse(location.search.slice(1)),
		
		nickname = query.nickname,
		albumID = query.albumKey,
		albumName = query.albumName,
		apiKey = query.apiKey;
	
	if (!/^[a-zA-Z0-9]+$/.test(albumID) || !/^[a-zA-Z0-9-]+$/.test(nickname)) {
		alert("Bad arguments, please close this page and try again.");
		return;
	}

	var
		smugDomain = nickname + ".smugmug.com",
		eventLog = new Y.SherlockPhotography.EventLogWidget(),
		applyEventLog = new Y.SherlockPhotography.EventLogWidget(),
		imageListContainer = null,
		imageListSpinner = null,
	
		sampleImage = new Y.Model({
			WebUri: 'https://www.example.com/Example-gallery/i-laJ82c',
			Title: 'Example title',
			Caption: 'Example caption',
			FileName: 'example.jpg',
		});
	
	var
		payPalCode = false,
		payPalCodeIsValid = false,
		buttonStyle = "paypal";
		
	//Sorry, this is the best I can do on Chrome! (it doesn't allow User-Agent to be changed)
	Y.io.header('X-User-Agent', 'Unofficial SmugMug extension for Chrome v0.1 / I\'m in ur server, mogrifying ur data / n.sherlock@gmail.com');
	
	function syncImageUIState(buttonNode, image) {
		buttonNode.get('childNodes').remove();
		if (Y.SherlockPhotography.PayPalButtonManager.containsSSPayPalButton(image.get('Caption'))) {
			buttonNode.addClass("paypal");
			buttonNode.append('<span class="label label-info">Has button</span>');
		} else {
			buttonNode.removeClass("paypal");
		}		
	}
	
	function syncButtonStates() {
		var 
			selected = Y.all(".smugmug-image.selected");
		
		if (selected.size() && payPalCodeIsValid) {
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
	
	function renderImageNode(image) {
		var 
			rendered = Y.Node.create('<li class="smugmug-image" style="background-image: url(' + Y.Escape.html(image.get('ThumbnailUrl')) + ')"></li>');

		rendered.setData('image', image);

		image.after({
			CaptionChange: function() {
				syncImageUIState(rendered, image);
			}
		});
		
		syncImageUIState(rendered, image);
		
		return rendered;
	}
	
	function fetchPhotos() {
		imageListContainer.get('childNodes').remove();
		
		imageListSpinner.setStyle("display", "block");
		
		var queue = new Y.SherlockPhotography.APISmartQueue({
			processResponse: function(request, data) {
				if (data.Code == 200 && data.Response) {
					var response = data.Response;
					
					for (var index in response.AlbumImage) {
						var image = response.AlbumImage[index];
						
						//Sanity checks:
						if (!image.ThumbnailUrl || !image.WebUri || image.Caption === undefined)
							continue;
						
						var
							model = new Y.Model(image);
						
						imageListContainer.append(renderImageNode(model));
					}

					if (response.Pages && response.Pages.NextPage) {
						queue.enqueueRequest({
							url: 'https://' + smugDomain + response.Pages.NextPage,
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
			url: 'https://' + smugDomain + '/api/v2/album/' + albumID + '!images',
			data: {
				count: 100 /* Page size */
			},
			headers: {'Accept': 'application/json'}
		});
		
		queue.on({
			complete: function() {
				imageListSpinner.setStyle("display", "none");
			},
			requestFail: function(e) {
				eventLog.appendLog('error', "Failed to fetch a page, so this gallery listing is incomplete");
			},
			progress: function(progress) {
			}
		});
		
		queue.run();		
	}
		
	/**
	 * Check that the PayPal button code looks correct and update the globals payPalCodeIsValid and payPalButton with the details.
	 * 
	 * Returns true if the code is valid.
	 * 
	 * The UI is updated with error details to let the user know if the code is acceptable. 
	 */
	function validatePayPalCode() {
		var 
			code = Y.one("#paypal-button-code").get("value").trim(),
			statusDisplay = Y.one("#paypal-code-warning");
		
		payPalCode = false;
		payPalCodeIsValid = false;
		
		if (code) {
			if (Y.SherlockPhotography.PayPalButtonManager.buttonCodeIsHosted(code)) {
				statusDisplay.set('text', 'You must deselect the option to "save your button at PayPal" when you create your button.');
			} else if (Y.SherlockPhotography.PayPalButtonManager.buttonCodeIsEncrypted(code)){
				statusDisplay.set('text', 'You must click the link "remove code protection" that appears in the final stage of creating your button.');
			} else {
				payPalCode = Y.Node.create(code);
				
				if (payPalCode) {
					Y.SherlockPhotography.PayPalButtonManager.parsePayPalCode(payPalCode);
					
					payPalCodeIsValid = true;
				}
			}
			
			if (payPalCodeIsValid) {
				statusDisplay.setStyle('display', 'none');
			} else {
				statusDisplay.setStyle('display', 'block');
			}
		} else {
			statusDisplay.setStyle('display', 'none');
		}
		
		return payPalCodeIsValid;
	}
		
	function installPayPalButtons(images, payPalCode) {
		var 
			logProgress = applyEventLog.appendLog('info', "Adding PayPal buttons to selected photos..."),
			queue = new Y.SherlockPhotography.APISmartQueue({
				processResponse: function(request, data) {
					if (data.Response && data.Response.Image && data.Response.Image.Caption !== undefined) {
						//Update our model of the caption to the new caption the server ack'ed
						request.context.set('Caption', data.Response.Image.Caption);
					}
					
					return true;
				},
				responseType: 'json',
				retryPosts: true, //Since our requests are idempotent				
				delayBetweenRequests: 400
			});
		
		for (var index in images) {
			var 
				image = images[index],
				imagePayPalCode = Y.SherlockPhotography.PayPalButtonManager.customizePayPalCodeForImage(payPalCode, buttonStyle, image),
				oldCaption = image.get('Caption'), 
				newCaption;
			
			if (Y.SherlockPhotography.PayPalButtonManager.containsSSPayPalButton(oldCaption)) {
				newCaption = Y.SherlockPhotography.PayPalButtonManager.replaceSSPayPalButton(oldCaption, imagePayPalCode);
			} else if (image.Caption == ""){
				newCaption = imagePayPalCode;
			} else {
				newCaption = oldCaption + "\n\n" + imagePayPalCode;
			}
			
			if (newCaption != oldCaption) {
				if (Y.SherlockPhotography.PayPalButtonManager.containsSSPayPalButton(newCaption)) {
					queue.enqueueRequest({
						url: 'https://' + smugDomain + image.get('Uris').Image.Uri + '?_method=PATCH',
						method: 'POST',				
						data: JSON.stringify({
							Caption: newCaption,
							_token: Y.SherlockPhotography.CSRFManager.get('token')
						}),
						headers: {
							'Accept': 'application/json',
							'Content-Type': 'application/json'
						},
						context: image
					});
				} else {
					applyEventLog.appendLog('error', 'Generating button code for ' + image.get('WebUri') + ' failed, the photo was left unmodified.');
				}
			}
		}
		
		queue.on({
			complete: function() {
				logProgress.set('message', "Adding PayPal buttons to selected photos... done!");
				syncButtonStates();
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
			logProgress = applyEventLog.appendLog('info', "Removing PayPal buttons from selected photos..."),
			queue = new Y.SherlockPhotography.APISmartQueue({
				processResponse: function(request, data) {
					if (data.Response && data.Response.Image && data.Response.Image.Caption !== undefined) {
						//Update our model of the caption to the new caption the server ack'ed
						request.context.set('Caption', data.Response.Image.Caption);
					}
					
					return true;
				},
				responseType: 'json',
				retryPosts: true, //Since our requests are idempotent
				delayBetweenRequests: 400
			}),
			hadFailures = false;

		for (var index in images) {
			var 
				image = images[index],
				oldCaption = image.get('Caption'),
				newCaption;
						
			if (Y.SherlockPhotography.PayPalButtonManager.containsSSPayPalButton(oldCaption)) {
				newCaption = Y.SherlockPhotography.PayPalButtonManager.removeSSPayPalButtons(oldCaption);
			
				queue.enqueueRequest({
					url: 'https://' + smugDomain + image.get('Uris').Image.Uri + '?_method=PATCH',
					method: 'POST',				
					data: JSON.stringify({
						Caption: newCaption,
						_token: Y.SherlockPhotography.CSRFManager.get('token')
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
				if (hadFailures) {
					logProgress.set('message', "Some buttons were not removed due to a server error or timeout, please try again.");
				} else {
					logProgress.set('message', "Done!");
				}
				syncButtonStates();
			},
			requestFail: function(e) {
				hadFailures = true;
			},
			progress: function(progress) {
				logProgress.set('progress', progress);
			}
		});
	
		queue.run();
	}	
	
	function collectSelectedImageModels() {
		var images = [];
		
		Y.all(".smugmug-image.selected").each(function() {
			images.push(this.getData('image'));
		});
		
		return images;
	}
	
	function updateButtonPreview() {
		var 
			preview = Y.one("#paypal-button-preview");
		
		preview.get('childNodes').remove();

		if (payPalCode) {
			var rendered = Y.SherlockPhotography.PayPalButtonManager.customizePayPalCodeForImage(payPalCode, buttonStyle, sampleImage);
			
			preview.append(rendered);
			
			Y.one(".paypal-button-preview-pane").setStyle("display", "block");
		} else {
			Y.one(".paypal-button-preview-pane").setStyle("display", "none");			
		}
	}
	
	Y.on({
		domready: function () {
			eventLog.render('#eventLog');
			applyEventLog.render('#applyEventLog');

			imageListContainer = Y.one('#image-selector');
			imageListSpinner = Y.one('#image-selector-spinner');
			
			imageListContainer.delegate("click", function(e) {
				e.currentTarget.toggleClass('selected');
				
				syncButtonStates();
				
				e.preventDefault();
			}, ".smugmug-image");

			var textareaButtonCode = Y.one("#paypal-button-code");			
			
			textareaButtonCode.on({
				valuechange: function() {
					validatePayPalCode();
					
					updateButtonPreview();
					
					syncButtonStates();
				}
			});
			
			var selPayPalButtonStyle = Y.one("#paypal-button-style"); 
			
			selPayPalButtonStyle.on({
				change: function() {
					buttonStyle = selPayPalButtonStyle.get('value'); 
					
					updateButtonPreview();
					
					window.localStorage["payPalButtonTool.payPalButtonStyle"] = buttonStyle; 
				}
			});
			
			Y.one('#btn-apply').on({
				click: function(e) {
					validatePayPalCode();
					
					if (payPalCodeIsValid) {
						window.localStorage["payPalButtonTool.payPalCode"] = Y.one("#paypal-button-code").get("value").trim();
						
						applyEventLog.clear();						
						installPayPalButtons(collectSelectedImageModels(), payPalCode);
					}
					
					e.preventDefault();
				}
			});
			
			Y.one('#btn-remove').on({
				click: function(e) {
					applyEventLog.clear();
					removePayPalButtons(collectSelectedImageModels());
					
					e.preventDefault();
				}
			});	
			
			var directions = Y.one(".directions");
			
			Y.one("#btn-show-hide-instructions").on({
				click: function(e) {
					directions.toggleClass("collapsed");
			
					window.localStorage["payPalButtonTool.hideInstructions"] = directions.hasClass("collapsed") ? 1 : 0;
					
					e.preventDefault();
				}
			});
			
			Y.one("#btn-select-all").on({
				click: function(e) {
					Y.all("#image-selector .smugmug-image").addClass("selected");
					syncButtonStates();
				}
			});

			Y.one("#btn-select-none").on({
				click: function(e) {
					Y.all("#image-selector .smugmug-image.selected").removeClass("selected");
					syncButtonStates();
				}
			});
			
			Y.all(".smugmug-gallery-name").set('text', albumName);
			
			// Restore settings from local storage
			if (window.localStorage["payPalButtonTool.hideInstructions"] == 1) {
				directions.addClass("collapsed");
			}
			if (window.localStorage["payPalButtonTool.payPalButtonStyle"] !== undefined) {
				buttonStyle = window.localStorage["payPalButtonTool.payPalButtonStyle"];
				selPayPalButtonStyle.set("value", buttonStyle);
			}
			if (window.localStorage["payPalButtonTool.payPalCode"] !== undefined) {
				textareaButtonCode.set('value', window.localStorage["payPalButtonTool.payPalCode"]);
				
				validatePayPalCode();
				updateButtonPreview();
			}
			
			Y.SherlockPhotography.CSRFManager.start(smugDomain, apiKey, function(token) {
				if (token) {
					fetchPhotos();
				} else {
					alert("Failed to connect to your SmugMug site! Please press refresh to try again.");
				}
			});
		}
	});
});