YUI.add('ss-smugmug-backup-view', function(Y, NAME) {
	var 
		NODE_TYPE_NONE = 0,
		NODE_TYPE_BACKUP_INFO = 1,
		NODE_TYPE_SMUG_NODE = 2;
	
	var SmugmugBackupView = Y.Base.create(NAME, Y.Widget, [], {
		_treeView : null,

		/**
		 * Recursively build up the folders tree from the SmugMug node tree.
		 * 
		 * @param smugNode
		 * @param treeNode
		 */
		_recurseBuildFolders: function(smugNode, parentTreeNode) {
			var treeNode = parentTreeNode.append({
				label: smugNode.nodeData.Name,
				state: {open: true},
				data: {
					type: NODE_TYPE_SMUG_NODE,
					data: smugNode,
				}
			});
			
			for (var index in smugNode.children) {
				var smugChild = smugNode.children[index];
				
				this._recurseBuildFolders(smugChild, treeNode);
				
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

			//TODO clear the tree
			
			if (!backup)
				return;
			
			root.append({
				label: "About this backup",
				data: {
					type: NODE_TYPE_BACKUP_INFO,
					data: backup.backup
				}
			});

			var foldersRoot = this._recurseBuildFolders(backup.nodeTree, root);
			
			foldersRoot.label = 'Pages';
		},
		
		_renderBackupInfo: function(backup, pane) {
			pane.append("<dl><dt>I'm a list!</dt><dd>Of fields and other good stuff!</dd></dl>");
		},
		
		_onTreeNodeSelect: function(node) {
			var pane = this.get('nodePane');
			
			if (node.data) {
				switch (node.data.type) {
					case NODE_TYPE_BACKUP_INFO:
						this._renderBackupInfo(node.data, pane);
						break;
					case NODE_TYPE_SMUG_NODE:
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
	requires : [ 'base', 'widget', 'gallery-sm-treeview', 'gallery-sm-treeview-sortable', 'escape' ]
});