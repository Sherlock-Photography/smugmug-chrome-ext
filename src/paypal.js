YUI().use(['node', 'json', 'io', 'event-resize', 'ss-event-log-widget', 'ss-paypal-button-manager',
           'ss-progress-bar', 'ss-api-smartqueue', 'model', 'event-valuechange'], function(Y) {
	var 
		nickname = chrome.extension.getBackgroundPage().nickname,
		pageDetails = chrome.extension.getBackgroundPage().pageDetails,
		smugDomain = nickname + ".smugmug.com",
		albumID = pageDetails.userNode.RemoteKey,
		eventLog = new Y.SherlockPhotography.EventLogWidget(),
		applyEventLog = new Y.SherlockPhotography.EventLogWidget(),
		imageListContainer = null,
		imageListSpinner = null;

	var 
		regFindInstalledPayPalCode = /<div class="ss-paypal-button">[\s\S]+?<\/div><div class="ss-paypal-button-end" style="display:none">\.?<\/div>/,
		regFindInstalledPayPalCodeGlobal = new RegExp(regFindInstalledPayPalCode.source, "g");
	
	var
		payPalCode = false,
		payPalCodeIsValid = false,
		buttonStyle = "paypal";
	
	if (!albumID) {
		alert("Whoops, this doesn't seem to be a gallery page. Please navigate back to the gallery you want to edit and try again.");
		window.close();
	}
	
	//Sorry, this is the best I can do on Chrome! (it doesn't allow User-Agent to be changed)
	Y.io.header('X-User-Agent', 'Unofficial SmugMug extension for Chrome v0.1 / I\'m in ur server, mogrifying ur data / n.sherlock@gmail.com');
	
	function syncImageUIState(buttonNode, image) {
		buttonNode.get('childNodes').remove();
		if (image.get('Caption').match(regFindInstalledPayPalCode)) {
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
				Y.SherlockPhotography.PayPalButtonManager.parsePayPalCode(payPalCode);
				payPalCodeIsValid = true;					
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
		
	/* Not to be used for security-critical purposes (not a sanitiser!) */
	function stripHTML(text) {
		return text.replace(/<\S[^><]*>/g, "");
	}
	
	function newlinesToSpaces(text) {
		return text.replace(/(\r\n|\n|\r)/gm, " ");
	}
	
	function customizePayPalCodeForImage(payPalCode, image) {
		var 
			link = image.get('WebUri'),
			caption, title, description;
		
		if (image.get("Caption")) {
			//Tidy up the caption by removing HTML and any old PayPal button code
			caption = image.get("Caption").replace(regFindInstalledPayPalCodeGlobal, '');
			caption = stripHTML(caption).trim();
			caption = newlinesToSpaces(caption);
		} else {
			caption = "";
		}
		
		if (image.get("Title")) {
			//Tidy up the title by removing HTML
			title = stripHTML(image.get("Title")).trim();
			title = newlinesToSpaces(title);
		} else {
			title = "";
		}
		
		if (title || caption) {
			if (title) {
				description = title + " / " + caption;	
			} else {
				description = caption;
			}
		} else {
			if (image.get("FileName")) {
				description = image.get("FileName");
			} else {
				description = link;
			}
		}
		
		var 
			renderedHTML = 
				Y.SherlockPhotography.PayPalButtonManager.renderPayPalButtons(payPalCode, buttonStyle, description, link)
					.replace(/(\r\n|\n|\r)/gm, "") /* SmugMug's codegen for tooltips will make every \n start a new line, and we don't want our tooltip that tall! */
					.replace(/  +|\t/g, " ")
					.trim()
					.replace("$FILENAME", Y.Escape.html(image.get("FileName"))),
						
			result = 
				'<div class="ss-paypal-button">' 
					+ renderedHTML
				+ '</div><div class="ss-paypal-button-end" style="display:none">';
			
		/* 
		 * A current bug in SmugMug means that a caption which has no text in it after HTML-removal does not get displayed 
		 * even when HTML code would be visible
		 */
		if (!caption && stripHTML(renderedHTML).trim().length == 0) {
			result += '.';
		}
		
		result += '</div>';
				
		return result;
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
				imagePayPalCode = customizePayPalCodeForImage(payPalCode, image),
				oldCaption = image.get('Caption'), 
				newCaption;
			
			if (oldCaption.match(regFindInstalledPayPalCode)) {
				newCaption = oldCaption.replace(regFindInstalledPayPalCode, imagePayPalCode);
			} else if (image.Caption == ""){
				newCaption = imagePayPalCode;
			} else {
				newCaption = oldCaption + "\n\n" + imagePayPalCode;
			}
			
			if (newCaption != oldCaption) {
				if (newCaption.match(regFindInstalledPayPalCode)) {
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
			var rendered = Y.SherlockPhotography.PayPalButtonManager.renderPayPalButtons(payPalCode, buttonStyle, 'Sample photo', 'http://example.com/');
			
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
			
			Y.all(".smugmug-gallery-name").set('text', pageDetails.userNode.Name);
			
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
			
			fetchPhotos();
		}
	});
});