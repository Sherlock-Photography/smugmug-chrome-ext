YUI().use(['node', 'json', 'io', 'event-resize', 'querystring-parse-simple', 'ss-event-log-widget',
           'ss-progress-bar', 'ss-api-smartqueue', 'model', 'event-valuechange', 'node-event-simulate',
           'anim'], function(Y) {

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
		token = query.token,
		
		smugDomain = nickname + ".smugmug.com",
		
		STATUS_CHANGE_EYECATCH_DURATION = 0.25;

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
					imageListSpinner = this.get('imageListSpinner');
				
				imageListContainer.get('childNodes').remove();
				imageListContainer.append('<tr><th>&nbsp;</th><th>Title</th><th>Caption</th><th>Keywords <small>(separate with semicolons)</small></th></tr>');
				
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
						imageListSpinner.setStyle("display", "none");
						
						that.set('images', images);
						that.set('selectedCount', 0);
						
						that.fire('ready');
					},
					requestFail: function(e) {
						that._eventLog.appendLog('error', "Failed to fetch a page, so this gallery listing is incomplete");
					},
					progress: function(progress) {
					}
				});
				
				queue.run();		
			},
				
			_saveChanges: function(changes) {
				this._applyEventLog.clear();
				
				var 
					logProgress = this._applyEventLog.appendLog('info', "Saving to SmugMug..."),
					queue = new Y.SherlockPhotography.APISmartQueue({
						processResponse: function(request, data) {
							/*if (data.Response && data.Response.Image && data.Response.Image.Caption !== undefined) {
								//Update our model of the caption to the new caption the server ack'ed
								request.context.Caption = data.Response.Image.Caption;
							}*/
							
							return true;
						},
						responseType: 'json',
						retryPosts: true, //Since our requests are idempotent				
						delayBetweenRequests: 0 //We will let the browser's per-domainname limits do the rate-limiting for us
					}),
					errorCount = 0,
					that = this;
				
				for (var index in changes) {
					var 
						change = changes[index],
						data = {
							_token: token
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
							logProgress.set('message', errorCount + "/" + changes.length + " failed to save\nPlease try again");
							logProgress.set('progress', null);
						} else {
							logProgress.set('message', "Saved " + changes.length + " photos");
							logProgress.set('progress', null);
							
							setTimeout(function() {
								console.log(logProgress);
								
								var anim = new Y.Anim({
									node: logProgress.get('element'),
									to: {opacity: 0},
									duration: STATUS_CHANGE_EYECATCH_DURATION
								});
								
								anim.on('end', function() {
									logProgress.destroy(true);
								});
								
								anim.run();
							}, 2000);
							
							that.set('unsavedChanges', false);
						}
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
				this.get('imageListContainer').all('.smugmug-image').addClass('selected');
				this.set('selectedCount', this.get('images').length);
			},
			
			deselectAll: function() {
				this.get('imageListContainer').all('.smugmug-image.selected').removeClass('selected');
				this.set('selectedCount', 0);
			},

			invertSelection: function() {
				var 
					unSelected = this.get('imageListContainer').all('.smugmug-image:not(.selected)'),
					selected = this.get('imageListContainer').all('.smugmug-image.selected');
				
				unSelected.addClass('selected');
				selected.removeClass('selected');
				
				this.set('selectedCount', unSelected.size());
			},
			
			editPhotos: function(target, action, text, replace) {
				var 
					changeCount = 0,
					keywordsEndInSeparator = /([,;]|^)(\s*)$/,
					endsInWhitespace = /(^|\s)$/,
					
					findUserSearchText = new RegExp(preg_quote(text), 'gi'),
					findUserSearchKeyword = new RegExp('(^|[,;])\\s*' + preg_quote(text) + '\\s*([,;]|$)', 'gi');
				
				this.get('imageListContainer').all('.smugmug-image').each(function() {
					var 
						targetNode = this.one('.photo-' + target),
						originalValue = targetNode.get('value'),
						value = targetNode.get('value'),
						matches;
					
					switch (action) {
						case 'add':
							if (target == 'Keywords') {
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
							if (target == 'Keywords') {
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
					this.set('unsavedChanges', true);					
				}
				
				return changeCount;
			},

			findPhotos:function(field, condition, text) {
				var 
					imageNodes = this.get('imageListContainer').all('.smugmug-image'),
					selected = [];
				
				imageNodes.each(function() {
					var 
						fieldData = this.one('.photo-' + field).get('value'),
						select = false;
					
					if (fieldData !== undefined) {
						switch (condition) {
							case 'empty':
								select = fieldData.trim() == 0;
							break;
							case 'filled':
								select = fieldData.trim() != 0;
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
				
				return selected;
			},
			
			saveChanges:function() {				
				var changes = this._collectImageChanges();
				
				this._saveChanges(changes);
			},
			
			initializer: function(cfg) {
				var that = this;
				
				this.after('unsavedChangesChange', function(e) {
					if (e.newVal) {
						that.get('applyButtonNode').removeAttribute("disabled");
					} else {
						that.get('applyButtonNode').setAttribute("disabled", "disabled");
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
					that.set('unsavedChanges', true);
				}, 'input, textarea');
				
				this.after('selectedCountChange', function(e) {
					Y.one(".photo-select-count").set('text', e.newVal + " of " + that.get('images').length + " are selected");
					Y.one(".photo-select-count").setStyle('visibility', 'visible');
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
					value: null
				},
				
				unsavedChanges: {
					value: false
				},
				
				eventLogNode: {
					value: null,
					setter: Y.one
				},
				
				applyButtonNode: {
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

	//Sorry, this is the best I can do on Chrome! (it doesn't allow User-Agent to be changed)
	Y.io.header('X-User-Agent', 'Unofficial SmugMug extension for Chrome v0.1 / I\'m in ur server, mogrifying ur data / n.sherlock@gmail.com');
	
	Y.on({
		domready: function() {
			
			var bulkEditTool = new BulkEditTool({
				eventLogNode: "#eventLog",
				applyEventLogNode: "#applyEventLog",
				applyButtonNode: "#btn-apply",
				
				imageListContainer: "#image-selector",
				imageListSpinner: "#image-selector-spinner",
			});
			
			var photoActionStatusNode = Y.one(".photo-action-apply-status");
			
			Y.one('#btn-apply').on({
				click: function(e) {
					photoActionStatusNode.set('text', '');

					bulkEditTool.saveChanges();
					
					e.preventDefault();
				}
			});
			
			bulkEditTool.after('selectedCountChange', function(e) {
				photoActionStatusNode.set('text', '');
			});

			Y.one('.photo-action').after('change', function(e) {
				var 
					photoTarget = Y.one('.photo-target').get('value'),
					text1title = false, text2title = false;
				
				switch (Y.one('.photo-action').get('value')) {
					case 'replace':
						text1title = 'Find text';
						text2title = 'Replace with';
					break;
					case 'add':
					case 'set':						
						if (photoTarget == 'Keywords') {
							text1title = 'Keyword';
						} else {
							text1title = 'Text';
						} 
					break;
					case 'remove':
						text1title = 'Find text';
					break;
					case 'erase':
					default:
				}
				
				if (text1title) {
					Y.one('label[for="photo-action-primary-text"]').set('text', text1title);
					Y.one('.photo-action-primary-text').setStyle('display', 'block');
				} else {
					Y.one('.photo-action-primary-text').setStyle('display', 'none');
				}

				if (text2title) {
					Y.one('label[for="photo-action-replace-text"]').set('text', text2title);
					Y.one('.photo-action-replace-text').setStyle('display', 'block');
				} else {
					Y.one('.photo-action-replace-text').setStyle('display', 'none');
				}
			});
			
			Y.one('.photo-target').after('change', function(e) {
				var target = Y.one('.photo-target').get('value');
				
				switch (target) {
					case 'Keywords':
						Y.one(".photo-action option[value='add']").set('text', 'Add keyword');
					break;
					default:
						Y.one(".photo-action option[value='add']").set('text', 'Add text');
				}
				
				if (target == 'Keywords') {
					Y.one('.photo-filter option[value="empty"]').set('text', target + " are empty");
					Y.one('.photo-filter option[value="filled"]').set('text', target + " are filled");
					Y.one('.photo-filter option[value="contains"]').set('text', target + " contain...");
					Y.one('.photo-filter option[value="not-contains"]').set('text', target + " don't contain...");
				} else {
					Y.one('.photo-filter option[value="empty"]').set('text', target + " is empty");
					Y.one('.photo-filter option[value="filled"]').set('text', target + " is filled");
					Y.one('.photo-filter option[value="contains"]').set('text', target + " contains...");
					Y.one('.photo-filter option[value="not-contains"]').set('text', target + " doesn't contain...");					
				}
				
				Y.one('.photo-action').simulate('change');
			});
			
			Y.one('.photo-target').simulate('change');
			
			Y.one('.photo-action-apply').on('click', function(e) {
				var changeCount = 
					bulkEditTool.editPhotos(Y.one('.photo-target').get('value'), Y.one('.photo-action').get('value'),
							Y.one('#photo-action-primary-text').get('value'), Y.one('#photo-action-replace-text').get('value'));
								
				photoActionStatusNode.setStyle('opacity', 0);
				
				if (changeCount > 0) {
					photoActionStatusNode.set("text", changeCount + " photos were updated in the preview");
				} else {
					photoActionStatusNode.set("text", "No photos were changed!");
				}
				
				new Y.Anim({
					node: photoActionStatusNode,
					to: {opacity: 1},
					duration: STATUS_CHANGE_EYECATCH_DURATION
				}).run();
				
				e.preventDefault();
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

			Y.one(".photo-filter").on('change', function(e) {
				var
					filter = e.newVal;
				
				if (filter == "contains" || filter == "not-contains") {
					Y.one('.photo-action-filter-text').setStyle('display', 'block');
				} else {
					Y.one('.photo-action-filter-text').setStyle('display', 'none');					
				}
				
				e.preventDefault();
			}, 'a');
			
			Y.all(".smugmug-gallery-name").set('text', albumName);

			bulkEditTool.on('ready', function() {
				Y.one('.photo-action-apply').removeAttribute('disabled');
			});
			
			bulkEditTool.fetchPhotos();
		}
	});
});