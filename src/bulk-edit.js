YUI().use(['node', 'json', 'io', 'event-resize', 'querystring-parse-simple', 'ss-event-log-widget',
           'ss-progress-bar', 'ss-api-smartqueue', 'model', 'event-valuechange'], function(Y) {
	var 
		query = Y.QueryString.parse(location.search.slice(1)),
		
		nickname = query.nickname,
		albumID = query.albumKey,
		albumName = query.albumName,
		token = query.token,
		
		smugDomain = nickname + ".smugmug.com";

	var
		eventLog = new Y.SherlockPhotography.EventLogWidget(),
		applyEventLog = new Y.SherlockPhotography.EventLogWidget(),
		imageListContainer = null,
		imageListSpinner = null;

	if (!/^[a-zA-Z0-9]+$/.test(albumID) || !/^[a-zA-Z0-9-]+$/.test(nickname)) {
		alert("Bad arguments, please close this page and try again.");
		return;
	}
	
	var BulkEditTool = Y.Base.create(
		'bulkEditTool',
		Y.Base,
		[],
		{
			_renderImageRow: function(image) {
				console.log(image);
				var 
					rendered = Y.Node.create('<tr class="smugmug-image"></tr>'),
					
					imageCell = Y.Node.create('<td><div class="thumbnail">'
							+ '<a href="#"><img src="' + Y.Escape.html(image.ThumbnailUrl) + '"/></a>'
							+ '<div class="caption">' 
							+ '<div class="filename">' + Y.Escape.html(image.FileName) + '</div>'
							/*+ Y.Escape.html(image.get('OriginalWidth')) + "x" + Y.Escape.html(image.get('OriginalHeight'))*/
							+ '</div></div></td>'),
					
					title = Y.Node.create('<td><input type="text" class="form-control photo-title" value="' + Y.Escape.html(image.Title) + '"></td>'),
					caption = Y.Node.create('<td><textarea rows="6" class="form-control photo-caption">' + Y.Escape.html(image.Caption) + '</textarea></td>'),
					keywords = Y.Node.create('<td><textarea rows="6" class="form-control photo-keywords">' + Y.Escape.html(image.Keywords) + '</textarea></td>');

				rendered.append(imageCell);
				rendered.append(title);
				rendered.append(caption);
				rendered.append(keywords);
				
				rendered.setData('image', image);
				
				return rendered;
			},
			
			fetchPhotos: function() {
				var 
					that = this,
					images = [],
					imageListContainer = this.get('imageListContainer'),
					imageListSpinner = this.get('imageListSpinner');
				
				imageListContainer.get('childNodes').remove();
				
				imageListContainer.append('<tr><th>&nbsp;</th><th>Title</th><th>Caption</th><th>Keywords</th></tr>');
				
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
								
								images.push(image);
								
								imageListContainer.append(that._renderImageRow(image));
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
					delayBetweenRequests: 0
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
						
						that.set('images', images);
						that.set('selectedCount', 0);
					},
					requestFail: function(e) {
						eventLog.appendLog('error', "Failed to fetch a page, so this gallery listing is incomplete");
					},
					progress: function(progress) {
					}
				});
				
				queue.run();		
			},
				
			_saveChanges: function(changes) {
				var 
					logProgress = applyEventLog.appendLog('info', "Saving changes to selected photos..."),
					queue = new Y.SherlockPhotography.APISmartQueue({
						processResponse: function(request, data) {
							if (data.Response && data.Response.Image && data.Response.Image.Caption !== undefined) {
								//Update our model of the caption to the new caption the server ack'ed
								request.context.Caption = data.Response.Image.Caption;
							}
							
							return true;
						},
						responseType: 'json',
						retryPosts: true, //Since our requests are idempotent				
						delayBetweenRequests: 400
					}),
					that = this;
				
				for (var index in changes) {
					var 
						change = changes[index],
						data = {
							_token: token
						};
					
					// Don't try to send the image object to the server, just the field changes we requested
					for (var key in change) {
						if (key != 'image') {
							data[key] = change[key];
						}
					}
					
					queue.enqueueRequest({
						url: 'http://' + smugDomain + change.image.get('Uris').Image.Uri + '?_method=PATCH',
						method: 'POST',				
						data: JSON.stringify(data),
						headers: {
							'Accept': 'application/json',
							'Content-Type': 'application/json'
						},
						context: image
					});
				}
				
				queue.on({
					complete: function() {
						logProgress.set('message', "Adding PayPal buttons to selected photos... done!");
						that.set('unsavedChanges', false);
					},
					requestFail: function(e) {
						//eventLog._logError("Failed to fetch site themes");
					},
					progress: function(progress) {
						logProgress.set('progress', progress);
					}
				});
			
				queue.run();
			},
			
			_collectImageChanges:function() {
				var changes = [];
				
				Y.all(".smugmug-image").each(function() {
					var
						image = this.getData('image'),
						caption = this.one('.photo-caption').get('value'),
						title = this.one('.photo-title').get('value'),
						keywords = this.one('.photo-keywords').get('value');

						hasChanges = false,
					
						change = {
							image: image
						};
				
					if (image.Caption != caption) {
						change.Caption = caption;
						hasChanges = true;
					}
					
					if (image.Title != title) {
						change.Title = title;
						hasChanges = true;
					}
					
					if (image.Keywords != keywords) {
						change.Keywords = keywords;
						hasChanges = true;
					}
					
					if (hasChanges) {				
						changes.push(change);
					}
				});
						
				return changes;
			},
			
			saveChanges:function() {
				this.get('applyEventLog').clear();
				
				var changes = this._collectImageChanges();
				
				console.log(changes);
				
				//this._saveChanges(changes);
			},
			
			initializer: function(cfg) {
				var that = this;
				
				this.after('unsavedChangesChange', function() {
					if (this.get('unsavedChanges')) {
						Y.one('#btn-apply').removeAttribute("disabled");
					} else {
						Y.one('#btn-apply').setAttribute("disabled", "disabled");
					}					
				});
				
				this.get('imageListContainer').delegate('click', function(e) {
					var parent = this.ancestor('.smugmug-image');
					
					if (parent.hasClass('selected')) {
						parent.removeClass('selected');
						that.set('selectedCount', that.get('selectedCount') - 1);
					} else {
						parent.addClass('selected');
						that.set('selectedCount', that.get('selectedCount') + 1);
					}
					
					e.preventDefault();
				}, 'a');

				this.get('imageListContainer').delegate('valuechange', function() {
					this.set('unsavedChanges', true);
				}, 'input, textarea');
				
				this.after('selectedCountChange', function(e) {
					Y.one(".photo-select-count").set('text', e.newVal + " of " + that.get('images').length + " are selected");
					Y.one(".photo-select-count").setStyle('visibility', 'visible');
				});				
			}
		},
		{
			ATTRS: {
				images: {
					value: null
				},
				
				selectedCount: {
					value: null
				},
				
				unsavedChanges: {
					value: false
				},
				
				eventLog: {
					value: null,
					setter: Y.one
				},
				
				applyEventLog: {
					value: null,
					setter: Y.one
				},

				imageListContainer: {
					value: null,
					setter: Y.one
				},
				
				imageListSpinner: {
					value: null,
					setter: Y.one
				}
			}
		}
	);

	//Sorry, this is the best I can do on Chrome! (it doesn't allow User-Agent to be changed)
	Y.io.header('X-User-Agent', 'Unofficial SmugMug extension for Chrome v0.1 / I\'m in ur server, mogrifying ur data / n.sherlock@gmail.com');
	
	
	Y.on({
		domready: function() {
			
			var bulkEditTool = new BulkEditTool({
				eventLog: "#eventLog",
				applyEventLog: "#applyEventLog",
				
				imageListContainer: "#image-selector",
				imageListSpinner: "#image-selector-spinner",
			});
			
			Y.one('#btn-apply').on({
				click: function(e) {
					bulkEditTool.saveChanges();
					
					e.preventDefault();
				}
			});
			
			Y.all(".smugmug-gallery-name").set('text', albumName);

			bulkEditTool.fetchPhotos();
		}
	});
});