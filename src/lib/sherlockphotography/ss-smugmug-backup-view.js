YUI.add('ss-smugmug-backup-view', function(Y, NAME) {
	var 
		NODE_TYPE_NONE = 0,
		NODE_TYPE_BACKUP_INFO = 1,
		NODE_TYPE_SMUG_NODE = 2;
	
	var 
		SMUGMUG_NODE_TYPE_ROOT = 1,
		SMUGMUG_NODE_TYPE_FOLDER = 2,
		SMUGMUG_NODE_TYPE_PAGE = 64;
	
	var
		WIDGET_CONFIG_DEFINITION = {
			"HTML" : { //HTML & CSS / HTML block
				fields: {
				     WrapCSS: {show: false},
				     WrapHTML: {show: false},
				     HTML: {type: "code:html"},
				     CSS: {type: "code:css"}
				}
			}	
		};
	
	function isNumber(n) {
		return !isNaN(parseFloat(n)) && isFinite(n);	
	}
	
	var SmugmugBackupView = Y.Base.create(NAME, Y.Widget, [], {
		_treeView : null,

		/**
		 * Recursively build up the folders tree from the SmugMug node tree.
		 * 
		 * @param smugNode
		 * @param treeNode
		 */
		_recurseBuildFolders: function(tree, smugNode, parentTreeNode) {
			var treeNode = parentTreeNode.append({
				label: smugNode.nodeData.Name + (smugNode.initData.pageDesignId ? "<span class='customised'>Customised</span>" : ""),
				state: {open: true},
				data: {
					type: NODE_TYPE_SMUG_NODE,
					data: smugNode,
				}
			});
						
			for (var index in smugNode.children) {
				var smugChild = smugNode.children[index];
				
				this._recurseBuildFolders(tree, smugChild, treeNode);
				
				treeNode.sort({sortComparator:function(node) {
					return node.label;
				}});
			}
			
			return treeNode;
		},
		
		_rebuildTree: function() {
			var 
				backup = this.get('backup'),
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

			var foldersRoot = this._recurseBuildFolders(tree, backup.nodeTree, root);
			
			foldersRoot.label = 'Galleries/pages';
		},
		
		_renderCodeMirror: function(target, code, mode) {
			var cm = CodeMirror(target.getDOMNode(), {
				value: code,
				mode: mode,
				readOnly: true,
				theme: 'ambiance'
			});
			
			Y.soon(function() {
				cm.refresh();
			});
			
			return cm;
		},
		
		/**
		 * Options is either an array of field items or an object:
		 * 
		 * className - Class to apply to <dl> (optional)
		 * items - Array of items, which are objects:
		 * 		title - String, required 
		 * 		value - String or Y.Node
		 * 		supportCopy - Boolean. True if the UI should afford copying the value
		 * 		type - Describes the type of the value. One of line, lines, url, yesno. Default is line if not provided
		 *		className - Optional, added to <dt> and <dd>
		 */
		_renderFieldList: function(options) {
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
					dt = Y.Node.create("<dt>" + item.title + "</dt>"),
					dd = Y.Node.create("<dd></dd>"); 

				if (item.className) {
					dt.addClass(item.className);
					dd.addClass(item.className);
				}
				
				dl.append(dt);
				
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
							valueRendered = '<textarea>' + Y.Escape.html(item.value) + '</textarea>';
						} else {
							valueRendered = Y.Escape.html(item.value);
						}
						break;
					case 'code:html':
					case 'code:css':
							this._renderCodeMirror(dd, item.value, item.type == 'code:html' ? 'text/html' : 'text/css');
							valueRendered = false;
						break;
					default:
						if (item.value instanceof Y.Node) {
							dd.append(item.value);
						} else {
							if (item.supportCopy) {
								valueRendered = '<input type="text" value="' + Y.Escape.html(item.value) + '">';
							} else {
								valueRendered = Y.Escape.html(item.value);
							}
						}
				}
				
				if (valueRendered !== false) {
					dd.setHTML(valueRendered);
				}
								
				dl.append(dd);
			}
			
			return dl;
		},
		
		_renderBackupInfo: function(backup, pane) {
			var items = [];
			
			items.push(
				{title:"SmugMug nickname", value:backup.nickname},
				{title:"Backup creation date", value:backup.date}
			);
			
			pane.append(this._renderFieldList({items:items, className:"ss-field-list"}));
		},
		
		_renderWidgetBlocks: function(style) {
			var result = [];
			
			for (var mapIndex in style.PageDesign.WidgetMap) {
				var widget = style.PageDesign.WidgetMap[mapIndex];
				
				var fields = [];

				if (widget.Config) {
					var configDef = WIDGET_CONFIG_DEFINITION[widget.Name] || {fields: {}}; 
					
					for (var fieldName in widget.Config) {
						var 
							fieldValue = widget.Config[fieldName],
							fieldInfo = configDef.fields[fieldName] || {},
							fieldType = "";
						
						if (fieldInfo.show !== undefined && !fieldInfo.show)
							continue;
						
						if (fieldInfo.type) {
							fieldType = fieldInfo.type;
						} else {
							if (fieldValue === "") {
								continue;
							} else if (fieldValue === true || fieldValue === false) {
								fieldType = "yesno";
							} else if (isNumber(fieldValue)) {
								fieldType = "line";								
							} else if (fieldValue instanceof String && fieldValue != "") {
								if (fieldValue.indexOf("\n") > -1)
									fieldType = "lines";
								else
									fieldType = "line";
							} else {
								// Don't bother displaying arrays or other weird values
								continue;
							}
						}
						
						fields.push({title: fieldName, value: fieldValue, type: fieldType});
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
				backup = this.get('backup'),
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
				case SMUGMUG_NODE_TYPE_PAGE:
					nodeType = "Page";
					aboutThisText = "About this page";
					break;
				default:
					nodeType = "Node (" +nodeData.Type + ")";
					aboutThisText = "About this node (" + nodeData.Type + ")";
			}

			var topLevelBlocks = [];
			
			var aboutThisNode = [];

			if (nodeData.Type != SMUGMUG_NODE_TYPE_ROOT) {
				aboutThisNode.push(
					{title: nodeType + " name", supportCopy:true, value:nodeData.Name}
				);
			}
			
			aboutThisNode.push(
				{title:"URL", value:nodeData.Url, type:'url'},
				{title:"Description", value:nodeData.Description, supportCopy:true, type:'lines'},
				{title:"Last modified", value:nodeData.DateModifiedDisplay, type:'line'}
			);
			
			topLevelBlocks.push(
				{title:aboutThisText, value:this._renderFieldList({items:aboutThisNode, className:"ss-field-list"})}
			);
			
			var pageDesignID = node.initData.pageDesignId || node.initData.sitePageDesignId; 
			
			if (pageDesignID && backup.pageDesigns[pageDesignID]) {
				var widgetBlocks = this._renderWidgetBlocks(backup.pageDesigns[pageDesignID]);
				
				for (index in widgetBlocks) {
					topLevelBlocks.push(widgetBlocks[index]);
				}
			}
			
			pane.append(this._renderFieldList({items:topLevelBlocks, className: "ss-collapsable-section"}));
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
				}
			}
		},
		
		initializer : function(cfg) {
		},

		renderUI : function() {
			var container = Y.one(this.get('container'));
			
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
			
			this.after('backupChange', this._rebuildTree, this);

			this._treeView.render();
		},
	}, {
		ATTRS : {
			container : {
				writeOnce: 'initOnly'
			},
			
			structurePane : {
				value: null
			},

			nodePane : {
				value: null
			},

			backup: {
				value: null
			}
		}
	});

	Y.namespace("SherlockPhotography").SmugmugBackupView = SmugmugBackupView;
}, '0.0.1', {
	requires : [ 'base', 'widget', 'gallery-sm-treeview', 'gallery-sm-treeview-sortable', 'escape', 'timers' ]
});