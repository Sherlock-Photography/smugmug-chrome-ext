YUI.add('ss-smugmug-gallery-list-view', function(Y, NAME) {
	var
		Constants = Y.SherlockPhotography.SmugmugConstants;
	
	var
		GRID_COLUMNS = [
            {
        		key: "GridDisplayName", 
        		label: "Name", 
        		name: "Name",
        		allowHTML: true, 
        		formatter: function(cell) {
	            	var 
	            		depth = cell.record.get('Depth') * 1,
	            		name;
	            	
	            	if (depth == 0) {
	            		name = 'Homepage';
	            	} else {
	            		name = cell.value;
	            		
	            		/*Put children of the homepage as siblings of the homepage (since that's pretty much the user model and looks tidier) */
	            		depth--; 
	            	}
	            	
	            	if (cell.record.get('Orphaned')) {
	            		depth = 0;
	            	}
	            	
	            	var className = "ss-tree-node-icon";
	            	
	            	switch (cell.record.get('Type')) {
	            		case Constants.NodeType.FOLDER:
	            		case Constants.NodeType.HOMEPAGE:
	            			className += ' ss-tree-node-can-have-children';
	            		break;

	            		case Constants.NodeType.GALLERY:
	            			className += ' ss-tree-node-gallery';
        				break;
        				
	            		default:
	            			
	            	}
	            	
	            	return '<a class="node-depth-' + depth + '" target="_blank" href="' + Y.Escape.html(cell.record.get('Url')) + '">' + 
	            		'<span class="' + className + '"></span>&nbsp;' + Y.Escape.html(name) + '</a>';
	            }
            },
            {
        		key: "Description", 
        		label: "Description"
        	},
            {
            	key: "PrivacyLevel", 
            	label: "Privacy", 
            	formatter: function(cell) {
	            	var result = Constants.PRIVACY_NAMES[cell.value];
	            	
	            	if (result)
	            		return result;
	            	
	            	return "(unknown)";
	            }
            },
            {
            	key: "SmugSearchable", 
            	label:" SM searchable", 
            	formatter: function(cell) {
            		return Constants.NODE_SMUGMUG_SEARCHABLE_NAMES[cell.value];
            	}
            },
            {
        		key: "WorldSearchable", 
        		label: "Web searchable", 
        		formatter: function(cell) {
        			return Constants.NODE_WORLD_SEARCHABLE_NAMES[cell.value];
        		}
            },
            {
        		key: "DateModified", 
        		label: "Last modified",
        		formatter: function(cell) {
        			return Y.Date.format(new Date(cell.value * 1000), {format:"%Y-%m-%d"});	
        		}
        	}
        ];
	
	function createNodeSortKey(node) {
		var key;
		
		switch (node.nodeData.Type) {
			case Constants.NodeType.ROOT:
			case Constants.NodeType.FOLDER:
				key = "0";
				break;
			case Constants.NodeType.GALLERY:
			case Constants.NodeType.PAGE:
				key = "1";
				break;
			default:
				//e.g. system pages
				key = "2";
		}
		
		return key + "-" + node.nodeData.Name;
	}
	
	var SmugmugGalleryListView = Y.Base.create(NAME, Y.Widget, [], {
		_grid : null,
		_nodeTree : null,
		
		_controls: null,

		_filters: {},
		_filterGroups: ["PrivacyLevel", "Type"],

		CONTENT_TEMPLATE : null,
		
		/**
		 * Recursively add rows to the grid from the tree of nodes rooted at treeRoot 
		 */
		_recursiveBuildGrid: function(grid, treeRoot, path, orphaned) {
			if (!treeRoot)
				return; //Empty root

			//console.log(treeRoot);
			
			//Check this node against filters before adding to grid
			var include = true;
		
			for (var filterField in this._filters) {
				if (!this._filters[filterField][treeRoot.nodeData[filterField]]) {
					include = false;
					break;
				}
			}
			
			path += treeRoot.nodeData.Name;
			
			if (include) {
				/* If we're an orphan, our display name has to show the complete path from the root so people know what this node is */
				treeRoot.nodeData.Orphaned = orphaned;
				if (orphaned) {
					treeRoot.nodeData.GridDisplayName = path;  
				} else {
					treeRoot.nodeData.GridDisplayName = treeRoot.nodeData.Name;
				}
				
				grid.push(treeRoot.nodeData);
			} else {
				//We don't consider a missing homepage to create orphans under it
				if (treeRoot.nodeData.Depth > 0) {
					orphaned = true;
				}
			}
			
			var children = [];
			
			for (var index in treeRoot.children) {
				children.push(treeRoot.children[index]);
			}
			
			//Sort tree children folders first, then alphabetically
			children.sort(function(a,b) {
				var aKey = createNodeSortKey(a), bKey = createNodeSortKey(b);
				
				if (aKey > bKey)
					return 1;
				if (aKey < bKey)
					return -1;
				
				return 0;
			});
			
			if (treeRoot.nodeData.Depth > 0) {
				path += "/";
			}
			
			for (var index in children) {
				this._recursiveBuildGrid(grid, children[index], path, orphaned);
			}
			
			return grid;
		},
		
		initializer : function(cfg) {
			this._nodeTree = this.get("galleryList").get("nodeTree");
			
			this._loadFilterOptions();
		},

		/**
		 * Render a group of filter checkboxes
		 * 
		 * @param name Group name to use in form element names
		 * @param label Group label to display to user 
		 * @param options
		 * @returns
		 */
		_renderFilterGroup: function(name, label, options) {
			var wrapper = Y.Node.create('<div class="ss-smugmug-gallery-list-filter-group"></div>');
			
			wrapper.append("<h3>" + Y.Escape.html(label) + "</h3>");

			var ul = Y.Node.create('<ul class="list-unstyled"></ul>');
			
			for (var index in options) {
				var 
					option = options[index],
					li = Y.Node.create("<li></li>"),
					checkbox = Y.Node.create('<input type="checkbox" name="' + Y.Escape.html(name) + '" value="' + Y.Escape.html(option.value) + '" ' + (option.checked ? 'checked' : '') + '/>'),
					labelElem = Y.Node.create("<label></label>");
								
				labelElem.append(checkbox);
								
				labelElem.append("&nbsp;" + Y.Escape.html(option.label));
				
				li.append(labelElem);
				ul.append(li);
			}
			
			wrapper.append(ul);
			
			return wrapper;
		},
		
		_renderFilterOptions: function(controls) {
			controls.append("<h2>Pages to include</h2>");
			
			controls.append(this._renderFilterGroup("PrivacyLevel", "Privacy", [
				{value: Constants.Privacy.PUBLIC, label: Constants.PRIVACY_NAMES[Constants.Privacy.PUBLIC], checked: true},
				{value: Constants.Privacy.UNLISTED, label: Constants.PRIVACY_NAMES[Constants.Privacy.UNLISTED], checked: true},
				{value: Constants.Privacy.PRIVATE, label: Constants.PRIVACY_NAMES[Constants.Privacy.PRIVATE], checked: true}
			]));

			controls.append(this._renderFilterGroup("Type", "Page type", [
  				{value: Constants.NodeType.ROOT, label: Constants.NODE_TYPE_NAMES[Constants.NodeType.ROOT], checked: true},
				{value: Constants.NodeType.FOLDER, label: Constants.NODE_TYPE_NAMES[Constants.NodeType.FOLDER], checked: true},
				{value: Constants.NodeType.GALLERY, label: Constants.NODE_TYPE_NAMES[Constants.NodeType.GALLERY], checked: true},
				{value: Constants.NodeType.PAGE, label: Constants.NODE_TYPE_NAMES[Constants.NodeType.PAGE], checked: true},
			]));
		},
		
		_getFilterOptionsFromUI: function() {
			var that = this;
			
			for (var index in this._filterGroups) {
				var 
					filterGroup = this._filterGroups[index],
					options = this._controls.all("input[name='" + filterGroup + "']:checked");
			
				this._filters[filterGroup] = {};
			
				options.each(function() {
					that._filters[filterGroup][this.get('value')] = true;
				});
			}
			
			//If there was an unload-moment for this control, this would be better placed there!
			this._saveFilterOptions();
			this.syncUI();
		},
		
		_putFilterOptionsToUI: function() {			
			for (var index in this._filterGroups) {
				var 
					filterGroup = this._filterGroups[index],
					options = this._controls.all("input[name='" + filterGroup + "']");
				
				//If we've customised anything in this filter group, just tick those that we selected
				if (this._filters[filterGroup]) {
					options.set('checked', false);
					
					for (var value in this._filters[filterGroup]) {
						options.filter("[value='" + value + "']").set('checked', true);
					}
				} else {
					//Otherwise the whole group should start off ticked
					options.set('checked', true);
				}
			}
		},		
		
		_saveFilterOptions: function() {
			window.localStorage["galleryList.filters"] = Y.JSON.stringify(this._filters);
		},

		_loadFilterOptions: function() {
			try {
				this._filters = Y.JSON.parse(window.localStorage["galleryList.filters"]);
			} catch (e) {
				//Swallowed whole!
			}
		},

		renderUI : function() {
			var container = this.get("contentBox");
			
			container.get('children').remove();
			
			this._controls = Y.Node.create("<div class='ss-smugmug-gallery-list-controls'></div>");
			
			this._renderFilterOptions(this._controls);
						
			container.append(this._controls);
			
			this.set('gridContainer', Y.Node.create("<div class='ss-smugmug-gallery-list-grid'></div>"));
			container.append(this.get('gridContainer'));

			this._putFilterOptionsToUI();
		},
		
		bindUI: function() {
			//Filter checkboxes
			this._controls.all("input").on({change: Y.bind(this._getFilterOptionsFromUI, this)});
		},
		
		syncUI: function() {
			var data = this._recursiveBuildGrid([], this._nodeTree, "", false);
			
			if (this._grid) {
				this._grid.destroy();
			}
			
			this._grid = new Y.DataTable({
				columns: GRID_COLUMNS,
				data: data
			});
						
			this._grid.render(this.get('gridContainer'));
			
			if (data.length == 0) {
				this._grid.showMessage('No pages matched your filters.');
			}
		}
	}, {
		ATTRS : {	
			gridContainer: {
				value: null
			},
			
			galleryList: {
				value: null,
				writeOnce: "initOnly"
			},
		}
	});

	Y.namespace("SherlockPhotography").SmugmugGalleryListView = SmugmugGalleryListView;
}, '0.0.1', {
	requires : [ 'base', 'widget', 'escape', 'timers', 'datatable', 'datatable-sort', 'ss-smugmug-constants', 'datatype-date-format', 'json-stringify', 'json-parse' ]
});