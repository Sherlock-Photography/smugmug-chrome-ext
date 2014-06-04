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

YUI.add('ss-smugmug-bulk-edit-tool', function(Y, NAME) {
	var 
		STATUS_CHANGE_EYECATCH_DURATION = 0.33,
		HIGH_DENSITY_DISPLAY = window.devicePixelRatio >= 1.5 ;
	
	var BulkEditTool = Y.Base.create(
		NAME,
		Y.Base,
		[],
		{
			_eventLog: null,
			_applyEventLog: null,
			
			_renderImageRow: function(image) {
				//console.log(image);
				var 
					rendered = Y.Node.create('<div class="smugmug-image"></div>'),
					
					imageCell = Y.Node.create('<div class="field-cell smugmug-image-thumbnail"><div class="thumbnail">'
							+ '<a href="#"><img class="thumbnail-image" src="' + Y.Escape.html(image.ThumbnailUrl) + '"/></a>'
							+ '<div class="caption">' 
							+ '<div class="filename">' + Y.Escape.html(image.FileName) + '</div>'
							/*+ Y.Escape.html(image.get('OriginalWidth')) + "x" + Y.Escape.html(image.get('OriginalHeight'))*/
							+ '</div></div></div>'),
					
					title = Y.Node.create('<div class="field-cell smugmug-image-title"><input type="text" class="form-control photo-Title" value="' + Y.Escape.html(image.Title) + '"></div>'),
					caption = Y.Node.create('<div class="field-cell smugmug-image-caption"><textarea rows="9" class="form-control photo-Caption">' + Y.Escape.html(image.Caption) + '</textarea></div>'),
					keywords = Y.Node.create('<div class="field-cell smugmug-image-keywords"><textarea rows="9" class="form-control photo-Keywords">' + Y.Escape.html(image.Keywords) + '</textarea></div>');

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
				imageListContainer.append(
					'<header>' + 
						'<div class="field-cell"><span>&nbsp;</span></div>' + 
						'<div class="field-cell"><span>Title</span></div>' +
						'<div class="field-cell"><span>Caption</span></div>' +
						'<div class="field-cell"><span>Keywords <small>(separate with semicolons)</small></span></div>' +
					'</header>'
				);
				
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
							
								if (data.Expansions && data.Expansions[image.Uris.ImageSizeDetails]) {
									image.ImagePreview = data.Expansions[image.Uris.ImageSizeDetails].ImageSizeDetails.ImageSizeMedium;
									
									if (HIGH_DENSITY_DISPLAY) {
										image.ImagePreview.Url = data.Expansions[image.Uris.ImageSizeDetails].ImageSizeDetails.ImageSizeLarge.Url;
									}
								}
								
								imageListContainer.append(that._renderImageRow(image));
							}

							if (response.Pages && response.Pages.NextPage) {
								queue.enqueueRequest({
									url: 'http://' + that.get('smugDomain') + response.Pages.NextPage,
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
					url: 'http://' + this.get('smugDomain') + '/api/v2/album/' + this.get('albumID') + '!images?_filter=Uri,ThumbnailUrl,Caption,Keywords,Title,FileName,WebUri&_expand=ImageSizeDetails&_shorturis=',
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
					that = this,
					failedNodes = [];
				
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
						url: 'http://' + that.get('smugDomain') + change.image.Uris.Image + '?_method=PATCH',
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
						that.getAllPhotos().removeClass('unsaved');
						
						if (failedNodes.length) {
							Y.each(failedNodes, function(node) {
								node.addClass('unsaved');
							});
						}
						
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
						failedNodes.push(e.request.context.node);
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
			
			/**
			 * Mark the given image as having saved/unsaved changes attached
			 */
			_markSavedChanges: function(node, saved) {
				if (node) {
					if (saved) {
						node.removeClass('unsaved');
					} else {
						node.addClass('unsaved');
					}
				}
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
				if (photos == null) {
					photos = this.getAllPhotos();
				}

				var changeCount = BulkEditTool._bulkEditPhotos(photos, fieldName, action, text, replace);
				
				if (changeCount > 0) {
					this._set('unsavedChanges', true);					
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
				}, 'a, .smugmug-image');

				this.get('imageListContainer').delegate('hoverintent', function(e) {
					if (e.phase == 'over') {
						var image = this.ancestor('.smugmug-image').getData('image');

						$(this.getDOMNode())
							.popover({
								html: true,
								content: '<img src="' + Y.Escape.html(image.ImagePreview.Url) + '" width="' +image.ImagePreview.Width + '" height="' +image.ImagePreview.Height + '" />',
								trigger: 'manual'
							})
							.popover('show');
					} else {
						$(this.getDOMNode()).popover('destroy');
					}
				}, '.thumbnail img');				

				this.get('imageListContainer').delegate('valuechange', function(e) {
					that._set('unsavedChanges', true);
					
					that._markSavedChanges(this.ancestor('.smugmug-image'));
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
			_bulkEditPhotos: function(photos, fieldName, action, text, replace) {
				var 
					changeCount = 0,
					keywordsEndInSeparator = /([,;]|^)(\s*)$/,
					endsInWhitespace = /(^|\s)$/,
					
					// Keywords are case insensitive, everything else is case sensitive
					findUserSearchText = new RegExp(preg_quote(text), fieldName == 'Keywords' ? 'gi' : 'g'),
					findUserSearchKeyword = new RegExp('(^|[,;])\\s*' + preg_quote(text) + '\\s*([,;]|$)', 'gi');
								
				photos.each(function(photo) {
					var 
						targetNode = photo.one('.photo-' + fieldName),
						originalValue = targetNode.get('value'),
						value = targetNode.get('value'),
						matches;
					
					switch (action) {
						case 'add':
							if (fieldName == 'Keywords') {
								//Adding into empty string
								if (value.match(/^\s*$/)) {
									//If we're adding a multi-word keyword that isn't quoted:
									if (text.match(/\S\s+\S/) && text.indexOf('"') == -1) {
										//Do what SM will do upon save and quote it:
										value = '"' + text + '"';
									} else {
										value = text;
									}
								} else if (!value.match(findUserSearchKeyword)) {
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
						case 'remove-numeric':
							if (fieldName == 'Keywords') {
								//Replace keywords which are entirely numbers
								var 
									next,
									iterations = 255;
								
								/* 
								 * We loop because our regex matches the final separator, leaving it unavailable as a match for the first separator
								 * of the next keyword.
								 */
								while (iterations >= 0) {
									next = value.replace(/(^|[,;])\s*(\d+\s*)+($|[,;])/g, '$1');
									
									if (next == value) {
										break;
									} else {
										value = next;
									}
									
									iterations--;
								}
							} else {
								//Erase the string if it is entirely numbers
								if (value.match(/^\s*(\d+\s*)+$/)) {
									value = "";
								}
							}
						break;
						default:
							throw "Bad photo action";
					}
					
					originalValue = originalValue.trim();
					value = value.trim();
					
					if (originalValue != value) {
						photo.addClass('unsaved');
						targetNode.set('value', value);
						changeCount++;
					}
				});
								
				return changeCount;
			},
			
			ATTRS: {
				images: {
					value: null
				},
				smugDomain: {
					value: null,
					writeOnce: "initOnly"
				},
				albumID: {
					value: null,
					writeOnce: "initOnly"
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

	Y.namespace("SherlockPhotography").SmugmugBulkEditTool = BulkEditTool;
}, '0.0.1', {
	requires: ['json', 'io', 'node', 'ss-event-log-widget', 'ss-api-smartqueue', 'ss-csrf-manager', 'event-hoverintent']
});	