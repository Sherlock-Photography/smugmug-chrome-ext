YUI().use(['node', 'json', 'io', 'event-resize', 'querystring-parse-simple', 'ss-event-log-widget',
           'ss-progress-bar', 'ss-api-smartqueue', 'model', 'event-valuechange', 'node-event-simulate',
           'anim', 'ss-csrf-manager'], function(Y) {

	function preg_quote( str ) {
	    // http://kevin.vanzonneveld.net
	    // +   original by: booeyOH
	    // +   improved by: Ates Goral (http://magnetiq.com)
	    // +   improved by: Kevin van Zonneveld (http://kevin.vanzonneveld.net)
	    // +   bugfixed by: Onno Marsman
	    // *     example 1: preg_quote("$40");
	    // *     returns 1: '\$40'
	    // *     example 2: preg_quote("*RRRING* Hello?");
	    // *     returns 2: '\*RRRING\* Hello\?'
	    // *     example 3: preg_quote("\\.+*?[^]$(){}=!<>|:");
	    // *     returns 3: '\\\.\+\*\?\[\^\]\$\(\)\{\}\=\!\<\>\|\:'

	    return (str+'').replace(/([\\\.\+\*\?\[\^\]\$\(\)\{\}\=\!\<\>\|\:])/g, "\\$1");
	}
	
	var 
		query = Y.QueryString.parse(location.search.slice(1)),
		
		nickname = query.nickname,
		albumID = query.albumKey,
		albumName = query.albumName,
		
		smugDomain = nickname + ".smugmug.com",
		
		STATUS_CHANGE_EYECATCH_DURATION = 0.33;

	if (!/^[a-zA-Z0-9]+$/.test(albumID) || !/^[a-zA-Z0-9-]+$/.test(nickname)) {
		alert("Bad arguments, please close this page and try again.");
		return;
	}
	
	var BulkEditTool = Y.Base.create(
		'bulkEditTool',
		Y.Base,
		[],
		{
			_eventLog: null,
			_applyEventLog: null,
			
			_renderImageRow: function(image) {
				//console.log(image);
				var 
					rendered = Y.Node.create('<tr class="smugmug-image"></tr>'),
					
					imageCell = Y.Node.create('<td><div class="thumbnail">'
							+ '<a href="#"><img src="' + Y.Escape.html(image.ThumbnailUrl) + '"/></a>'
							+ '<div class="caption">' 
							+ '<div class="filename">' + Y.Escape.html(image.FileName) + '</div>'
							/*+ Y.Escape.html(image.get('OriginalWidth')) + "x" + Y.Escape.html(image.get('OriginalHeight'))*/
							+ '</div></div></td>'),
					
					title = Y.Node.create('<td><input type="text" class="form-control photo-Title" value="' + Y.Escape.html(image.Title) + '"></td>'),
					caption = Y.Node.create('<td><textarea rows="6" class="form-control photo-Caption">' + Y.Escape.html(image.Caption) + '</textarea></td>'),
					keywords = Y.Node.create('<td><textarea rows="6" class="form-control photo-Keywords">' + Y.Escape.html(image.Keywords) + '</textarea></td>');

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
					imageListSpinner = this.get('imageListSpinner'),
					failures = 0;
				
				imageListContainer.get('childNodes').remove();
				imageListContainer.append('<tr><th>&nbsp;</th><th width="30%">Title</th><th width="35%">Caption</th><th width="25%">Keywords <small>(separate with semicolons)</small></th></tr>');
				
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
					url: 'http://' + smugDomain + '/api/v2/album/' + albumID + '!images?_filter=Uri,ThumbnailUrl,Caption,Keywords,Title,FileName,WebUri&_shorturis=',
					data: {
						count: 100 /* Page size */
					},
					headers: {'Accept': 'application/json'}
				});
				
				queue.on({
					complete: function() {
						if (failures > 0) {
							that._eventLog.appendLog('error', "Failed to fetch a page of photos, so this gallery listing is incomplete. Press refresh to try again.");
						}

						imageListSpinner.setStyle("display", "none");
						
						that.set('images', images);
						that._set('selectedCount', 0);
						
						that.fire('ready');
					},
					requestFail: function(e) {
						failures++;
					},
					progress: function(progress) {
					}
				});
				
				queue.run();		
			},
				
			_saveChanges: function(changes) {
				this._set('saving', true);
				this._applyEventLog.clear();
				
				var 
					logProgress = this._applyEventLog.appendLog('info', "Saving to SmugMug..."),
					
					queue = new Y.SherlockPhotography.APISmartQueue({
						processResponse: function(request, data) {
							if (data.Response && data.Response.Image) {
								var ackedImage = data.Response.Image;
								
								//Update our local model of the image with the data the server ack'ed
								for (var fieldName in request.context) {
									if (fieldName != 'image' && fieldName != 'node' && ackedImage[fieldName] !== undefined) {
										request.context.image[fieldName] = ackedImage[fieldName];
										request.context.node.one(".photo-" + fieldName).set('value', ackedImage[fieldName]);
									}
								}
							}
							
							return true;
						},
						responseType: 'json',
						retryPosts: true, //Since our requests are idempotent				
						delayBetweenRequests: 0 //We will let the browser's per-domain name limits do the rate-limiting for us
					}),
					errorCount = 0,
					that = this;
				
				for (var index in changes) {
					var 
						change = changes[index],
						data = {
							_token: Y.SherlockPhotography.CSRFManager.get('token')
						};
					
					// Don't try to send the image object to the server, just the field changes we requested
					for (var key in change) {
						if (key != 'image' && key != 'node') {
							data[key] = change[key];
						}
					}
					
					queue.enqueueRequest({
						url: 'http://' + smugDomain + change.image.Uris.Image + '?_method=PATCH',
						method: 'POST',				
						data: JSON.stringify(data),
						headers: {
							'Accept': 'application/json',
							'Content-Type': 'application/json'
						},
						context: change
					});
				}
				
				queue.on({
					complete: function() {
						if (errorCount > 0) {
							logProgress.destroy(true);
							
							that._applyEventLog.appendLog('error', errorCount + "/" + changes.length + " failed to save\nPlease try again");
						} else {
							if (changes.length == 0)
								logProgress.set('message', "Saved photos");
							else
								logProgress.set('message', "Saved " + changes.length + (changes.length == 1 ? " photo" : " photos"));
							
							logProgress.set('progress', null);
							
							setTimeout(function() {
								var anim = new Y.Anim({
									node: logProgress.get('element'),
									to: {opacity: 0},
									duration: STATUS_CHANGE_EYECATCH_DURATION
								});
								
								anim.on('end', function() {
									logProgress.destroy();
								});
								
								anim.run();
							}, 5000);
							
							that._set('unsavedChanges', false);
						}
						
						that._set('saving', false);						
					},
					requestFail: function(e) {
						errorCount++;
					},
					progress: function(progress) {
						logProgress.set('progress', progress);
					}
				});
			
				queue.run();
			},
			
			_updateSaveButtonState: function() {
				if (this.get('saving') || !this.get('unsavedChanges')) { 
					this.get('saveButton').setAttribute("disabled", "disabled");
				} else {
					this.get('saveButton').removeAttribute("disabled");
				}					
			},
			
			_collectImageChanges:function() {
				var changes = [];
				
				Y.all(".smugmug-image").each(function() {
					var
						image = this.getData('image'),
						caption = this.one('.photo-Caption').get('value'),
						title = this.one('.photo-Title').get('value'),
						keywords = this.one('.photo-Keywords').get('value');

						hasChanges = false,
					
						change = {
							image: image,
							node: this
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
			
			selectAll: function() {
				var photos = this.getAllPhotos();
				
				photos.addClass('selected');
				this._set('selectedCount', photos.size());
			},
			
			deselectAll: function() {
				this.getSelectedPhotos().removeClass('selected');
				this._set('selectedCount', 0);
			},

			invertSelection: function() {
				var 
					unSelected = this.get('imageListContainer').all('.smugmug-image:not(.selected)'),
					selected = this.get('imageListContainer').all('.smugmug-image.selected');
				
				unSelected.addClass('selected');
				selected.removeClass('selected');
				
				this._set('selectedCount', unSelected.size());
			},
			
			/**
			 * Apply the bulk edit defined by action/text/replace on the `fieldName` field of the given array of photo nodes.
			 * 
			 * photos: You can pass NodeLists of photos from getAllPhotos(), getSelectedPhotos(), or findPhotos(). Or pass null and all photos will be edited. 
			 */
			bulkEditPhotos: function(photos, fieldName, action, text, replace) {
				var 
					that = this,
					changeCount = 0,
					keywordsEndInSeparator = /([,;]|^)(\s*)$/,
					endsInWhitespace = /(^|\s)$/,
					
					findUserSearchText = new RegExp(preg_quote(text), 'gi'),
					findUserSearchKeyword = new RegExp('(^|[,;])\\s*' + preg_quote(text) + '\\s*([,;]|$)', 'gi');
				
				if (photos == null) {
					photos = this.getAllPhotos();
				}
				
				photos.each(function(photo) {
					var 
						targetNode = photo.one('.photo-' + fieldName),
						originalValue = targetNode.get('value'),
						value = targetNode.get('value'),
						matches;
					
					switch (action) {
						case 'add':
							if (fieldName == 'Keywords') {
								if (!value.match(findUserSearchKeyword)) {  
									if (matches = value.match(keywordsEndInSeparator)) {
										if (matches[2].length) {
											value = value + text;
										} else {
											value = value + ' ' + text;
										}
									} else {
										value = value + '; ' + text;
									}
								}
							} else if (value.match(endsInWhitespace)) {
								value = value + text;
							} else {
								value = value + ' ' + text;
							}
						break;
						case 'remove':
							if (fieldName == 'Keywords') {
								//If the removed text forms a complete keyword, remove it along with the trailing separator for the keyword:								
								value = value.replace(findUserSearchKeyword, '$1');
							}
							
							//Now remove any partial matches (since SM's old tool did this):
							value = value.replace(findUserSearchText, '');
						break;
						case 'replace':
							value = value.replace(findUserSearchText, replace);
						break;
						case 'set':
							value = text;
						break;
						case 'erase':
							value = '';
						break;
							
						default:
							throw "Bad photo action";
					}
					
					originalValue = originalValue.trim();
					value = value.trim();
					
					if (originalValue != value) {
						targetNode.set('value', value);
						changeCount++;
					}
				});
				
				if (changeCount > 0) {
					that._set('unsavedChanges', true);					
				}
				
				return changeCount;
			},
			
			getAllPhotos:function() {
				return this.get('imageListContainer').all('.smugmug-image');
			},

			getSelectedPhotos:function() {
				return this.get('imageListContainer').all('.smugmug-image.selected');
			},

			findPhotos:function(field, condition, text) {
				var 
					imageNodes = this.getAllPhotos(),
					selected = [];
				
				imageNodes.each(function() {
					var 
						fieldData = this.one('.photo-' + field).get('value'),
						select = false;
					
					if (fieldData !== undefined) {
						switch (condition) {
							case 'empty':
								select = fieldData.trim().length == 0;
							break;
							case 'filled':
								select = fieldData.trim().length != 0;
							break;
							case 'contains':
								select = fieldData.match(new RegExp(preg_quote(text), 'i')) != null;
							break;
							case 'not-contains':
								select = fieldData.match(new RegExp(preg_quote(text), 'i')) == null;
							break;
	
							default:
								throw "Bad image search condition";
						}
						
						if (select) {
							selected.push(this);
						}
					}
				});
				
				return new Y.NodeList(selected);
			},
			
			saveChanges:function() {				
				var changes = this._collectImageChanges();
				
				this._saveChanges(changes);
			},
			
			initializer: function(cfg) {
				var that = this;
				
				this.after(['unsavedChangesChange', 'savingChange'], Y.bind(this._updateSaveButtonState, this));
				
				this.get('imageListContainer').delegate('click', function(e) {
					if (!(e.target.get('tagName') in {INPUT:0, TEXTAREA:0})) {
						var image = this.hasClass('smugmug-image') ? this : this.ancestor('.smugmug-image');
						
						if (image.hasClass('selected')) {
							image.removeClass('selected');
							that._set('selectedCount', that.get('selectedCount') - 1);
						} else {
							image.addClass('selected');
							that._set('selectedCount', that.get('selectedCount') + 1);
						}
						
						e.preventDefault();
						e.stopPropagation();
					}
				}, 'a, tr, td');

				this.get('imageListContainer').delegate('valuechange', function() {
					that._set('unsavedChanges', true);
				}, 'input, textarea');
				
				this.after('selectedCountChange', function(e) {
					Y.one(".photo-select-count").set('text', e.newVal + " of " + that.get('images').length + " are selected");
					Y.one(".photo-select-count").setStyle('visibility', 'visible');
				});
				
				this.get('saveButton').on('click', function(e) {
					that.saveChanges();
					
					e.preventDefault();
				});				
				
				this._eventLog = new Y.SherlockPhotography.EventLogWidget(),
				this._applyEventLog = new Y.SherlockPhotography.EventLogWidget();

				this._eventLog.render('#eventLog');
				this._applyEventLog.render('#applyEventLog');				
			}
		},
		{
			ATTRS: {
				images: {
					value: null
				},
				selectedCount: {
					value: null,
					readOnly: true
				},
				unsavedChanges: {
					value: false,
					readOnly: true
				},
				saving: {
					value: false,
					readOnly: true
				},
				eventLogNode: {
					value: null,
					setter: Y.one
				},
				saveButton: {
					value: null,
					setter: Y.one
				},
				applyEventLogNode: {
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

	var BulkActionUI = Y.Base.create(
			'bulkActionUI',
			Y.Base,
			[],
			{
				_statusNode: null,
				_actionNode: null,
				_targetNode: null,
				_filterNode: null,
				_applyButton: null,
				
				_primaryTextNode: null,
				_replaceTextNode: null,
				
				_clearStatus: function() {
					this._statusNode.set('text', '');
				},
				
				_actionChanged:function() {
					var 
						fieldName = this._targetNode.get('value'),
						text1title = false, text2title = false;
					
					switch (this._actionNode.get('value')) {
						case 'replace':
							text1title = 'Find text';
							text2title = 'Replace with';
						break;
						case 'add':
						case 'set':						
							if (fieldName == 'Keywords') {
								text1title = 'Keyword';
							} else {
								text1title = 'Text';
							} 
						break;
						case 'remove':
							text1title = 'Text to remove';
						break;
						case 'erase':
						default:
					}
					
					if (text1title) {
						this._primaryTextNode.previous('label').set('text', text1title);
						this._primaryTextNode.get('parentNode').setStyle('display', 'block');
					} else {
						this._primaryTextNode.get('parentNode').setStyle('display', 'none');
					}

					if (text2title) {
						this._replaceTextNode.previous('label').set('text', text2title);
						this._replaceTextNode.get('parentNode').setStyle('display', 'block');
					} else {
						this._replaceTextNode.get('parentNode').setStyle('display', 'none');
					}
					
					this.fire('userBumped');						
				},
				
				_targetChanged: function(e) {
					var 
						target = this._targetNode.get('value');
					
					switch (target) {
						case 'Keywords':
							this._actionNode.one("option[value='add']").set('text', 'Add keyword');
						break;
						default:
							this._actionNode.one("option[value='add']").set('text', 'Add text');
					}
					
					if (target == 'Keywords') {
						this._filterNode.one('option[value="empty"]').set('text', target + " are empty");
						this._filterNode.one('option[value="filled"]').set('text', target + " are filled");
						this._filterNode.one('option[value="contains"]').set('text', target + " contain...");
						this._filterNode.one('option[value="not-contains"]').set('text', target + " don't contain...");
					} else {
						this._filterNode.one('option[value="empty"]').set('text', target + " is empty");
						this._filterNode.one('option[value="filled"]').set('text', target + " is filled");
						this._filterNode.one('option[value="contains"]').set('text', target + " contains...");
						this._filterNode.one('option[value="not-contains"]').set('text', target + " doesn't contain...");					
					}
					
					this._actionNode.simulate('change');
					
					this.fire('userBumped');						
				},			
				
				_filterChanged: function(e) {
					var 
						filter = this._filterNode.get('value'), 
						showFilterText = (filter == 'contains' || filter == 'not-contains');
					
					this.get('uiNode').one(".photo-action-filter-text").get('parentNode').setStyle('display', showFilterText ? 'block' : 'none');
					
					this.fire('userBumped');
				},
				
				applyBulkEdit: function(e) {
					var 
						fieldName = this._targetNode.get('value'),
						filter = this._filterNode.get('value'),
						photos,
						source = this.get('imageSource'),
						changeCount;
					
					switch (filter) {
						case 'all':
							photos = source.getAllPhotos();
						break;
						case 'selected':
							photos = source.getSelectedPhotos();
						break;
						default:
							photos = source.findPhotos(fieldName, filter, this.get('filterText'));
					}
					
					changeCount = source.bulkEditPhotos(photos, fieldName, this._actionNode.get('value'), 
						this._primaryTextNode.get('value'), this._replaceTextNode.get('value'));
					
					if (changeCount > 0) {
						this._statusNode.set("text", changeCount + (changeCount == 1 ? " photo was " : " photos were " ) + "edited");
					} else {
						this._statusNode.set("text", "No photos were changed!");
					}
					
					this._statusNode.setStyle('opacity', 0);
					
					new Y.Anim({
						node: this._statusNode,
						to: {opacity: 1},
						duration: STATUS_CHANGE_EYECATCH_DURATION
					}).run();
					
					e.preventDefault();
				},
				
				initializer: function(cfg) {
					var 
						that = this,
						ui = this.get('uiNode');
					
					this._targetNode = ui.one(".photo-target"),
					this._actionNode = ui.one(".photo-action"),
					this._filterNode = ui.one(".photo-filter"),

					this._applyButton = ui.one(".photo-action-apply"),
					this._statusNode = ui.one(".photo-action-apply-status"),
					
					this._primaryTextNode = ui.one('.photo-action-primary-text'),
					this._replaceTextNode = ui.one('.photo-action-replace-text'),

					this._actionNode.after('change', Y.bind(this._actionChanged, this));
					
					this._targetNode.after('change', Y.bind(this._targetChanged, this));
					this._targetNode.simulate('change');
					
					this._filterNode.after('change', Y.bind(this._filterChanged, this));					
					this._filterNode.simulate('change');
					
					this._applyButton.on('click', Y.bind(this.applyBulkEdit, this));				
					
					this.get('imageSource').after({					
						selectedCountChange: function() {
							that.fire('userBumped');
						},
					
						ready: function() {
							that._applyButton.removeAttribute('disabled');
						},
						
						savingChange: function(e) {
							if (e.newVal) {
								that._applyButton.setAttribute('disabled', 'disabled');
							} else {
								that._applyButton.removeAttribute('disabled');
							}
						}
					});
					
					/**
					 * When the user edits the control, we don't want to continue saying how many images were edited
					 * in the last apply, since it's irrelevant to their new edit session.
					 */
					this.on('userBumped', Y.bind(this._clearStatus, this));
				}
			},
			{
				ATTRS: {
					imageSource: {
						value: null,
						writeOnce: 'initOnly'
					},
					
					uiNode: {
						value: null,
						writeOnce: 'initOnly',
						setter: Y.one
					},
					
					filterText: {
						value: null,
						getter: function() {
							return this.get('uiNode').one(".photo-action-filter-text").get('value');
						}
					}
				}
			}
		);
	
	
	//Sorry, this is the best I can do on Chrome! (it doesn't allow User-Agent to be changed)
	Y.io.header('X-User-Agent', 'Unofficial SmugMug extension for Chrome v0.1 / I\'m in ur server, mogrifying ur data / n.sherlock@gmail.com');
	
	Y.on({
		domready: function() {
			
			var
				bulkEditTool = new BulkEditTool({
					eventLogNode: "#eventLog",
					applyEventLogNode: "#applyEventLog",
					saveButton: "#btn-save-changes",
					
					imageListContainer: "#image-selector",
					imageListSpinner: "#image-selector-spinner",
				}),
				
				bulkActionUI = new BulkActionUI({
					imageSource: bulkEditTool,
					
					uiNode: '.bulk-action-panel'
				});
						
			Y.one('#select-all').on('click', function(e) {
				bulkEditTool.selectAll();
				e.preventDefault();
			});
			
			Y.one('#select-none').on('click', function(e) {
				bulkEditTool.deselectAll();
				e.preventDefault();
			});

			Y.one('#select-invert').on('click', function(e) {
				bulkEditTool.invertSelection();
				e.preventDefault();
			});
			
			Y.all(".smugmug-gallery-name").set('text', albumName);
			
			Y.SherlockPhotography.CSRFManager.start(smugDomain, function(token) {
				if (token) {
					bulkEditTool.fetchPhotos();	
				} else {
					alert("Failed to connect to your SmugMug site! Please press refresh to try again.");
				}
			})
		}
	});
});