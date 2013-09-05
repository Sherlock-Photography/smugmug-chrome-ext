YUI().use(['node', 'json', 'io', 'event-resize', 'ss-event-log-widget',  
           'ss-progress-bar', 'ss-api-smartqueue'], function(Y) {
	var 
		smugNickname = 'n-sherlock',
		smugDomain = smugNickname + ".smugmug.com",
		albumID = '7KrTxZ',
		eventLog = new Y.SherlockPhotography.EventLogWidget(),
		images = [],
		imageListContainer = null;
	
	//Sorry, this is the best I can do on Chrome! (it doesn't allow User-Agent to be changed)
	Y.io.header('X-User-Agent', 'Unofficial SmugMug extension for Chrome v0.1 / I\'m in ur server, mogrifying ur data / n.sherlock@gmail.com');
	
	function enumeratePhotos() {
		var 
			logProgress = eventLog.appendLog('info', "Finding photos in this gallery...");
		
		imageListContainer.get('children').remove();
		
		var queue = new Y.SherlockPhotography.APISmartQueue({
			processResponse: function(request, data) {
				if (data.Code == 200 && data.Response) {
					var response = data.Response;
					
					for (var index in response.AlbumImage) {
						var image = response.AlbumImage[index];
						
						var rendered = Y.Node.create('<li><a class="smugmug-image" href="#" style="background-image: url(' + image.ThumbnailUrl + ')"></a></li>');
						
						rendered.one('a').setData('image', image);
						
						imageListContainer.append(rendered);
					}

					if (response.Pages && response.Pages.NextPage) {
						queue.enqueueRequest({
							url: 'http://' + smugDomain + response.Pages.NextPage,
							headers: {'Accept': 'application/json'}
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
				//eventLog._logError("Failed to fetch site themes");
			},
			progress: function(progress) {
				logProgress.set('progress', progress);
			}
		});
		
		queue.run();		
	}
	
	function installPayPalButtons() {
		var 
			nodes = Y.all(".smugmug-image.selected");

		if (!nodes.size()) {
			return;
		}
		
		var 
			logProgress = eventLog.appendLog('info', "Adding PayPal buttons to selected photos..."),
			queue = new Y.SherlockPhotography.APISmartQueue({
				processResponse: function(request, data) {
					if (data.Code == 200 && data.Response) {
						var response = data.Response;
						
						for (var index in response.AlbumImage) {
							var image = response.AlbumImage[index];
							
							var rendered = Y.Node.create('<li><a class="smugmug-image" href="#" style="background-image: url(' + image.ThumbnailUrl + ')"></a></li>');
							
							rendered.setData('image', image);
							
							imageListContainer.append(rendered);
						}
					}
					return true;
				},
				responseType: 'json',
				delayBetweenRequests: 100
			});

		nodes.each(function(node) {
			var image = node.getData('image');
			
			queue.enqueueRequest({
				url: 'http://' + smugDomain + image.Uris.Image.Uri + '?_method=PATCH',
				method: 'POST',				
				data: JSON.stringify({
					Caption: image.Caption + "lol"
				}),
				headers: {
					'Accept': 'application/json',
					'Content-Type': 'application/json'
				}
			});			
		});
		
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
	
	Y.on({
		domready: function () {
			eventLog.render('#eventLog');

			imageListContainer = Y.one('.smugmug-images');
			
			imageListContainer.delegate("click", function(e) {
				e.currentTarget.toggleClass('selected');
				
				e.preventDefault();
			}, ".smugmug-image");

			Y.one('#btn-apply').on({
				click: function(e) {
					installPayPalButtons();
					
					e.preventDefault();
				}
			});
			
			enumeratePhotos();
		}
	});
});