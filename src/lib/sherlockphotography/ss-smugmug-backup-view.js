YUI.add('ss-smugmug-backup-view', function(Y, NAME) {
	var 
		NODE_TYPE_NONE = 0,
		NODE_TYPE_BACKUP_INFO = 1,
		NODE_TYPE_SMUG_NODE = 2,
		NODE_TYPE_SITE_DESIGN = 3,
		NODE_TYPE_SITE_SKIN = 4,
		NODE_TYPE_SITEPAGE_DESIGN = 5;
	
	var 
		SMUGMUG_NODE_TYPE_ROOT = 1,
		SMUGMUG_NODE_TYPE_FOLDER = 2,
		SMUGMUG_NODE_TYPE_GALLERY = 4,
		SMUGMUG_NODE_TYPE_SYSTEM_PAGE = 16,
		SMUGMUG_NODE_TYPE_PAGE = 64;
	
	var
		SITE_PAGE_DESIGN_NAME_TRANSLATIONS = {
			"Site": "Entire site",
			"Homepage": "Homepage",
			"Folder": "All folders",
			"Gallery": "All galleries"
		},
		
		LOOKUP_GALLERY_STYLE = {
			3: "SmugMug",
			17: "Thumbnails",
			18: "Collage Landscape",
			19: "Collage Portrait",
			16: "Journal",
			8: "Slideshow"			
		},
		
		NODE_DEFINITIONS = {
			Url: {title:"URL", type:'url'},
			Description: {title:"Description", supportCopy:true, type:'lines'},
			Keywords: {title:"Keywords", supportCopy:true, type:'lines'},
			DateAddedDisplay: {title:"Created", type:'line'},
			DateModifiedDisplay: {title:"Last modified", type:'line'},
			PrivacyLevel: {title: "Privacy", type:'line', lookup: {1: "Inherit", 2: "Unlisted", 3: "Private"}},
			SmugSearchable: {title: "SmugMug searchable", lookup: {0: "No", 1: "Site-setting"}},
			WorldSearchable: {title: "Web searchable", lookup: {0: "No", 1: "Site-setting"}},
			SortMethod: {title: "Sort by"},
			SortDirection: {title: "Sort direction"},
		},
	
		NODE_TILES_DEFINITIONS = {
			PaginationType: {title: "Pagination style", lookup: {3: "scroll", 4: "click"}},
			SortMethod: {title: "Sort by", type: "line", lookup: {3: "name", 5: "date added", 6: "date modified", 7: "organiser position"}},
			SortDirection: {title: "Sort direction", type: "line", lookup: {1: "ascending", 2: "descending"}},
			NodeSource: {title: "Select from"},
			ImageCrop: {title: "Image aspect ratio"},
			TileLayout: {title: "Layout"},
			TileSpacing: {title: "Spacing between photos", type: "pixels"},
			TileInfo: {title: "Info style" },
			VaryHeight: {title: "Vary photo height"},
			ImageSize: {title: "Photo size", lookup: {S: "Small", M: "Medium", L: "Large", XL: "X Large", X2: "X2 Large", X3: "X3 Large"}},
			SelectedNodes: {title: "Selected nodes", type: "nodelist"}
		},
		
		WIDGET_CONFIG_DEFINITION = {
			"Breadcrumb" : {
				fields: {
					ShowCurrentPage: {title: "Show current page"},
					ShowFullBreadcrumb: {title: "Display full breadcrumb"},
					EmphasizeCurrentPage: {title: "Emphasize current page"}
				}
			},
			"HTML" : { //HTML & CSS / HTML block
				fields: {
				     WrapCSS: {show: false},
				     WrapHTML: {show: false},
				     HTML: {type: "code:html"},
				     CSS: {type: "code:css"}
				}
			},
			"Text" : { //HTML & CSS / Text block
				fields: {
				     HTML: {type: "code:html"}
				}
			},
			"CSS" : { //HTML & CSS / CSS
				fields: {
				     CSS: {type: "code:css"}
				}
			},
			"Title" : {
				fields: {
					Text: {type:"line", supportCopy: true},
				}
			},
			"Single Photo": {
				fields: {
					ImageID: {title: "Image<br><small>Not saved inside the backup</small>", type: "smugimage"},
					CustomURL: {title: "Custom URL", type: "url"}
				}
			},
			"Logo" : {
				fields: {
					ImageID: {title: "Image<br><small>Not saved inside the backup</small>", type: "smugimage"},
					Text: {type: "line", supportCopy: true}
				}
			},
			"Profile": {
				fields: {
					TrackProfile: {title: "Use data from your profile"},
					BioPhoto: {title: "Bio photo<br><small>Not saved inside the backup</small>", type: "smugimage"},
					CoverPhoto: {title: "Cover photo<br><small>Not saved inside the backup</small>", type: "smugimage"},
					MyName: {title: "My name"},
					Description: {type: "lines", supportCopy:true}
				}
			},
			"Galleries" : { //Navigation / Galleries
				fields: Y.merge(NODE_TILES_DEFINITIONS, {
					NodeSource: {title: "Select from", lookup: {selectedNodes: "Selected galleries"}},
					SelectedNodes: {title: "Selected galleries", type: "nodelist"}
				})
			},
			"Folders" : { //Navigation / Folders
				fields: Y.merge(NODE_TILES_DEFINITIONS, {
					NodeSource: {title: "Select from", lookup: {selectedNodes: "Selected folders"}},
					SelectedNodes: {title: "Selected folders", type: "nodelist"}
				})
			},
			"Pages" : { //Navigation / Pages
				fields: Y.merge(NODE_TILES_DEFINITIONS, {
					NodeSource: {title: "Select from", lookup: {selectedNodes: "Selected pages"}},
					SelectedNodes: {title: "Selected pages", type: "nodelist"}
				})
			},
			"Folders, Galleries & Pages" : {
				fields: NODE_TILES_DEFINITIONS
			},
			"Multiple Photos" : {
				fields: Y.merge(NODE_TILES_DEFINITIONS, {
					SelectedImages: {title: "Selected images<br><small>Image files not saved inside the backup</small>", type: "smugimages"},
					AlbumID: {title: "Gallery", type: "albumid"},
					ImageSource: {lookup: {album: "Selected gallery"}}
				})
			},
			"Slideshow" : {
				fields: {
					AlbumID: {title: "Source gallery", type: "albumid"},
				}
			}
		},
		
		SITE_SKIN_FIELD_DEFINITIONS = {
			SkinID: {show: false},
			NickName: {show: false},
			SkinName: {title: "Skin name"},
			CustomCSS: {title: "Theme CSS", type: "code:css"},
			Status: {show: false},
			IsOwner: {show: false},
			Category: {show: false},
			PrimaryHex: {title: "Primary colour", type: "colour"},
			AccentHex: {title: "Accent colour", type: "colour"},
			TextHex: {title: "Text colour", type: "colour"},
			BackgroundHex: {title: "Background colour", type: "colour"},
			TopBackgroundHex: {title: "Top background colour", type: "colour"},
		},
		
		SITE_DESIGN_FIELD_DEFINITIONS = {
			HeaderDisplay: {title: "Show SmugMug header", type: 'yesno'},
			FooterDisplay: {title: "Show SmugMug footer", type: 'yesno'},
			GalleryStyle: {title: "Gallery style", lookup: LOOKUP_GALLERY_STYLE},
			UniqueHomepage: {title: "Independent homepage"},
			PoweredByAlignment: {title: "Photo sharing by SmugMug"},
			SiteDesignID: {show: false},
			ClonedFrom: {show: false},
			IsOwner: {show: false},
			Category: {show: false},
			Status: {show: false},
			HighlightImageID: {show: false},
			FaviconImageID: {title: "Favicon", type: "imageid"}
		};
	
	function isNumber(n) {
		return !isNaN(parseFloat(n)) && isFinite(n);	
	}
	
	var SmugmugBackupView = Y.Base.create(NAME, Y.Widget, [], {

		_treeView : null,
		
		//So we don't have to keep extracting it from this.get('backup').get('backup')
		_backupData : null,

		CONTENT_TEMPLATE : null,
		
		/**
		 * Recursively build up the folders tree from the SmugMug node tree.
		 * 
		 * @param smugNode
		 * @param treeNode
		 */
		_recurseBuildFoldersTree: function(smugNode, parentTreeNode) {
			var label;
			
			if (smugNode.nodeData.Depth == 0) {
				label = "Homepage";
			} else {
				label = smugNode.nodeData.Name;
			}
			
			if (smugNode.initData) {
				//Is this page customised?
				if (smugNode.initData.pageDesignId) {
					//Check that the page deisgn is part of the backup
					if (this._backupData.pageDesigns[smugNode.initData.pageDesignId].PageDesign) {
						label += " <span class='label label-primary'>Customised</span>";
					} else {
						label += " <span class='label label-danger'>Error</span>";
					}
				}					
			} else {
				label += " <span class='label label-danger'>Error</span>";
			} 
			
			var treeNode = parentTreeNode.append({
				label: label,
				state: {open: smugNode.nodeData.Depth == 0},
				data: {
					type: NODE_TYPE_SMUG_NODE,
					data: smugNode,
				}
			});
						
			for (var index in smugNode.children) {
				var smugChild = smugNode.children[index];
				
				this._recurseBuildFoldersTree(smugChild, treeNode);
				
				treeNode.sort({sortComparator:function(node) {
					var typeSortKey;
					
					switch (node.data.data.nodeData.Type) {
						case SMUGMUG_NODE_TYPE_ROOT:
						case SMUGMUG_NODE_TYPE_FOLDER:
							typeSortKey = 0;
							break;
						case SMUGMUG_NODE_TYPE_GALLERY:
						case SMUGMUG_NODE_TYPE_PAGE:
							typeSortKey = 1;
							break;
						default:
							//e.g. system pages
							typeSortKey = 2;
					}
					
					return typeSortKey + "-" + node.label;
				}});
			}
			
			return treeNode;
		},

		_buildSkinsTree: function(skins, parentTreeNode) {
			var skinsRoot = parentTreeNode.append({
				label: "Site themes",
				state: {open: true}
			});
			
			for (var skinID in skins) {
				var skin = skins[skinID];
				
				skinsRoot.append({
					label: skin.SkinName,
					data: {
						type: NODE_TYPE_SITE_SKIN,
						data: skin
					}
				});
			}
		},		
				
		_buildSiteDesignsTree: function(siteDesigns, parentTreeNode) {
			var 
				designsRoot = parentTreeNode.append({
					label: "Site designs",
					state: {open: true}
				});
			
			for (var siteDesignId in siteDesigns) {
				var siteDesign = siteDesigns[siteDesignId];
				
				var siteDesignNode = designsRoot.append({
					label: siteDesign.SiteDesignID ? siteDesign.Name : '(failed to fetch)',
					data: {
						type: NODE_TYPE_SITE_DESIGN,
						data: siteDesign
					},
					state: {open: true}					
				});
				
				for (var sitePageDesignID in siteDesign.sitePageDesigns) {
					var 
						sitePageDesign = siteDesign.sitePageDesigns[sitePageDesignID],
						pageDesign = this._backupData.pageDesigns[sitePageDesignID],
						name;
					
					name = SITE_PAGE_DESIGN_NAME_TRANSLATIONS[sitePageDesign.Name] ? SITE_PAGE_DESIGN_NAME_TRANSLATIONS[sitePageDesign.Name] : sitePageDesign.Name;
					
					if (!pageDesign || !pageDesign.PageDesign) {
						name += " <span class='label label-danger'>Error</span>";
					}
					
					siteDesignNode.append({
						label: name,
						data: {
							type: NODE_TYPE_SITEPAGE_DESIGN,
							data: sitePageDesign
						}}
					);
				}
			}
		},		
		
		_rebuildTree: function() {
			var 
				backup = this._backupData,
				tree = this._treeView,
				root = tree.rootNode;

			//TODO clear the tree, keeping in mind that sm-treeview.clear() seems to break node events
			
			if (!backup)
				return;
			
			root.append({
				label: "About this backup",
				data: {
					type: NODE_TYPE_BACKUP_INFO,
					data: backup.backup
				}
			});

			this._recurseBuildFoldersTree(backup.nodeTree, root);
			this._buildSiteDesignsTree(backup.siteDesigns, root);
			this._buildSkinsTree(backup.siteSkins, root);
		},
		
		_renderCodeMirror: function(target, code, mode) {
			var cm = CodeMirror(target.getDOMNode(), {
				value: code,
				mode: mode,
				readOnly: true,
				lineWrapping: true
			});
			
			Y.soon(function() {
				cm.refresh();
			});
			
			return cm;
		},

		_renderSectionList: function(options) {
			if (Array.isArray(options)) {
				options = {items: options};
			}
			
			var dl = Y.Node.create("<dl></dl>");
			
			if (options.className) {
				dl.addClass(options.className);
			}
			
			for (var index in options.items) {
				var 
					item = options.items[index],
					dt = Y.Node.create("<dt class='section-header'><h2>" + Y.Escape.html(item.title) + "</h2></dt>"),
					dd = Y.Node.create("<dd class='section-contents'></dd>"); 

				if (item.className) {
					dt.addClass(item.className);
					dd.addClass(item.className);
				}
				
				dl.append(dt);
				
				dd.append(item.value);
								
				dl.append(dd);
			}
			
			return dl;
		},
		
		/**
		 * Cause the treeview to jump to the SmugMug node with the given nodeID.
		 */
		_selectSmugMugNode: function(nodeID) {
			var node = this._treeView.findNode(this._treeView.rootNode, function(n) {
				return n.data && n.data.type == NODE_TYPE_SMUG_NODE && n.data.data.nodeData && n.data.data.nodeData.NodeID == nodeID; 
			});
			
			if (node) {
				this._treeView.selectNode(node);
				
				//Ensure that the tree branch is visible by expanding parents
				while (node.parent) {
					node = node.parent;
					
					this._treeView.openNode(node);
				}
			}
		},
		
		/**
		 * Create a link to the given node, and return the rendered node.
		 * 
		 * @param node
		 * @returns
		 */
		_createNodeLink: function(node) {
			var 
				that = this,
				content = Y.Node.create("<a href='#'></a>");
			
			content.set('text', node.nodeData.Name);
			content.on({
				click: function() {
					that._selectSmugMugNode(node.nodeData.NodeID);
				}
			});
			
			return content;
		},
		
		/**
		 * Options is either an array of field items or an object:
		 * 
		 * className - Class to apply to <dl> (optional)
		 * items - Array of items, which are objects:
		 * 		title - String, required 
		 * 		value - String or Y.Node
		 * 		supportCopy - Boolean. True if the UI should afford copying the value
		 * 		type - Optional, describes the type of the value. One of line, lines, url, yesno. If not provided, type is autodetected
		 *		className - Optional, added to <dt> and <dd>
		 *		show - If present, and set to false, field is hidden.
		 */
		_renderFieldList: function(options) {
			var 
				that = this,
				backup = this._backupData;
			
			if (Array.isArray(options)) {
				options = {items: options};
			}
			
			var dl = Y.Node.create("<table></table>");
			
			if (options.className) {
				dl.addClass(options.className);
			}
			
			for (var index in options.items) {
				var 
					item = options.items[index];
				
				if (item.show !== undefined && !item.show) {
					continue;
				}
				
				if (item.lookup) {
					if (item.lookup[item.value]) {
						item.value = item.lookup[item.value];
					}
				}
				
				if (item.value === "") {
					continue;
				}
				
				if (!item.type) {
					if (item.value === true || item.value === false) {
						item.type = "yesno";
					} else if (isNumber(item.value)) {
						item.type = "line";								
					} else if ((typeof item.value == 'string' || item.value instanceof String) && item.value != "") {
						if (item.value.indexOf("\n") > -1)
							item.type = "lines";
						else
							item.type = "line";
					} else if (item.value instanceof Y.Node) {
						item.type = 'yui-node';
					} else {
						// Don't bother displaying arrays or other weird values
						continue;
					}
				}
				
				var
					row = Y.Node.create("<tr></tr>"),
					dt = Y.Node.create("<td class='field-title'>" + item.title + "</td>"),
					dd = Y.Node.create("<td class='field-value'></td>"); 

				if (item.className) {
					dt.addClass(item.className);
					dd.addClass(item.className);
				}
				
				row.append(dt);
				
				var valueRendered = false;
				
				switch (item.type) {
					case 'url':
						valueRendered = '<a target="_blank" href="' + Y.Escape.html(item.value) + '">' + Y.Escape.html(item.value) + '</a>';
						break;
					case 'yesno':
						if (item.value == 0) {
							valueRendered = '<span class="no">no</span>';
						} else {
							valueRendered = '<span class="yes">yes</span>';
						}
						break;
					case 'lines':
						if (item.supportCopy) {
							this._renderCodeMirror(dd, item.value, 'text/plain');
							valueRendered = false;
						} else {
							valueRendered = Y.Escape.html(item.value);
						}
						break;
					case 'code:html':
					case 'code:css':
							this._renderCodeMirror(dd, item.value, item.type == 'code:html' ? 'text/html' : 'text/css');
							valueRendered = false;
						break;
					case 'colour':
							if (item.value) {
								valueRendered = '<div class="colour-value"><span class="colour-swatch" style="background-color: #' + Y.Escape.html(item.value) + '"></span> #' + Y.Escape.html(item.value) + '</div>';
							} else {
								valueRendered = '(default)';
							}
						break;
					case 'smugimages':
						if (item.value) {
							var images = item.value.split(',');
	
							valueRendered = '<ul class="list-unstyled smugmug-images">';
							
							for (var index in images) {
								var 
									image = images[index],
									url = 'https://photos.smugmug.com/photos/' + image.replace('-', '_') + '-S.jpg';
								
								valueRendered += '<li style="background-image:url(' + Y.Escape.html(url) + ')"></li>';
							}
							
							valueRendered += '</ul>';
						} else {
							valueRendered = "(none)";
						}
						
						break;
					case 'smugimage':
						var url;
						
						if (!item.value.imageID) {
							url = 'https://photos.smugmug.com/photos/' + item.value.replace('-', '_') + '-S.jpg';
						} else {
							url = 'https://photos.smugmug.com/photos/' + item.value.imageID + '_' + item.value.imageKey + '-S.jpg';
						}
						
						valueRendered = '<img class="smugmug-image" src="' + Y.Escape.html(url) + '">';
						break;
					case 'nodelist':
						var 
							list = Y.Node.create("<ul class='ss-smugmug-backup-nodelist list-unstyled'></ul>");
						
						Y.Array.each(item.value.split(","), function(nodeID) {
							var 
								content,
								foundNode = false;
							
							if (backup.nodes[nodeID]) {
								foundNode = backup.nodes[nodeID];
							}
							
							if (!foundNode && nodeID.split('-').length == 2) {
								var fragments = nodeID.split('-');
								
								foundNode = that.get('backup').findAlbumNode(fragments[0], fragments[1]);
							}
							
							if (foundNode) {
								content = that._createNodeLink(foundNode);
							} else {
								content = Y.Escape.html(nodeID);
							}
							
							var li = Y.Node.create("<li></li>");
							
							li.append(content);
							list.append(li);
						});
						
						valueRendered = list;
						break;
					case 'albumid':
						var 
							foundNode = false,
							fragments = item.value.split('-');
						
						if (fragments.length == 2) {
							foundNode = that.get('backup').findAlbumNode(fragments[0], fragments[1]);
						}
						
						if (foundNode) {
							valueRendered = that._createNodeLink(foundNode);
						} else {
							valueRendered = Y.Escape.html(nodeID);
						}						
						break;
					default:
						if (item.value instanceof Y.Node) {
							dd.append(item.value);
						} else {
							if (item.type == 'pixels') {
								item.value = item.value + 'px';
							}
							
							if (item.supportCopy) {
								valueRendered = '<input type="text" class="form-control" value="' + Y.Escape.html(item.value) + '">';
							} else {
								valueRendered = Y.Escape.html(item.value);
							}
						}
				}
				
				if (valueRendered !== false) {
					dd.setHTML(valueRendered);
				}
								
				row.append(dd);
				
				dl.append(row);
			}
			
			return dl;
		},

		_renderSitePageDesign: function(sitePage, pane) {
			var 
				fields = [],
				topLevelBlocks = [],
				pageDesign = this._backupData.pageDesigns[sitePage.PageDesignID];
			
			fields.push({title:"Name", value:SITE_PAGE_DESIGN_NAME_TRANSLATIONS[sitePage.Name] ? SITE_PAGE_DESIGN_NAME_TRANSLATIONS[sitePage.Name] : sitePage.Name});
			
			topLevelBlocks.push({
				title: "About this site page design",
				value: this._renderFieldList({items:fields, className:"ss-field-list"})
			});			
			
			if (pageDesign && pageDesign.PageDesign) {
				var widgetBlocks = this._renderWidgetBlocks(pageDesign.PageDesign);
				
				for (index in widgetBlocks) {
					topLevelBlocks.push(widgetBlocks[index]);
				}
			}
			
			pane.append(this._renderSectionList({items:topLevelBlocks, className: "ss-collapsable-section"}));			
		},
		
		_renderSiteSkin: function(skin, pane) {
			var 
				fields = [],
				fieldDefs = SITE_SKIN_FIELD_DEFINITIONS;
			
			for (var fieldName in skin) {
				var 
					fieldInfo = fieldDefs[fieldName] || {};
					
				fields.push(Y.merge({title: fieldName, value: skin[fieldName]}, fieldInfo));
			}
			
			pane.append(this._renderFieldList({items:fields, className:"ss-field-list"}));
		},
		
		_renderSiteDesign: function(design, pane) {
			var 
				topLevelBlocks = [],
				fieldDefs = SITE_DESIGN_FIELD_DEFINITIONS,
				fields = [];
			
			if (design.SiteDesignID) {
				for (var fieldName in design) {
					var 
						fieldInfo = fieldDefs[fieldName] || {};
						
					fields.push(Y.merge({title: fieldName, value: design[fieldName]}, fieldInfo));
				}
			} else {
				fields.push({
					title: "Error", 
					value: Y.Node.create('<div class="alert alert-danger">This site design could not be fetched!</div>')
				});
			}

			topLevelBlocks.push({
				title: "About this design",
				value: this._renderFieldList({items:fields, className:"ss-field-list"})
			});
			
			pane.append(this._renderSectionList({items:topLevelBlocks, className: "ss-collapsable-section"}));
		},		
		
		_renderBackupInfo: function(backup, pane) {
			var items = [];
			
			if (backup.numErrors > 0) {
				items.push({
					title: "Errors", 
					value: Y.Node.create('<div class="alert alert-danger">' + backup.numErrors + ' fatal errors were encountered during backup, this backup is incomplete!</div>')
				});
			}
			
			items.push(
				{title:"SmugMug nickname", value:backup.nickname, type: "line"},
				{title:"Backup creation date", value:backup.date, type: "line"}
			);
			
			pane.append(this._renderFieldList({items:items, className:"ss-field-list"}));
		},
		
		_renderMargins:function(config) {
			var margins = [];
			
			if (config.TopMargin !== null) {
				margins.push("top: " + config.TopMargin + "px");
			}

			if (config.BottomMargin !== null) {
				margins.push("bottom: " + config.BottomMargin + "px");
			}

			if (config.LeftMargin !== null) {
				margins.push("left: " + config.LeftMargin + "px");
			}

			if (config.RightMargin !== null) {
				margins.push("right: " + config.RightMargin + "px");
			}
			
			return margins.join(", ");
		},
		
		_renderWidgetBlocks: function(pageDesign) {
			var result = [];
			
			for (var mapIndex in pageDesign.WidgetMap) {
				var widget = pageDesign.WidgetMap[mapIndex];
				
				var fields = [];
				
				fields.push({title: "Title", value: widget.Title, supportCopy: true});
				fields.push({title: "Margins", value: this._renderMargins(widget)});
				
				if (widget.Config) {
					var configDef = WIDGET_CONFIG_DEFINITION[widget.TypeFriendly] || {fields: {}}; 
					
					for (var fieldName in widget.Config) {
						var 
							fieldValue = widget.Config[fieldName],
							fieldInfo = configDef.fields[fieldName] || {};
						
						if (widget.Name == 'Single Photo') {
							if ((fieldName == 'CustomWidth' || fieldName == 'CustomHeight') && fieldValue == 0) {
								continue;
							}
						}
							
						fields.push(Y.merge({title: fieldName, value: fieldValue}, fieldInfo));
					}
				}
				
				result.push({
			 		title: "Content block: " + widget.Category + " / " + widget.DisplayName, 
			 		value: this._renderFieldList({items:fields, className: "ss-field-list"})
				});
			}
			
			return result;
		},
		
		_renderSmugNode: function(node, pane) {
			var 
				nodeData = node.nodeData,
				backup = this._backupData,
				nodeType,
				aboutThisText;
			
			switch (nodeData.Type) {
				case SMUGMUG_NODE_TYPE_ROOT:
					nodeType = "Homepage";
					aboutThisText = "About the homepage";
					break;
				case SMUGMUG_NODE_TYPE_FOLDER:
					nodeType = "Folder";
					aboutThisText = "About this folder";
					break;
				case SMUGMUG_NODE_TYPE_GALLERY:
					nodeType = "Gallery";
					aboutThisText = "About this gallery";
					break;
				case SMUGMUG_NODE_TYPE_PAGE:
					nodeType = "Page";
					aboutThisText = "About this page";
					break;
				case SMUGMUG_NODE_TYPE_SYSTEM_PAGE:
					nodeType = "System page";
					aboutThisText = "About this system page";
					break;
				default:
					nodeType = "Node (" +nodeData.Type + ")";
					aboutThisText = "About this node (" + nodeData.Type + ")";
			}

			var 
				aboutThisNode = [],
				topLevelBlocks = [];

			// Add a name field for this node
			switch (nodeData.Type) {
				case SMUGMUG_NODE_TYPE_ROOT:
					//No title needs to be displayed
					break;
				case SMUGMUG_NODE_TYPE_SYSTEM_PAGE:
					//Don't need to support copying since system page names can't be edited anyway
					aboutThisNode.push(
						{title: nodeType, value:nodeData.Name}
					);
					break;
				default:
					aboutThisNode.push(
						{title: nodeType + " name", supportCopy:true, value:nodeData.Name}
					);
			}
			
			if (nodeData.HLImageID) {
				aboutThisNode.push({title: "Feature image<br><small>Not saved inside the backup</small>", value:{
					imageID: nodeData.HLImageID, 
					imageKey: nodeData.HLImageKey,
					/* link: todo */ 
				}, type: "smugimage", className: "field-node-feature-image"});
			}
			
			for (var fieldName in NODE_DEFINITIONS) {
				var def = NODE_DEFINITIONS[fieldName];
				
				aboutThisNode.push(Y.merge(def, {value:nodeData[fieldName]}));
			}
			
			topLevelBlocks.push(
				{title:aboutThisText, value:this._renderFieldList({items:aboutThisNode, className:"ss-field-list"})}
			);

			var 
				pageDesign = false,
				pageDesignID = false;
			
			if (node.initData) {
				pageDesignID = node.initData.pageDesignId || node.initData.sitePageDesignId; 
				
				if (pageDesignID && backup.pageDesigns[pageDesignID]) {
					pageDesign = backup.pageDesigns[pageDesignID];
				}
			}
			
			if (pageDesign && pageDesign.PageDesign) {
				var widgetBlocks = this._renderWidgetBlocks(pageDesign.PageDesign);
				
				for (index in widgetBlocks) {
					topLevelBlocks.push(widgetBlocks[index]);
				}
			} else {
				if (pageDesignID) {
					topLevelBlocks.push({
						title: "Page design and content blocks",
						value: this._renderFieldList({
							items:[{
								title:"Error",
								value: Y.Node.create('<div class="alert alert-danger">The design for this page was not found!</div>')
							}],
							className: "ss-field-list"
						})
					});
				} else {
					topLevelBlocks.push({
						title: "Page design and content blocks", 
						value: this._renderFieldList({
							items:[{
								title:"Design", 
								value: Y.Node.create('<div class="alert alert-info">This page appears to use the default, uncustomised design.</div>')
							}],
							className: "ss-field-list"
						})
					});					
				}
			}
			
			pane.append(this._renderSectionList({items:topLevelBlocks, className: "ss-collapsable-section"}));
		},
				
		
		_onTreeNodeSelect: function(e) {
			var pane = this.get('nodePane');
			
			pane.get('childNodes').remove();

			var node = e.node;
			
			if (node.data) {
				switch (node.data.type) {
					case NODE_TYPE_BACKUP_INFO:
						this._renderBackupInfo(node.data.data, pane);
						break;
					case NODE_TYPE_SMUG_NODE:
						this._renderSmugNode(node.data.data, pane);
						break;
					case NODE_TYPE_SITE_DESIGN:
						this._renderSiteDesign(node.data.data, pane);
						break;
					case NODE_TYPE_SITE_SKIN:
						this._renderSiteSkin(node.data.data, pane);
						break;
					case NODE_TYPE_SITEPAGE_DESIGN:
						this._renderSitePageDesign(node.data.data, pane);
						break;
				}
			}
		},
		
		initializer : function(cfg) {
			this._backupData = this.get("backup").get("backup");
		},

		renderUI : function() {
			var container = this.get("contentBox");
			
			container.get('children').remove();
			
			this.set('structurePane', Y.Node.create("<div class='ss-smugmug-backup-pane ss-smugmug-backup-structure-pane'></div>"));
			this.set('nodePane', Y.Node.create("<div class='ss-smugmug-backup-pane ss-smugmug-backup-node-pane'></div>"));
			
			container.append(this.get('structurePane'));
			container.append(this.get('nodePane'));
			
			var SortedTreeView = Y.Base.create('sortedTreeView', Y.TreeView, [Y.TreeView.Sortable], {
				sortComparator: function (node) {
					return node.label;
				}
			});

			this._treeView = new SortedTreeView({
				container : this.get('structurePane')
			});
			
			this._treeView.on('select', this._onTreeNodeSelect, this);
			this._treeView.render();
		},
		
		syncUI: function() {
			this._rebuildTree();
		}
	}, {
		ATTRS : {	
			structurePane : {
				value: null
			},

			nodePane : {
				value: null
			},

			backup: {
				value: null,
				writeOnce: "initOnly"
			},
		}
	});

	Y.namespace("SherlockPhotography").SmugmugBackupView = SmugmugBackupView;
}, '0.0.1', {
	requires : [ 'base', 'widget', 'gallery-sm-treeview', 'gallery-sm-treeview-sortable', 'escape', 'timers' ]
});