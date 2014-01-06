YUI.add('ss-smugmug-gallery-list-view', function(Y, NAME) {
	var
		Constants = Y.SherlockPhotography.SmugmugConstants,
		
		GRID_COLUMNS = [
            {
        		key: "GridDisplayName", 
        		label: "Name", 
        		name: "Name",
        		allowHTML: true, 
        		showByDefault: true,
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
	            },
	            
	            formatterCSV: function(cell) {
	            	return cell.record.get('Depth') == 0 ? 'Homepage' : cell.record.get('Path');
	            }
            },
            {
            	key: "Url",
            	label: "Link",
            	showByDefault: false,
            	allowHTML: true,
        		formatter: function(cell) {
        			return '<input type="text" name="" value="' + Y.Escape.html(cell.value) + '" />'; 
        		},
            
        		formatterCSV: function(cell) {
        			return cell.value;
        		}
            },
            {
            	key: "Permalink",
            	name: "Permalink",
            	label: "Permalink",
            	showByDefault: false,
            	allowHTML: true,
        		formatter: function(cell) {
        			return '<input type="text" name="" value="' + Y.Escape.html(cell.value) + '" />'; 
        		},
        		
        		formatterCSV: function(cell) {
        			return cell.value;
        		}
            },
            {
            	key: "RemoteID",
            	label: "AlbumID",
            	showByDefault: false,
            }, 
            {
            	key: "RemoteKey",
            	label: "AlbumKey",
            	showByDefault: false,
            },
            {
        		key: "Description", 
        		label: "Description", 
        		showByDefault: true
        	},
            {
        		key: "Keywords", 
        		label: "Keywords", 
        		showByDefault: false
        	},            
            {
            	key: "PrivacyLevel", 
            	label: "Privacy", 
        		showByDefault: true,
            	formatter: function(cell) {
	            	var result = Constants.PRIVACY_NAMES[cell.value];
	            	
	            	return result ? result : "(unknown)";
	            }
            },
            {
            	key: "PasswordProtected",
            	label: "Passworded",
            	showByDefault: false,
            	formatter: function(cell) {
            		return cell.value ? "Passworded" : "";
	            }
            },
            {
            	key: "ViewPassHint",
            	label: "Password hint",
            	showByDefault: false
            },            
            {
            	key: "HasImages",
            	label: "Empty",
            	showByDefault: false,
            	formatter: function(cell) {
            		return cell.value === false ? "Empty" : "";
	            }
            },            
            {
            	key: "SmugSearchable", 
            	label: "SM searchable", 
            	showByDefault: true,
            	formatter: function(cell) {
            		return Constants.NODE_SMUGMUG_SEARCHABLE_NAMES[cell.value];
            	}
            },
            {
        		key: "WorldSearchable", 
        		label: "Web searchable", 
        		showByDefault: true,
        		formatter: function(cell) {
        			return Constants.NODE_WORLD_SEARCHABLE_NAMES[cell.value];
        		}
            },
            {
        		key: "DateAdded", 
        		label: "Date created",
        		showByDefault: false,
        		formatter: function(cell) {
        			return Y.Date.format(new Date(cell.value * 1000), {format:"%Y-%m-%d"});	
        		}
        	},            
            {
        		key: "DateModified", 
        		label: "Last modified",
        		showByDefault: true,
        		formatter: function(cell) {
        			return Y.Date.format(new Date(cell.value * 1000), {format:"%Y-%m-%d"});	
        		}
        	}
        ];
	
	// Ensure each grid column has a sensible name defined (derived like DataTable does) for unique names in HTML
	for (var index in GRID_COLUMNS) {
		if (!GRID_COLUMNS[index].name) {
			GRID_COLUMNS[index].name = GRID_COLUMNS[index].key;
		}
	}
	
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
		
		_filterOptionsContainer: null,
		_columnOptionsContainer: null,

		_filters: {},
		_filterGroups: ["PrivacyLevel", "Type"],
		
		_data: null,
		_columns: false,

		CONTENT_TEMPLATE : null,
		
		/**
		 * Recursively add rows to the grid from the tree of nodes rooted at treeRoot 
		 */
		_recursiveBuildGrid: function(grid, treeRoot, orphaned) {
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
						
			if (include) {
				/* If we're an orphan, our display name has to show the complete path from the root so people know what this node is */
				treeRoot.nodeData.Orphaned = orphaned;
				if (orphaned) {
					treeRoot.nodeData.GridDisplayName = treeRoot.nodeData.Path;  
				} else {
					treeRoot.nodeData.GridDisplayName = treeRoot.nodeData.Name;
				}
				
				grid.push(treeRoot.nodeData);
			} else {
				//We don't consider a missing homepage to create orphans under it (because we change the homepage's children into siblings)
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
						
			for (var index in children) {
				this._recursiveBuildGrid(grid, children[index], orphaned);
			}
			
			return grid;
		},
		
		initializer : function(cfg) {
			this._nodeTree = this.get("galleryList").get("nodeTree");
			
			this._loadFilterOptions();
			this._loadColumnOptions();
			
			if (!this._columns) {
				this._loadColumnDefaults();
			}
		},
		
		_invalidateDataModel: function() {
			this._data = null;
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
					li = Y.Node.create('<li><label><input type="checkbox" name="' + Y.Escape.html(name) + '" value="' + Y.Escape.html(option.value) + '" ' + (option.checked ? 'checked' : '') + '/>&nbsp;' 
						+ Y.Escape.html(option.label) + '</label></li>');
					
				ul.append(li);
			}
			
			wrapper.append(ul);
			
			return wrapper;
		},
		
		_renderFilterOptions: function(controls) {
			var container = Y.Node.create('<div class="ss-smugmug-gallery-list-filters"></div>');
			
			container.append("<h2>Pages to include</h2>");
			
			container.append(this._renderFilterGroup("PrivacyLevel", "Privacy", [
				{value: Constants.Privacy.PUBLIC, label: Constants.PRIVACY_NAMES[Constants.Privacy.PUBLIC], checked: true},
				{value: Constants.Privacy.UNLISTED, label: Constants.PRIVACY_NAMES[Constants.Privacy.UNLISTED], checked: true},
				{value: Constants.Privacy.PRIVATE, label: Constants.PRIVACY_NAMES[Constants.Privacy.PRIVATE], checked: true}
			]));

			container.append(this._renderFilterGroup("Type", "Page type", [
  				{value: Constants.NodeType.ROOT, label: Constants.NODE_TYPE_NAMES[Constants.NodeType.ROOT], checked: true},
				{value: Constants.NodeType.FOLDER, label: Constants.NODE_TYPE_NAMES[Constants.NodeType.FOLDER], checked: true},
				{value: Constants.NodeType.GALLERY, label: Constants.NODE_TYPE_NAMES[Constants.NodeType.GALLERY], checked: true},
				{value: Constants.NodeType.PAGE, label: Constants.NODE_TYPE_NAMES[Constants.NodeType.PAGE], checked: true},
			]));
			
			return container;
		},
		
		_getFilterOptionsFromUI: function() {
			var that = this;
			
			for (var index in this._filterGroups) {
				var 
					filterGroup = this._filterGroups[index],
					options = this._filterOptionsContainer.all("input[name='" + filterGroup + "']:checked");
			
				this._filters[filterGroup] = {};
			
				options.each(function() {
					that._filters[filterGroup][this.get('value')] = true;
				});
			}
			
			//If there was an unload-moment for this control, this would be better placed there!
			this._saveFilterOptions();
			this._invalidateDataModel();
			this.syncUI();
		},
		
		_putFilterOptionsToUI: function() {			
			for (var index in this._filterGroups) {
				var 
					filterGroup = this._filterGroups[index],
					options = this._filterOptionsContainer.all("input[name='" + filterGroup + "']");
				
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

		_renderColumnOptions: function(controls) {
			var container = Y.Node.create('<div class="ss-smugmug-gallery-list-columns"></div>');
			
			container.append("<h2>Columns to include</h2>");
			
			var ul = Y.Node.create('<ul class="list-unstyled"></ul>');
			
			for (var index in GRID_COLUMNS) {
				var 
					column = GRID_COLUMNS[index],
					
					li = Y.Node.create('<li><label><input type="checkbox" name="column" value="' + Y.Escape.html(column.name) + '" ' + (column.showByDefault ? 'checked' : '') + ' />&nbsp;' 
						+ Y.Escape.html(column.label) + '</label></li>');
				
				ul.append(li);
			}
			
			container.append(ul);
			
			return container;
		},
		
		_getColumnOptionsFromUI: function() {
			var 
				that = this,
				options = this._columnOptionsContainer.all("input:checked");
		
			this._columns = {};
		
			options.each(function() {
				that._columns[this.get('value')] = true;
			});
			
			//If there was an unload-moment for this control, this would be better placed there!
			this._saveColumnOptions();
			this.syncUI();
		},
		
		_putColumnOptionsToUI: function() {			
			var 
				options = this._columnOptionsContainer.all("input");
				
			options.set('checked', false);

			for (var columnName in this._columns) {
				options.filter("[value='" + columnName + "']").set('checked', true);
			}
		},		
		
		_saveColumnOptions: function() {
			window.localStorage["galleryList.columns"] = Y.JSON.stringify(this._columns);
		},

		_loadColumnOptions: function() {
			try {
				this._columns = Y.JSON.parse(window.localStorage["galleryList.columns"]);
			} catch (e) {
				this._columns = false;
			}
		},	
		
		/**
		 * Apply the user column filters to GRID_COLUMNS and return an array of those that match.
		 */
		_getSelectedColumnDefinitions: function() {
			var result = [];
			
			for (var index in GRID_COLUMNS) {
				var column = GRID_COLUMNS[index];
				
				if (this._columns[column.name]) {
					result.push(column);
				}
			}
			
			return result;
		},
		
		/**
		 * Load the default column filters.
		 */
		_loadColumnDefaults: function() {
			this._columns = {};
			
			for (var columnName in GRID_COLUMNS) {
				var 
					column = GRID_COLUMNS[columnName];
				
				if (column.showByDefault) {
					this._columns[column.name] = true;
				}
			}
		},

		renderUI : function() {
			var container = this.get("contentBox");
			
			container.get('children').remove();
			
			var controlsContainer = Y.Node.create("<div class='ss-smugmug-gallery-list-controls'></div>");
			
			this._filterOptionsContainer = this._renderFilterOptions(controlsContainer);
			this._columnOptionsContainer = this._renderColumnOptions(controlsContainer);
						
			controlsContainer.append(this._filterOptionsContainer);
			controlsContainer.append(this._columnOptionsContainer);
			
			container.append(controlsContainer);
			
			this.set('gridContainer', Y.Node.create("<div class='ss-smugmug-gallery-list-grid'></div>"));
			container.append(this.get('gridContainer'));

			this._putFilterOptionsToUI();
			this._putColumnOptionsToUI();
		},
		
		bindUI: function() {
			this._filterOptionsContainer.on({change: Y.bind(this._getFilterOptionsFromUI, this)});
			this._columnOptionsContainer.on({change: Y.bind(this._getColumnOptionsFromUI, this)});
		},
		
		syncUI: function() {
			var 
				selectedColumns = this._getSelectedColumnDefinitions();
			
			//Avoid rebuilding _data if it hasn't been invalidated by changing row filters
			if (this._data == null) {
				if (selectedColumns.length == 0) {
					this._data = [];
				} else {
					this._data = new Y.ModelList({items: this._recursiveBuildGrid([], this._nodeTree, "", false)});
				}
			}
			
			if (this._grid) {
				this._grid.destroy();
			}
			
			this._grid = new Y.DataTable({
				columns: selectedColumns,
				data: this._data
			});
						
			this._grid.render(this.get('gridContainer'));
			
			if (this._data.length == 0) {
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
			
			selectedNodes: {
				getter: function() {
					return this._data;
				}				
			},
			
			selectedColumns: {
				getter: '_getSelectedColumnDefinitions'
			}
		}
	});
	
	Y.namespace("SherlockPhotography").SmugmugGalleryListView = SmugmugGalleryListView;
}, '0.0.1', {
	requires : [ 'base', 'widget', 'escape', 'timers', 'datatable', 'datatable-sort', 'ss-smugmug-constants', 'datatype-date-format', 'json-stringify', 'json-parse', 'model-list' ]
});