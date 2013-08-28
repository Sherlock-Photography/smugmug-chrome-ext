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
		
		initializer : function(cfg) {
			var SortedTreeView = Y.Base.create('sortedTreeView', Y.TreeView, [Y.TreeView.Sortable], {
				sortComparator: function (node) {
					return node.label;
				}
			});
			
			this._treeView = new SortedTreeView({
				container : this.get('container')
			});
			
			var that = this;
			
			this.after('backupChange', function(e) {
				that._rebuildTree();
			});
		},

		renderUI : function() {
			this._treeView.render();
		},
	}, {
		ATTRS : {
			container : {
				writeOnce: 'initOnly'
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