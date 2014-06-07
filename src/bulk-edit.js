YUI().use(['node', 'json', 'io', 'event-resize', 'querystring-parse-simple', 'ss-event-log-widget',
           'ss-progress-bar', 'ss-api-smartqueue', 'model', 'event-valuechange', 'node-event-simulate',
           'anim', 'ss-csrf-manager', 'ss-smugmug-bulk-edit-tool'], function(Y) {

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

	if (!albumID || !/^[a-zA-Z0-9]+$/.test(albumID) || !nickname || !/^[a-zA-Z0-9-]+$/.test(nickname)) {
		alert("Bad arguments, please close this page and try again.");
		return;
	}
	
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
						case 'remove-numeric':
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
							that.fire('userBumped');
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
			//Bootstrap's data JS API is sloooow as heck
			$(document).off('.data-api');
			
			var
				bulkEditTool = new Y.SherlockPhotography.SmugmugBulkEditTool({
					smugDomain: smugDomain,
					albumID: albumID,
										
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
			
			Y.one('.thumbnail-size-controls').delegate('click', function(e) {
				e.currentTarget.siblings().removeClass('active');
				e.currentTarget.addClass('active');
				bulkEditTool.set('thumbnailSize', e.currentTarget.getAttribute('data-thumbnail-size'));
			}, 'button');
			
			Y.all(".smugmug-gallery-name").set('text', albumName);
			
			Y.SherlockPhotography.CSRFManager.start(smugDomain, function(token) {
				if (token) {
					bulkEditTool.fetchPhotos();	
				} else {
					alert("Failed to connect to your SmugMug site! Please press refresh to try again.");
				}
			});
		}
	});
});